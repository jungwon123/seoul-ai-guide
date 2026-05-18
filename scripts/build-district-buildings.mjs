#!/usr/bin/env node
/**
 * 자치구 단위 사전 정적 건물 JSON 생성기.
 *
 * 사용:
 *   node scripts/build-district-buildings.mjs <slug> [<slug>...]
 *   node scripts/build-district-buildings.mjs all   # 25개 자치구 전부
 *
 * 출력: src/mocks/buildings-{slug}.json
 *       (압축 포맷: [{ c: [[lat,lng], ...], h: meters }, ...])
 *
 * 등록 절차:
 *   1) 이 스크립트 실행 → JSON 생성
 *   2) src/lib/overpass.ts 의 STATIC_DISTRICT_LOADERS 에 import 한 줄 추가
 *   3) 커밋
 *
 * 주의:
 *   - Overpass 무료 서버 rate limit. 자치구당 30-120초 소요 가능.
 *   - 빌드 환경에서 Overpass 접근 가능해야 함 (CI 가 막혀있으면 로컬에서 실행).
 *   - 결과 파일은 압축 전 1-15MB. gzip 후 ~300KB-3MB. 비대한 자치구는 신중히 ship.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const MOCKS_DIR = resolve(REPO_ROOT, 'src/mocks');

// seoul-districts.ts 와 동일한 bbox. 이중 관리 방지 위해 코드 공유가 이상적이지만,
// 이 스크립트는 단발성/오프라인 도구라 의도적으로 복사.
const DISTRICTS = {
  jongno:       { south: 37.554, west: 126.957, north: 37.625, east: 127.024 },
  jung:         { south: 37.545, west: 126.971, north: 37.581, east: 127.030 },
  yongsan:      { south: 37.505, west: 126.961, north: 37.560, east: 127.029 },
  seongdong:    { south: 37.531, west: 127.001, north: 37.587, east: 127.083 },
  gwangjin:     { south: 37.512, west: 127.057, north: 37.567, east: 127.122 },
  dongdaemun:   { south: 37.555, west: 127.013, north: 37.601, east: 127.082 },
  jungnang:     { south: 37.578, west: 127.063, north: 37.633, east: 127.130 },
  seongbuk:     { south: 37.572, west: 126.985, north: 37.628, east: 127.057 },
  gangbuk:      { south: 37.612, west: 126.988, north: 37.694, east: 127.061 },
  dobong:       { south: 37.644, west: 127.012, north: 37.702, east: 127.084 },
  nowon:        { south: 37.612, west: 127.027, north: 37.706, east: 127.115 },
  eunpyeong:    { south: 37.573, west: 126.901, north: 37.668, east: 126.965 },
  seodaemun:    { south: 37.551, west: 126.911, north: 37.620, east: 126.972 },
  mapo:         { south: 37.539, west: 126.872, north: 37.594, east: 126.952 },
  yangcheon:    { south: 37.500, west: 126.838, north: 37.547, east: 126.895 },
  gangseo:      { south: 37.521, west: 126.795, north: 37.602, east: 126.890 },
  guro:         { south: 37.464, west: 126.836, north: 37.520, east: 126.917 },
  geumcheon:    { south: 37.434, west: 126.876, north: 37.483, east: 126.926 },
  yeongdeungpo: { south: 37.495, west: 126.870, north: 37.555, east: 126.939 },
  dongjak:      { south: 37.487, west: 126.910, north: 37.539, east: 126.978 },
  gwanak:       { south: 37.430, west: 126.917, north: 37.510, east: 126.985 },
  seocho:       { south: 37.421, west: 126.985, north: 37.524, east: 127.069 },
  gangnam:      { south: 37.464, west: 127.013, north: 37.554, east: 127.090 },
  songpa:       { south: 37.480, west: 127.064, north: 37.554, east: 127.155 },
  gangdong:     { south: 37.520, west: 127.105, north: 37.581, east: 127.181 },
};

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

function estimateHeight(tags) {
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!isNaN(h)) return h;
  }
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'], 10);
    if (!isNaN(levels)) return levels * 3;
  }
  const typeHeights = {
    apartments: 30, commercial: 15, office: 25, retail: 6,
    industrial: 10, warehouse: 8, church: 15, cathedral: 30,
    hospital: 20, school: 12, university: 15, hotel: 25, skyscraper: 100,
  };
  if (typeHeights[tags.building]) return typeHeights[tags.building];
  return 3 + Math.random() * 9;
}

function parseBuildings(data) {
  const nodes = new Map();
  const ways = new Map();
  const out = [];

  for (const el of data.elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
    if (el.type === 'way') ways.set(el.id, el);
  }

  function wayToCoords(wayEl) {
    if (!wayEl.nodes) return null;
    const coords = [];
    for (const id of wayEl.nodes) {
      const n = nodes.get(id);
      if (!n) return null;
      coords.push([n.lat, n.lon]);
    }
    return coords.length >= 3 ? coords : null;
  }

  for (const el of data.elements) {
    if (el.type !== 'way' || !el.tags?.building) continue;
    const coords = wayToCoords(el);
    if (!coords) continue;
    out.push({ c: coords.map(([lat, lon]) => [Number(lat.toFixed(4)), Number(lon.toFixed(4))]), h: Math.round(estimateHeight(el.tags)) });
  }

  for (const el of data.elements) {
    if (el.type !== 'relation' || !el.tags?.building || !el.members) continue;
    const h = Math.round(estimateHeight(el.tags));
    for (const m of el.members) {
      if (m.type !== 'way' || m.role !== 'outer') continue;
      const wayEl = ways.get(m.ref);
      if (!wayEl) continue;
      const coords = wayToCoords(wayEl);
      if (!coords) continue;
      out.push({ c: coords.map(([lat, lon]) => [Number(lat.toFixed(4)), Number(lon.toFixed(4))]), h });
    }
  }
  return out;
}

async function fetchDistrict(slug, bbox) {
  const { south, west, north, east } = bbox;
  const query = `[out:json][timeout:180];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;
  const body = `data=${encodeURIComponent(query)}`;

  let lastErr = null;
  for (const url of OVERPASS_URLS) {
    process.stdout.write(`  trying ${url} ... `);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'seoul-ai-guide build script' },
        body,
        signal: AbortSignal.timeout(180_000),
      });
      if (!resp.ok) {
        process.stdout.write(`HTTP ${resp.status}\n`);
        lastErr = new Error(`HTTP ${resp.status}`);
        continue;
      }
      const json = await resp.json();
      process.stdout.write(`ok (${json.elements?.length ?? 0} elements)\n`);
      return parseBuildings(json);
    } catch (e) {
      process.stdout.write(`failed: ${e.message}\n`);
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('All Overpass mirrors failed');
}

async function buildOne(slug) {
  const bbox = DISTRICTS[slug];
  if (!bbox) {
    console.error(`Unknown slug: ${slug}. 사용 가능: ${Object.keys(DISTRICTS).join(', ')}`);
    process.exit(1);
  }
  console.log(`\n[${slug}] bbox=${JSON.stringify(bbox)}`);
  const buildings = await fetchDistrict(slug, bbox);
  if (buildings.length === 0) {
    console.warn(`  → 빌딩 0개. 건너뜀 (파일 생성 안 함)`);
    return;
  }
  await mkdir(MOCKS_DIR, { recursive: true });
  const outPath = resolve(MOCKS_DIR, `buildings-${slug}.json`);
  await writeFile(outPath, JSON.stringify(buildings));
  console.log(`  → ${buildings.length} buildings → ${outPath}`);
  console.log(`     ⚠ src/lib/overpass.ts 의 STATIC_DISTRICT_LOADERS 에 등록 필요:`);
  console.log(`       ${slug}: () => import('@/mocks/buildings-${slug}.json'),`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('사용: node scripts/build-district-buildings.mjs <slug> [<slug>...]');
    console.error('      node scripts/build-district-buildings.mjs all');
    process.exit(1);
  }
  const targets = args.includes('all') ? Object.keys(DISTRICTS) : args;
  for (const slug of targets) {
    try { await buildOne(slug); } catch (e) {
      console.error(`[${slug}] 실패: ${e.message}`);
    }
  }
}

main();
