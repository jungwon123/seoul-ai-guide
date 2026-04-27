/**
 * Overpass API를 통해 OpenStreetMap 건물 데이터를 가져옴
 */

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
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

  for (const url of OVERPASS_URLS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      return parseBuildings(data);
    } catch {
      continue;
    }
  }

  throw new Error('모든 Overpass 서버가 응답하지 않습니다.');
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
