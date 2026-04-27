import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BuildingData } from './overpass';
import type { Place } from '@/types';

// ── Tile helpers ──

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function lonLatToTile(lon: number, lat: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function tileToLonLat(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lon, lat };
}

// ── Scene ──

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export class MapScene3D {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private buildings: THREE.Mesh[] = [];
  private tileGroup: THREE.Group | null = null;
  private placeMarkers: THREE.Group[] = [];
  private gpsMarker: THREE.Group | null = null;
  private running = false;

  private centerMercX = 0;
  private centerMercY = 0;
  private center = { lat: 37.5665, lon: 126.978 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8d4e8);
    this.scene.fog = new THREE.Fog(0xb8d4e8, 3000, 8000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 1, 50000);
    this.camera.position.set(0, 600, 800);
    this.camera.lookAt(0, 0, 0);

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minPolarAngle = 0.1;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 4000;

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(400, 800, 300);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const d = 2000;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    this.scene.add(new THREE.DirectionalLight(0x8ecae6, 0.3).translateX(-300).translateY(200).translateZ(-200));
    this.scene.add(new THREE.HemisphereLight(0xb8d4e8, 0x444444, 0.4));

    this.animate = this.animate.bind(this);
  }

  // ── Mercator ──

  private latLonToMercator(lat: number, lon: number) {
    const R = 6378137;
    const x = R * (lon * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const y = R * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    return { x, y };
  }

  private latLonToLocal(lat: number, lon: number) {
    const merc = this.latLonToMercator(lat, lon);
    return {
      x: merc.x - this.centerMercX,
      z: -(merc.y - this.centerMercY),
    };
  }

  private setCenter(lat: number, lon: number) {
    this.center = { lat, lon };
    const merc = this.latLonToMercator(lat, lon);
    this.centerMercX = merc.x;
    this.centerMercY = merc.y;
  }

  // ── Ground tiles ──

  async loadGround(bounds: Bounds, zoom: number) {
    if (this.tileGroup) {
      this.tileGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      this.scene.remove(this.tileGroup);
    }

    const group = new THREE.Group();
    const tlTile = lonLatToTile(bounds.west, bounds.north, zoom);
    const brTile = lonLatToTile(bounds.east, bounds.south, zoom);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    const promises: Promise<void>[] = [];

    for (let tx = tlTile.x - 1; tx <= brTile.x + 1; tx++) {
      for (let ty = tlTile.y - 1; ty <= brTile.y + 1; ty++) {
        const url = TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(tx)).replace('{y}', String(ty));
        const nw = tileToLonLat(tx, ty, zoom);
        const se = tileToLonLat(tx + 1, ty + 1, zoom);
        const tl = this.latLonToLocal(nw.lat, nw.lon);
        const br = this.latLonToLocal(se.lat, se.lon);

        const p = new Promise<void>((resolve) => {
          loader.load(url, (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
              tl.x, 0, tl.z, br.x, 0, tl.z, tl.x, 0, br.z, br.x, 0, br.z,
            ]), 3));
            geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
              0, 1, 1, 1, 0, 0, 1, 0,
            ]), 2));
            geo.setIndex([0, 2, 1, 1, 2, 3]);
            geo.computeVertexNormals();

            const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
            group.add(new THREE.Mesh(geo, mat));
            resolve();
          }, undefined, () => resolve());
        });
        promises.push(p);
      }
    }

    await Promise.all(promises);
    group.position.y = -0.1;
    this.scene.add(group);
    this.tileGroup = group;
  }

  // ── Buildings ──

  loadBuildings(buildings: BuildingData[], center: { lat: number; lon: number }) {
    this.clearBuildings();
    this.setCenter(center.lat, center.lon);

    const getColor = (h: number) => {
      if (h > 60) return 0x1a3a5c;
      if (h > 30) return 0x2d5a8e;
      if (h > 15) return 0x4a8cc7;
      if (h > 8) return 0x6baed6;
      return 0x9ecae1;
    };

    for (const b of buildings) {
      try {
        const shape = new THREE.Shape();
        const pts = b.coords.map(([lat, lon]) => this.latLonToLocal(lat, lon));
        shape.moveTo(pts[0].x, -pts[0].z);
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, -pts[i].z);
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);

        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
          color: getColor(b.height),
          transparent: true,
          opacity: 0.92,
          shininess: 30,
        }));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.scale.y = 0.01;
        mesh.userData.targetScaleY = 1;

        // Edge lines
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo, 30),
          new THREE.LineBasicMaterial({ color: b.height > 30 ? 0x0f2744 : 0x2a4a6b, transparent: true, opacity: 0.3 }),
        );
        mesh.add(edges);

        this.scene.add(mesh);
        this.buildings.push(mesh);
      } catch { /* skip invalid */ }
    }

    this.animateBuildings();
  }

  private animateBuildings() {
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 + 2.7 * Math.pow(progress - 1, 3) + 1.7 * Math.pow(progress - 1, 2);
      for (const m of this.buildings) m.scale.y = ease * m.userData.targetScaleY;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private clearBuildings() {
    for (const m of this.buildings) {
      m.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
        const mat = (c as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      this.scene.remove(m);
    }
    this.buildings = [];
  }

  // ── Place markers (pins in 3D) ──

  setPlaceMarkers(places: Place[], selectedId?: string) {
    // Clear old
    for (const g of this.placeMarkers) {
      g.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
        if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.Material).dispose();
      });
      this.scene.remove(g);
    }
    this.placeMarkers = [];

    const categoryColors: Record<string, number> = {
      tourism: 0x2563eb, shopping: 0xea580c, culture: 0x7c3aed, food: 0xdc2626,
    };

    for (const place of places) {
      const pos = this.latLonToLocal(place.lat, place.lng);
      const group = new THREE.Group();
      const isSelected = place.id === selectedId;

      // Pin sphere
      const radius = isSelected ? 12 : 8;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshPhongMaterial({
          color: categoryColors[place.category] ?? 0x2563eb,
          emissive: categoryColors[place.category] ?? 0x2563eb,
          emissiveIntensity: isSelected ? 0.5 : 0.2,
        }),
      );
      sphere.position.y = 50;
      group.add(sphere);

      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 50, 8),
        new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.5 }),
      );
      pole.position.y = 25;
      group.add(pole);

      // Ground ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(6, 10, 32),
        new THREE.MeshBasicMaterial({
          color: categoryColors[place.category] ?? 0x2563eb,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1;
      group.add(ring);

      group.position.set(pos.x, 0, pos.z);
      this.scene.add(group);
      this.placeMarkers.push(group);
    }
  }

  // ── GPS marker ──

  updateGPSMarker(lat: number, lon: number) {
    const pos = this.latLonToLocal(lat, lon);

    if (!this.gpsMarker) {
      const group = new THREE.Group();

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(8, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0x4285f4, emissive: 0x2255cc, emissiveIntensity: 0.5 }),
      );
      sphere.position.y = 20;
      group.add(sphere);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(12, 18, 32),
        new THREE.MeshBasicMaterial({ color: 0x4285f4, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1;
      group.add(ring);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 40, 8),
        new THREE.MeshBasicMaterial({ color: 0x4285f4, transparent: true, opacity: 0.3 }),
      );
      beam.position.y = 20;
      group.add(beam);

      this.gpsMarker = group;
      this.scene.add(this.gpsMarker);
    }

    this.gpsMarker.position.set(pos.x, 0, pos.z);
  }

  removeGPSMarker() {
    if (this.gpsMarker) {
      this.gpsMarker.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
        if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.Material).dispose();
      });
      this.scene.remove(this.gpsMarker);
      this.gpsMarker = null;
    }
  }

  // ── Lifecycle ──

  resetCamera() {
    this.camera.position.set(0, 600, 800);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  start() {
    this.running = true;
    this.animate();
  }

  stop() {
    this.running = false;
  }

  private animate() {
    if (!this.running) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.stop();
    this.clearBuildings();
    this.removeGPSMarker();
    if (this.tileGroup) {
      this.tileGroup.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).geometry.dispose();
          ((c as THREE.Mesh).material as THREE.Material).dispose();
        }
      });
    }
    this.controls.dispose();
    this.renderer.dispose();
  }
}
