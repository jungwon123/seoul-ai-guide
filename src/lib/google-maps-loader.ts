import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (!apiKey) throw new Error('VITE_GOOGLE_MAPS_KEY not set');
  // maps3d (Photorealistic 3D Tiles) 는 alpha 채널에서만 사용 가능.
  // 2D Map / Marker / Places 는 alpha 에서도 동일 동작 (alpha 는 weekly 의 superset).
  setOptions({
    key: apiKey,
    v: 'alpha',
    libraries: ['maps', 'marker', 'places', 'visualization'],
    language: 'ko',
    region: 'KR',
  });
  initialized = true;
}

export function loadMaps() {
  ensureInit();
  return importLibrary('maps');
}

export function loadMarker() {
  ensureInit();
  return importLibrary('marker');
}

export function loadPlaces() {
  ensureInit();
  return importLibrary('places');
}

export function loadVisualization() {
  ensureInit();
  return importLibrary('visualization');
}

// Photorealistic 3D Tiles — Map3DElement / Marker3DInteractiveElement / Polyline3DElement.
// GCP 프로젝트에 "Map Tiles API" 활성화 필수. 미활성 시 importLibrary 가 reject.
// types 가 아직 alpha 라 라이브러리 반환은 any 로 다룬다.
export function loadMaps3D(): Promise<unknown> {
  ensureInit();
  return importLibrary('maps3d' as 'maps');
}
