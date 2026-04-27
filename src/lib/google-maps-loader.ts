import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (!apiKey) throw new Error('VITE_GOOGLE_MAPS_KEY not set');
  setOptions({
    key: apiKey,
    v: 'weekly',
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
