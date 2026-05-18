/**
 * Overpass API를 통해 OpenStreetMap 건물 데이터를 가져옴
 */

import { latLngToDistrict, type SeoulDistrict } from './seoul-districts';
import { getCachedDistrict, setCachedDistrict } from './buildings-cache';

// Pre-cached bounds for instant loading
const CACHED_BOUNDS = { south: 37.562, west: 126.970, north: 37.585, east: 126.999 };

function isWithinCachedBounds(south: number, west: number, north: number, east: number): boolean {
  return south >= CACHED_BOUNDS.south && west >= CACHED_BOUNDS.west &&
         north <= CACHED_BOUNDS.north && east <= CACHED_BOUNDS.east;
}

let cachedBuildings: BuildingData[] | null = null;

async function loadCachedBuildings(): Promise<BuildingData[]> {
  if (cachedBuildings) return cachedBuildings;
  const data = await import('@/mocks/buildings-jongno.json');
  const raw = (data.default || data) as { c: [number, number][]; h: number }[];
  cachedBuildings = raw.map((b, i) => ({
    id: `cached-${i}`,
    coords: b.c,
    height: b.h,
    tags: {},
  }));
  return cachedBuildings;
}

// Haversine distance approximation in meters
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Per-point building cache (keyed by "lat,lng")
const pointCache = new Map<string, BuildingData[]>();

function filterByDistance(buildings: BuildingData[], lat: number, lng: number, radiusM: number): BuildingData[] {
  return buildings.filter((b) => {
    const centroid = b.coords.reduce(
      (acc, [blat, blon]) => [acc[0] + blat, acc[1] + blon],
      [0, 0],
    );
    centroid[0] /= b.coords.length;
    centroid[1] /= b.coords.length;
    return distanceM(lat, lng, centroid[0], centroid[1]) <= radiusM;
  });
}

/**
 * Fetch buildings within a radius around a point.
 *
 * 우선순위:
 *  1. pointCache (메모리 — 같은 (lat,lng,radius) 재요청)
 *  2. 종로 사전 캐시 (정적 JSON, 즉시)
 *  3. 자치구 IndexedDB 캐시 (한 번 받은 자치구는 영구 보관)
 *  4. 자치구 전체 Overpass fetch → IndexedDB 저장 → 거리 필터
 *  5. 폴백: point-radius Overpass fetch (자치구 매핑 실패 또는 모든 미러 실패 시)
 */
