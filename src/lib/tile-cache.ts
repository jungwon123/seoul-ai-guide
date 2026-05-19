// OSM 타일 영구 캐시 — Cache Storage (Cache API) 기반.
// THREE.TextureLoader 가 < img > 로 매번 HTTP fetch 하는 대신, fetch + cache.match
// 로 디스크에 보관해 두 번째 진입부터 즉시 표시. ImageBitmap 사용해 blob URL
// 라이프사이클 이슈 회피.
//
// 폴백: Cache API 또는 createImageBitmap 미지원 시 기존 TextureLoader 경로 사용.

import * as THREE from 'three';

const CACHE_NAME = 'osm-tiles-v1';

async function loadFromCacheOrNetwork(url: string): Promise<Blob | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    let resp = await cache.match(url);
    if (!resp) {
      resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) return null;
      // 비동기 저장 — 실패해도 캐시 미스로만 처리 (storage quota 등).
      cache.put(url, resp.clone()).catch(() => {});
    }
    return await resp.blob();
  } catch {
    return null;
  }
}

/**
 * 타일 URL → THREE.Texture. Cache Storage 우선 hit → 미스 시 네트워크 + 캐싱.
 * 모든 폴백 실패 시 일반 TextureLoader 로 fallback (CORS only fetch 가 막힌 환경 등).
 */
export async function loadTileTexture(url: string): Promise<THREE.Texture | null> {
  // 1) Cache 우선 시도.
  const blob = await loadFromCacheOrNetwork(url);
  if (blob && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const texture = new THREE.Texture(bitmap);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    } catch {
      // ImageBitmap 디코딩 실패 → 폴백.
    }
  }

  // 2) 폴백 — 표준 TextureLoader.
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      url,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}
