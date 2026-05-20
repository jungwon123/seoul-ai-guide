import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { BuildingData } from './overpass';
import { loadTileTexture } from './tile-cache';
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
  // 마커는 InstancedMesh 그룹으로 한 번에 — Group/개별 mesh 보다 draw call 수십→2~3.
  private placeMarkerGroup: THREE.Group | null = null;
  private gpsMarker: THREE.Group | null = null;
  // loadBuildings 가 async chunked 라 직전 호출을 cancel 하기 위한 세대 counter.
  private buildGeneration = 0;
  // CSS2DRenderer — target 빌딩 라벨용 DOM 오버레이.
  private labelRenderer: CSS2DRenderer;
  private focusLabel: CSS2DObject | null = null;
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

    // CSS2DRenderer — WebGL 위에 DOM 오버레이로 라벨 표시. canvas 부모에 absolute 로 얹음.
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const labelEl = this.labelRenderer.domElement;
    labelEl.style.position = 'absolute';
    labelEl.style.top = '0';
    labelEl.style.left = '0';
    labelEl.style.pointerEvents = 'none';
    canvas.parentElement?.appendChild(labelEl);

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

    const promises: Promise<void>[] = [];

    for (let tx = tlTile.x - 1; tx <= brTile.x + 1; tx++) {
      for (let ty = tlTile.y - 1; ty <= brTile.y + 1; ty++) {
        const url = TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(tx)).replace('{y}', String(ty));
        const nw = tileToLonLat(tx, ty, zoom);
        const se = tileToLonLat(tx + 1, ty + 1, zoom);
        const tl = this.latLonToLocal(nw.lat, nw.lon);
        const br = this.latLonToLocal(se.lat, se.lon);

        const p = loadTileTexture(url).then((texture) => {
          if (!texture) return;
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

  // 빌딩 빌드 — async chunked 로 메인 스레드 블로킹 회피 + 거리 컬링.
  // 카메라 중심에서 반경 maxDistanceM (기본 1500m) 안의 빌딩만 geometry 빌드.
  // 중간에 다시 호출되면 buildGeneration 가 증가해 직전 빌드는 자동 중단.
  async loadBuildings(
    buildings: BuildingData[],
    center: { lat: number; lon: number },
    options?: { maxDistanceM?: number; chunkSize?: number },
  ): Promise<void> {
    this.clearBuildings();
    this.setCenter(center.lat, center.lon);

    if (buildings.length === 0) return;

    const generation = ++this.buildGeneration;
    const maxDistanceM = options?.maxDistanceM ?? 1500;
    const maxSq = maxDistanceM * maxDistanceM;
    const chunkSize = options?.chunkSize ?? 200;

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

    const buckets = new Map<number, THREE.BufferGeometry[]>();
    for (const bucket of COLOR_BUCKETS) buckets.set(bucket.color, []);

    // 거리 컬링 — 빌딩 중심(centroid)이 카메라 중심에서 너무 멀면 skip.
    // local 좌표 (x, z) 기반 (latLonToLocal 이 center 를 원점으로 반환).
    for (let i = 0; i < buildings.length; i += chunkSize) {
      // 직전 빌드가 cancel 되면 즉시 종료.
      if (generation !== this.buildGeneration) return;

      const end = Math.min(i + chunkSize, buildings.length);
      for (let j = i; j < end; j++) {
        const b = buildings[j];
        try {
          const pts = b.coords.map(([lat, lon]) => this.latLonToLocal(lat, lon));
          if (pts.length < 3) continue;

          // centroid 거리 컬링 — 빠른 reject.
          let cx = 0;
          let cz = 0;
          for (const p of pts) { cx += p.x; cz += p.z; }
          cx /= pts.length;
          cz /= pts.length;
          if (cx * cx + cz * cz > maxSq) continue;

          const shape = new THREE.Shape();
          shape.moveTo(pts[0].x, -pts[0].z);
          for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k].x, -pts[k].z);
          shape.closePath();

          const geo = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false });
          geo.rotateX(-Math.PI / 2);

          buckets.get(getColorBucket(b.height))!.push(geo);
        } catch { /* skip invalid */ }
      }
      // 다음 chunk 전에 event loop 양보.
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    // 빌드 완료 직전에 한 번 더 generation 검사.
    if (generation !== this.buildGeneration) {
      for (const geos of buckets.values()) for (const g of geos) g.dispose();
      return;
    }

    for (const [color, geos] of buckets) {
      if (geos.length === 0) continue;
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;

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

  // 모든 마커를 InstancedMesh 3개(sphere/pole/ring)로 한꺼번에 — 그룹 단위 mesh
  // 제거로 draw call 과 메모리 절감. selected 는 sphere scale 키워서 강조.
  setPlaceMarkers(places: Place[], selectedId?: string) {
    // 기존 그룹 제거
    if (this.placeMarkerGroup) {
      this.placeMarkerGroup.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
        const mat = (c as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      this.scene.remove(this.placeMarkerGroup);
      this.placeMarkerGroup = null;
    }

    const n = places.length;
    if (n === 0) {
      this.requestRender();
      return;
    }

    const categoryColors: Record<string, number> = {
      tourism: 0x1f3a8b, shopping: 0xdc2127, culture: 0xf4a12c, food: 0x00853e,
    };

    // 공유 geometry — InstancedMesh 가 instance 별 transform/color 만 보관.
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const poleGeo = new THREE.CylinderGeometry(1.5, 1.5, 50, 8);
    const ringGeo = new THREE.RingGeometry(6, 10, 32);

    const sphereMesh = new THREE.InstancedMesh(
      sphereGeo,
      new THREE.MeshPhongMaterial({ vertexColors: true }),
      n,
    );
    const poleMesh = new THREE.InstancedMesh(
      poleGeo,
      new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.5 }),
      n,
    );
    const ringMesh = new THREE.InstancedMesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, side: THREE.DoubleSide, vertexColors: true }),
      n,
    );
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;

    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();
    const ringQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

    for (let i = 0; i < n; i++) {
      const place = places[i];
      const isSelected = place.id === selectedId;
      const c = categoryColors[place.category] ?? 0x2563eb;
      const radius = isSelected ? 12 : 8;
      const pos = this.latLonToLocal(place.lat, place.lng);

      // Sphere — pin 위쪽. 단위 구를 radius 만큼 scale.
      dummyPos.set(pos.x, 50, pos.z);
      dummyScale.set(radius, radius, radius);
      m.compose(dummyPos, dummyQuat, dummyScale);
      sphereMesh.setMatrixAt(i, m);
      sphereMesh.setColorAt(i, color.setHex(c));

      // Pole — y 25 중심, 단위 스케일.
      dummyPos.set(pos.x, 25, pos.z);
      dummyScale.set(1, 1, 1);
      m.compose(dummyPos, dummyQuat, dummyScale);
      poleMesh.setMatrixAt(i, m);

      // Ring — 바닥에 깔린 형태로 회전.
      dummyPos.set(pos.x, 1, pos.z);
      m.compose(dummyPos, ringQuat, dummyScale);
      ringMesh.setMatrixAt(i, m);
      ringMesh.setColorAt(i, color.setHex(c));
    }

    sphereMesh.instanceMatrix.needsUpdate = true;
    poleMesh.instanceMatrix.needsUpdate = true;
    ringMesh.instanceMatrix.needsUpdate = true;
    if (sphereMesh.instanceColor) sphereMesh.instanceColor.needsUpdate = true;
    if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;

    const group = new THREE.Group();
    group.add(sphereMesh, poleMesh, ringMesh);
    this.scene.add(group);
    this.placeMarkerGroup = group;

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
      this.labelRenderer.render(this.scene, this.camera);
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
    this.labelRenderer.setSize(w, h);
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
    this.clearFocusLabel();
    this.labelRenderer.domElement.remove();
  }

  private clearFocusLabel() {
    if (!this.focusLabel) return;
    this.scene.remove(this.focusLabel);
    if (this.focusLabel.element.parentElement) {
      this.focusLabel.element.parentElement.removeChild(this.focusLabel.element);
    }
    this.focusLabel = null;
  }

  /**
   * 코스 stop 좌표 1개 + 주변 N개 강조 모드.
   * target 빌딩: 빨강 + emissive glow + 윤곽선 + 위쪽 라벨.
   * neighbors: 파란색 단일 merged mesh.
   * 기존 빌딩 모두 clear 한 뒤 11개(또는 그 이하)만 렌더.
   */
  async loadFocusedBuildings(
    target: BuildingData | null,
    neighbors: BuildingData[],
    center: { lat: number; lon: number },
    targetLabel?: string,
  ): Promise<void> {
    this.clearBuildings();
    this.clearFocusLabel();
    this.setCenter(center.lat, center.lon);

    const generation = ++this.buildGeneration;

    // Target — 빨간색 + emissive + outline + label
    if (target) {
      const targetGeo = this.buildExtrudeForBuilding(target);
      if (targetGeo) {
        const targetMat = new THREE.MeshPhongMaterial({
          color: 0xDC2626,
          emissive: 0xDC2626,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.95,
          shininess: 50,
        });
        const targetMesh = new THREE.Mesh(targetGeo, targetMat);
        targetMesh.castShadow = true;
        targetMesh.receiveShadow = true;
        targetMesh.scale.y = 0.01;
        targetMesh.userData.targetScaleY = 1;
        this.scene.add(targetMesh);
        this.buildings.push(targetMesh);

        // 윤곽선 — EdgesGeometry. target mesh 의 자식으로 붙여 같이 변환.
        const edges = new THREE.EdgesGeometry(targetGeo, 20);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0xFEE2E2,
          transparent: true,
          opacity: 0.9,
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMat);
        targetMesh.add(edgeLines);

        // 라벨 — target 위쪽 (높이 + 30m 정도).
        if (targetLabel) {
          const labelDiv = document.createElement('div');
          labelDiv.textContent = targetLabel;
          labelDiv.style.cssText = `
            background: rgba(220, 38, 38, 0.92);
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 9999px;
            white-space: nowrap;
            box-shadow: 0 4px 14px rgba(220,38,38,0.4);
            transform: translate(-50%, -100%);
            font-family: 'Pretendard Variable', system-ui, sans-serif;
            letter-spacing: -0.01em;
          `;
          const labelObj = new CSS2DObject(labelDiv);
          // 빌딩 footprint 중심 위치 계산
          let cx = 0;
          let cz = 0;
          for (const [lat, lon] of target.coords) {
            const local = this.latLonToLocal(lat, lon);
            cx += local.x;
            cz += local.z;
          }
          cx /= target.coords.length;
          cz /= target.coords.length;
          labelObj.position.set(cx, target.height + 30, cz);
          this.scene.add(labelObj);
          this.focusLabel = labelObj;
        }
      }
    }

    // Neighbors — 단일 merged blue mesh
    const neighborGeos: THREE.BufferGeometry[] = [];
    for (const b of neighbors) {
      if (generation !== this.buildGeneration) return;
      const geo = this.buildExtrudeForBuilding(b);
      if (geo) neighborGeos.push(geo);
    }

    if (generation !== this.buildGeneration) {
      for (const g of neighborGeos) g.dispose();
      return;
    }

    if (neighborGeos.length > 0) {
      const merged = mergeGeometries(neighborGeos, false);
      for (const g of neighborGeos) g.dispose();
      if (merged) {
        const mesh = new THREE.Mesh(
          merged,
          new THREE.MeshPhongMaterial({
            color: 0x3B82F6,
            transparent: true,
            opacity: 0.82,
            shininess: 25,
          }),
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.scale.y = 0.01;
        mesh.userData.targetScaleY = 1;
        this.scene.add(mesh);
        this.buildings.push(mesh);
      }
    }

    this.animateBuildings();
  }

  /** 페이드아웃 → loadFocusedBuildings. transitionBuildings 와 동일 패턴. */
  transitionFocusedBuildings(
    target: BuildingData | null,
    neighbors: BuildingData[],
    center: { lat: number; lon: number },
    targetLabel?: string,
  ) {
    if (this.buildings.length === 0) {
      this.loadFocusedBuildings(target, neighbors, center, targetLabel);
      return;
    }
    const oldMeshes = [...this.buildings];
    const fadeOutDuration = 300;
    const fadeStart = performance.now();

    const fadeOut = (now: number) => {
      const t = Math.min((now - fadeStart) / fadeOutDuration, 1);
      for (const m of oldMeshes) {
        const mat = m.material as THREE.MeshPhongMaterial;
        mat.opacity = (mat.opacity ?? 0.92) * (1 - t);
        m.scale.y = m.userData.targetScaleY * (1 - t * 0.3);
      }
      this.requestRender();
      if (t < 1) {
        requestAnimationFrame(fadeOut);
      } else {
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
        this.loadFocusedBuildings(target, neighbors, center, targetLabel);
      }
    };
    requestAnimationFrame(fadeOut);
  }

  // 단일 빌딩 ExtrudeGeometry 빌드. 좌표가 적거나 잘못된 경우 null.
  private buildExtrudeForBuilding(b: BuildingData): THREE.BufferGeometry | null {
    try {
      const pts = b.coords.map(([lat, lon]) => this.latLonToLocal(lat, lon));
      if (pts.length < 3) return null;
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, -pts[0].z);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, -pts[i].z);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      return geo;
    } catch {
      return null;
    }
  }
}