export async function fetchBuildingsNearPoint(
  lat: number,
  lng: number,
  radiusM = 500,
): Promise<BuildingData[]> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${radiusM}`;
  if (pointCache.has(key)) return pointCache.get(key)!;

  // Degree offset for the radius
  const latOffset = radiusM / 111320;
  const lngOffset = radiusM / (111320 * Math.cos(lat * Math.PI / 180));
  const south = lat - latOffset;
  const north = lat + latOffset;
  const west = lng - lngOffset;
  const east = lng + lngOffset;

  // (2) 종로 사전 캐시 우선 — 가장 빠름.
  if (isWithinCachedBounds(south, west, north, east)) {
    const cached = await loadCachedBuildings();
    const filtered = filterByDistance(cached, lat, lng, radiusM);
    pointCache.set(key, filtered);
    return filtered;
  }

  // (3-4) 자치구 캐시 경로.
  const district = latLngToDistrict(lat, lng);
  if (district) {
    let districtBuildings = await getCachedDistrict(district.slug);
    if (!districtBuildings) {
      districtBuildings = await fetchBuildingsInDistrict(district);
      if (districtBuildings.length > 0) {
        // 비동기 저장 — 다음 호출 전에 완료될 보장은 없으나 fire-and-forget 으로 충분.
        setCachedDistrict(district.slug, districtBuildings).catch(() => {});
      }
    }
    if (districtBuildings.length > 0) {
      const filtered = filterByDistance(districtBuildings, lat, lng, radiusM);
      pointCache.set(key, filtered);
      return filtered;
    }
  }

  // (5) 폴백: point-radius Overpass (자치구 매핑 실패 또는 자치구 fetch 0건).
  const allBuildings = await fetchBuildings(south, west, north, east);
  pointCache.set(key, allBuildings);
  return allBuildings;
}

/**
 * 자치구 전체 bbox 를 한 번에 Overpass 로 받아옴. fetchBuildings 와 달리
 * MAX_BBOX_DEGREES 클램핑이 없고 timeout 도 더 김.
 */
async function fetchBuildingsInDistrict(district: SeoulDistrict): Promise<BuildingData[]> {
  const { south, west, north, east } = district.bbox;
  const query = `
    [out:json][timeout:120];
    (
      way["building"](${south},${west},${north},${east});
      relation["building"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `;

  const controller = new AbortController();
  const body = `data=${encodeURIComponent(query)}`;

  try {
    return await Promise.any(
      OVERPASS_URLS.map(async (url) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        });
        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();
        controller.abort();
        return parseBuildings(data);
      }),
    );
  } catch {
    console.warn(`Overpass: 자치구 ${district.slug} fetch 실패 — 빈 결과 반환`);
    return [];
  }
}

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const MAX_BBOX_DEGREES = 0.015;

export interface BuildingData {
  id: string;
  coords: [number, number][]; // [lat, lon]
  height: number;
  tags: Record<string, string>;
}

export async function fetchBuildings(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<BuildingData[]> {
  // Use cached data if within pre-loaded bounds
  if (isWithinCachedBounds(south, west, north, east)) {
    return loadCachedBuildings();
  }

  const latSpan = north - south;
  const lonSpan = east - west;

  if (latSpan > MAX_BBOX_DEGREES || lonSpan > MAX_BBOX_DEGREES) {
    const centerLat = (south + north) / 2;
    const centerLon = (west + east) / 2;
    const halfLat = Math.min(latSpan, MAX_BBOX_DEGREES) / 2;
    const halfLon = Math.min(lonSpan, MAX_BBOX_DEGREES) / 2;
    south = centerLat - halfLat;
    north = centerLat + halfLat;
    west = centerLon - halfLon;
    east = centerLon + halfLon;
  }

  const query = `
    [out:json][timeout:90];
    (
      way["building"](${south},${west},${north},${east});
      relation["building"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `;

  // Race all servers simultaneously — first success wins
  const controller = new AbortController();
  const body = `data=${encodeURIComponent(query)}`;

  try {
    const result = await Promise.any(
      OVERPASS_URLS.map(async (url) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        });
        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();
        controller.abort(); // cancel remaining requests
        return parseBuildings(data);
      }),
    );
    return result;
  } catch {
    console.warn('Overpass: 모든 서버 응답 실패 — 건물 없이 진행');
    return [];
  }
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  members?: { type: string; ref: number; role: string }[];
  tags?: Record<string, string>;
}

function parseBuildings(data: { elements: OverpassElement[] }): BuildingData[] {
  const nodes = new Map<number, { lat: number; lon: number }>();
  const ways = new Map<number, OverpassElement>();
  const buildings: BuildingData[] = [];

  for (const el of data.elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
    if (el.type === 'way') {
      ways.set(el.id, el);
    }
  }

  function wayToCoords(wayEl: OverpassElement): [number, number][] | null {
    if (!wayEl.nodes) return null;
    const coords: [number, number][] = [];
    for (const nodeId of wayEl.nodes) {
      const node = nodes.get(nodeId);
      if (!node) return null;
      coords.push([node.lat, node.lon]);
    }
    return coords.length >= 3 ? coords : null;
  }

  for (const el of data.elements) {
    if (el.type !== 'way' || !el.tags?.building) continue;
    const coords = wayToCoords(el);
    if (!coords) continue;
    buildings.push({
      id: String(el.id),
      coords,
      height: estimateHeight(el.tags),
      tags: el.tags,
    });
  }

  for (const el of data.elements) {
    if (el.type !== 'relation' || !el.tags?.building || !el.members) continue;
    const height = estimateHeight(el.tags);
    for (const member of el.members) {
      if (member.type !== 'way' || member.role !== 'outer') continue;
      const wayEl = ways.get(member.ref);
      if (!wayEl) continue;
      const coords = wayToCoords(wayEl);
      if (!coords) continue;
      buildings.push({
        id: `${el.id}-${member.ref}`,
        coords,
        height,
        tags: el.tags,
      });
    }
  }

  return buildings;
}

function estimateHeight(tags: Record<string, string>): number {
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!isNaN(h)) return h;
  }
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'], 10);
    if (!isNaN(levels)) return levels * 3;
  }

  const typeHeights: Record<string, number> = {
    apartments: 30, commercial: 15, office: 25, retail: 6,
    industrial: 10, warehouse: 8, church: 15, cathedral: 30,
    hospital: 20, school: 12, university: 15, hotel: 25, skyscraper: 100,
  };

  if (typeHeights[tags.building]) return typeHeights[tags.building];
  return 3 + Math.random() * 9;
}
