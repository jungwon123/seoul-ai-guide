// 코스 stop 좌표 1개 + 그 주변 빌딩 N개 만 강조 렌더할 때 사용.
// target = 좌표가 footprint 안에 들어가는 빌딩 (없으면 centroid 최단거리 fallback).
// neighbors = target 제외, centroid 가 좌표에서 가까운 순으로 N개.

import type { BuildingData } from './overpass';

export interface FocusedBuildings {
  target: BuildingData | null;
  neighbors: BuildingData[];
}

// Ray casting point-in-polygon. ring 은 [[lat, lng], ...] 순서.
function pointInPolygon(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const intersect = (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function centroid(ring: [number, number][]): { lat: number; lng: number } {
  let lat = 0;
  let lng = 0;
  for (const [la, ln] of ring) {
    lat += la;
    lng += ln;
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}

// 짧은 거리 비교 용도라 Haversine 대신 flat earth 근사 (서울 위도 기준).
// 비교 sort 만 필요해서 단위(m) 정확성보다 일관성 우선.
function squaredDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const COS = Math.cos((lat1 * Math.PI) / 180);
  const dLat = (lat2 - lat1) * 111320;
  const dLng = (lng2 - lng1) * 111320 * COS;
  return dLat * dLat + dLng * dLng;
}

export function pickFocusBuildings(
  buildings: BuildingData[],
  coord: { lat: number; lng: number },
  neighborCount = 10,
): FocusedBuildings {
  if (buildings.length === 0) return { target: null, neighbors: [] };

  // 1) Polygon 포함 매치
  let target: BuildingData | null = null;
  for (const b of buildings) {
    if (b.coords.length >= 3 && pointInPolygon(coord.lat, coord.lng, b.coords)) {
      target = b;
      break;
    }
  }

  // 2) Fallback — centroid 가장 가까운 빌딩
  if (!target) {
    let bestDist = Infinity;
    for (const b of buildings) {
      if (b.coords.length < 3) continue;
      const c = centroid(b.coords);
      const d = squaredDist(coord.lat, coord.lng, c.lat, c.lng);
      if (d < bestDist) {
        bestDist = d;
        target = b;
      }
    }
  }

  if (!target) return { target: null, neighbors: [] };

  // 3) 나머지 → centroid 거리 sort → top N
  const targetRef = target;
  const others = buildings
    .filter((b) => b !== targetRef && b.coords.length >= 3)
    .map((b) => {
      const c = centroid(b.coords);
      return { b, d: squaredDist(coord.lat, coord.lng, c.lat, c.lng) };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, neighborCount)
    .map((x) => x.b);

  return { target, neighbors: others };
}
