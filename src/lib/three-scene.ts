import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  private renderRequested = false;
  private dampingFrames = 0;

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
    this.controls.addEventListener('change', () => {
      this.dampingFrames = 30; // render extra frames for damping ease-out
      this.requestRender();
    });

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

    this.requestRender = this.requestRender.bind(this);
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
    this.requestRender();
  }

  // ── Buildings ──

  loadBuildings(buildings: BuildingData[], center: { lat: number; lon: number }) {
    this.clearBuildings();
    this.setCenter(center.lat, center.lon);

    if (buildings.length === 0) return;

    const COLOR_BUCKETS: { min: number; color: number }[] = [
      { min: 60, color: 0x1a3a5c },
      { min: 30, color: 0x2d5a8e },
      { min: 15, color: 0x4a8cc7 },
      { min: 8, color: 0x6baed6 },
      { min: 0, color: 0x9ecae1 },
    ];

    const getColorBucket = (h: number) => {
      for (const b of COLOR_BUCKETS) if (h > b.min) return b.color;
      return 0x9ecae1;
    };

    // Group geometries by color for merging
    const buckets = new Map<number, THREE.BufferGeometry[]>();
    for (const bucket of COLOR_BUCKETS) buckets.set(bucket.color, []);

    for (const b of buildings) {
      try {
        const shape = new THREE.Shape();
        const pts = b.coords.map(([lat, lon]) => this.latLonToLocal(lat, lon));
        shape.moveTo(pts[0].x, -pts[0].z);
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, -pts[i].z);
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);

        const color = getColorBucket(b.height);
        buckets.get(color)!.push(geo);
      } catch { /* skip invalid */ }
    }

    // Merge each color bucket into a single mesh
    for (const [color, geos] of buckets) {
      if (geos.length === 0) continue;
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;

      // Dispose individual geometries after merge
      for (const g of geos) g.dispose();

      const mesh = new THREE.Mesh(merged, new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        shininess: 30,
      }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.scale.y = 0.01;
      mesh.userData.targetScaleY = 1;

      this.scene.add(mesh);
      this.buildings.push(mesh);
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
      this.requestRender();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Fade out current buildings, then load new ones with fade in.
   * Keeps center unchanged (navigation uses flyToStop for camera).
   */
  transitionBuildings(buildings: BuildingData[], center: { lat: number; lon: number }) {
    if (this.buildings.length === 0) {
      // No existing buildings — just load directly
      this.loadBuildings(buildings, center);
      return;
    }

    // Fade out existing buildings
    const oldMeshes = [...this.buildings];
    const fadeOutDuration = 300;
    const fadeStart = performance.now();

    const fadeOut = (now: number) => {
      const t = Math.min((now - fadeStart) / fadeOutDuration, 1);
      for (const m of oldMeshes) {
        const mat = m.material as THREE.MeshPhongMaterial;
        mat.opacity = 0.92 * (1 - t);
        m.scale.y = m.userData.targetScaleY * (1 - t * 0.3);
      }
      this.requestRender();
      if (t < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        // Remove old meshes
        for (const m of oldMeshes) {
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

        // Load new buildings with fade in
        this.loadBuildings(buildings, center);
      }
    };

    requestAnimationFrame(fadeOut);
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
      tourism: 0x1f3a8b, shopping: 0xdc2127, culture: 0xf4a12c, food: 0x00853e,
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
    this.requestRender();
  }

  // ── Route polyline ──

  private routeLine: THREE.Line | null = null;
  private routeGlow: THREE.Line | null = null;
  private routePoints: THREE.Vector3[] = [];
  private flyAnimation: { id: number } | null = null;

  renderRoute(stops: { lat: number; lng: number }[]) {
    this.clearRoute();
    if (stops.length < 2) return;

    this.routePoints = stops.map((s) => {
      const pos = this.latLonToLocal(s.lat, s.lng);
      return new THREE.Vector3(pos.x, 3, pos.z);
    });

    // Smooth curve through all stops
    const curve = new THREE.CatmullRomCurve3(this.routePoints, false, 'centripetal', 0.5);
    const curvePoints = curve.getPoints(stops.length * 40);

    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);

    // Main route line
    this.routeLine = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 }),
    );
    this.scene.add(this.routeLine);

    // Glow line underneath
    const glowGeo = new THREE.BufferGeometry().setFromPoints(
      curvePoints.map((p) => new THREE.Vector3(p.x, 1.5, p.z)),
    );
    this.routeGlow = new THREE.Line(
      glowGeo,
      new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 1, transparent: true, opacity: 0.4 }),
    );
    this.scene.add(this.routeGlow);
    this.requestRender();
  }

  clearRoute() {
    if (this.routeLine) {
      this.routeLine.geometry.dispose();
      (this.routeLine.material as THREE.Material).dispose();
      this.scene.remove(this.routeLine);
      this.routeLine = null;
    }
    if (this.routeGlow) {
      this.routeGlow.geometry.dispose();
      (this.routeGlow.material as THREE.Material).dispose();
      this.scene.remove(this.routeGlow);
      this.routeGlow = null;
    }
    this.routePoints = [];
    this.cancelFly();
    this.requestRender();
  }

  /**
   * Animate camera to look at a specific stop from a 45-degree angle
   */
  flyToStop(stopIndex: number, stops: { lat: number; lng: number }[]) {
    this.cancelFly();
    if (stopIndex < 0 || stopIndex >= stops.length) return;

    const target = this.latLonToLocal(stops[stopIndex].lat, stops[stopIndex].lng);
    const targetVec = new THREE.Vector3(target.x, 0, target.z);

    // Camera offset: behind and above the target, facing forward
    const nextIdx = Math.min(stopIndex + 1, stops.length - 1);
    const next = this.latLonToLocal(stops[nextIdx].lat, stops[nextIdx].lng);
    const dir = new THREE.Vector3(next.x - target.x, 0, next.z - target.z);

    // If same point (last stop), use previous direction
    if (dir.lengthSq() < 0.01 && stopIndex > 0) {
      const prev = this.latLonToLocal(stops[stopIndex - 1].lat, stops[stopIndex - 1].lng);
      dir.set(target.x - prev.x, 0, target.z - prev.z);
    }
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();

    // Position camera behind and above
    const camPos = new THREE.Vector3(
      targetVec.x - dir.x * 300,
      250,
      targetVec.z - dir.z * 300,
    );

    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // Ease in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, camPos, ease);
      this.controls.target.lerpVectors(startTarget, targetVec, ease);
      this.controls.update();
      this.requestRender();

      if (t < 1) {
        this.flyAnimation = { id: requestAnimationFrame(tick) };
      } else {
        this.flyAnimation = null;
      }
    };

    this.flyAnimation = { id: requestAnimationFrame(tick) };
  }

  /**
   * Auto-play: fly through all stops sequentially
   */
  flyAlongRoute(
    stops: { lat: number; lng: number }[],
    onStopReached: (index: number) => void,
    startIndex = 0,
  ) {
    this.cancelFly();
    if (stops.length < 2) return;

    let currentIdx = startIndex;

    const flyNext = () => {
      if (currentIdx >= stops.length) return;
      onStopReached(currentIdx);
      this.flyToStop(currentIdx, stops);

      // Wait for camera animation + dwell time, then move on
      const dwell = currentIdx === 0 ? 2000 : 2500;
      const timerId = window.setTimeout(() => {
        currentIdx++;
        if (currentIdx < stops.length) {
          flyNext();
        }
      }, 1500 + dwell);

      // Store timer so cancelFly can clear it
      this._flyTimer = timerId;
    };

    flyNext();
  }

  private _flyTimer: number | null = null;

  private cancelFly() {
    if (this.flyAnimation) {
      cancelAnimationFrame(this.flyAnimation.id);
      this.flyAnimation = null;
    }
    if (this._flyTimer !== null) {
      clearTimeout(this._flyTimer);
      this._flyTimer = null;
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
    this.requestRender();
  }

  removeGPSMarker() {
    if (this.gpsMarker) {
      this.gpsMarker.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
        if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.Material).dispose();
      });
      this.scene.remove(this.gpsMarker);
      this.gpsMarker = null;
      this.requestRender();
    }
  }

  // ── Lifecycle ──

  resetCamera() {
    this.camera.position.set(0, 600, 800);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.requestRender();
  }

  start() {
    this.running = true;
    this.requestRender();
  }

  stop() {
    this.running = false;
  }

  /** Schedule a single render frame. Safe to call many times per frame. */
  requestRender() {
    if (!this.running || this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(() => {
      this.renderRequested = false;
      if (!this.running) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      // Continue rendering for damping ease-out
      if (this.dampingFrames > 0) {
        this.dampingFrames--;
        this.requestRender();
      }
    });
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.requestRender();
  }

  dispose() {
    this.stop();
    this.clearBuildings();
    this.clearRoute();
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
