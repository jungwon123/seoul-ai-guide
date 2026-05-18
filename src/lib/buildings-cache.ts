// IndexedDB 영구 캐시 — 자치구 단위 건물 데이터 저장.
// localStorage(5MB)로는 자치구 1개(평균 3-10MB)도 못 담아서 IndexedDB 사용.
//
// 사용:
//   const cached = await getCachedDistrict('jongno');
//   if (!cached) { ...fetch from Overpass...; await setCachedDistrict('jongno', data); }
//
// schema:
//   db: 'seoul-buildings' v1
//   store: 'districts' (keyPath: 'slug')
//   record: { slug, buildings: BuildingData[], cachedAt: number }

import type { BuildingData } from './overpass';

const DB_NAME = 'seoul-buildings';
const DB_VERSION = 1;
const STORE_NAME = 'districts';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일 — OSM 갱신 주기 감안

interface DistrictRecord {
  slug: string;
  buildings: BuildingData[];
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  // 실패 시 다음 호출에서 재시도할 수 있게 promise 비움.
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

export async function getCachedDistrict(slug: string): Promise<BuildingData[] | null> {
  let db: IDBDatabase;
  try { db = await openDb(); } catch { return null; }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(slug);
    req.onsuccess = () => {
      const record = req.result as DistrictRecord | undefined;
      if (!record) { resolve(null); return; }
      // TTL 만료 시 미스 처리. 별도 삭제는 다음 set 호출이 덮어쓰면서 자연 처리.
      if (Date.now() - record.cachedAt > CACHE_TTL_MS) { resolve(null); return; }
      resolve(record.buildings);
    };
    req.onerror = () => resolve(null);
  });
}

export async function setCachedDistrict(slug: string, buildings: BuildingData[]): Promise<void> {
  let db: IDBDatabase;
  try { db = await openDb(); } catch { return; }

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: DistrictRecord = { slug, buildings, cachedAt: Date.now() };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export async function clearAllDistricts(): Promise<void> {
  let db: IDBDatabase;
  try { db = await openDb(); } catch { return; }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}
