// 서울 25개 자치구 — bbox(SW-NE) 와 대표 중심점.
// 좌표 → 자치구 매핑: 모든 자치구 bbox 안에 들어가는 후보 중 중심점에서
// 가장 가까운 것을 선택 (대부분 자치구가 직사각 형태가 아니라 경계가 겹침).
// Source: 서울 행정구역 공개 데이터(2024).

export interface SeoulDistrict {
  slug: string;       // 영문 식별자 — IndexedDB key, 파일명 등에 사용
  name: string;       // 표시명
  center: { lat: number; lng: number };
  // bbox 는 Overpass 호출용 — 자치구 전체를 한 번에 받기 위한 사각형.
  // 실제 경계보다 약간 크게 잡아 둠 (인접 자치구 일부 포함될 수 있으나 무해).
  bbox: { south: number; west: number; north: number; east: number };
}

export const SEOUL_DISTRICTS: SeoulDistrict[] = [
  { slug: 'jongno',       name: '종로구',   center: { lat: 37.5735, lng: 126.9788 }, bbox: { south: 37.554, west: 126.957, north: 37.625, east: 127.024 } },
  { slug: 'jung',         name: '중구',     center: { lat: 37.5641, lng: 126.9979 }, bbox: { south: 37.545, west: 126.971, north: 37.581, east: 127.030 } },
  { slug: 'yongsan',      name: '용산구',   center: { lat: 37.5326, lng: 126.9905 }, bbox: { south: 37.505, west: 126.961, north: 37.560, east: 127.029 } },
  { slug: 'seongdong',    name: '성동구',   center: { lat: 37.5635, lng: 127.0367 }, bbox: { south: 37.531, west: 127.001, north: 37.587, east: 127.083 } },
  { slug: 'gwangjin',     name: '광진구',   center: { lat: 37.5384, lng: 127.0825 }, bbox: { south: 37.512, west: 127.057, north: 37.567, east: 127.122 } },
  { slug: 'dongdaemun',   name: '동대문구', center: { lat: 37.5744, lng: 127.0395 }, bbox: { south: 37.555, west: 127.013, north: 37.601, east: 127.082 } },
  { slug: 'jungnang',     name: '중랑구',   center: { lat: 37.6066, lng: 127.0925 }, bbox: { south: 37.578, west: 127.063, north: 37.633, east: 127.130 } },
  { slug: 'seongbuk',     name: '성북구',   center: { lat: 37.5894, lng: 127.0167 }, bbox: { south: 37.572, west: 126.985, north: 37.628, east: 127.057 } },
  { slug: 'gangbuk',      name: '강북구',   center: { lat: 37.6396, lng: 127.0257 }, bbox: { south: 37.612, west: 126.988, north: 37.694, east: 127.061 } },
  { slug: 'dobong',       name: '도봉구',   center: { lat: 37.6688, lng: 127.0470 }, bbox: { south: 37.644, west: 127.012, north: 37.702, east: 127.084 } },
  { slug: 'nowon',        name: '노원구',   center: { lat: 37.6542, lng: 127.0568 }, bbox: { south: 37.612, west: 127.027, north: 37.706, east: 127.115 } },
  { slug: 'eunpyeong',    name: '은평구',   center: { lat: 37.6027, lng: 126.9291 }, bbox: { south: 37.573, west: 126.901, north: 37.668, east: 126.965 } },
  { slug: 'seodaemun',    name: '서대문구', center: { lat: 37.5791, lng: 126.9368 }, bbox: { south: 37.551, west: 126.911, north: 37.620, east: 126.972 } },
  { slug: 'mapo',         name: '마포구',   center: { lat: 37.5663, lng: 126.9019 }, bbox: { south: 37.539, west: 126.872, north: 37.594, east: 126.952 } },
  { slug: 'yangcheon',    name: '양천구',   center: { lat: 37.5170, lng: 126.8666 }, bbox: { south: 37.500, west: 126.838, north: 37.547, east: 126.895 } },
  { slug: 'gangseo',      name: '강서구',   center: { lat: 37.5509, lng: 126.8495 }, bbox: { south: 37.521, west: 126.795, north: 37.602, east: 126.890 } },
  { slug: 'guro',         name: '구로구',   center: { lat: 37.4954, lng: 126.8874 }, bbox: { south: 37.464, west: 126.836, north: 37.520, east: 126.917 } },
  { slug: 'geumcheon',    name: '금천구',   center: { lat: 37.4519, lng: 126.9020 }, bbox: { south: 37.434, west: 126.876, north: 37.483, east: 126.926 } },
  { slug: 'yeongdeungpo', name: '영등포구', center: { lat: 37.5264, lng: 126.8962 }, bbox: { south: 37.495, west: 126.870, north: 37.555, east: 126.939 } },
  { slug: 'dongjak',      name: '동작구',   center: { lat: 37.5124, lng: 126.9393 }, bbox: { south: 37.487, west: 126.910, north: 37.539, east: 126.978 } },
  { slug: 'gwanak',       name: '관악구',   center: { lat: 37.4783, lng: 126.9516 }, bbox: { south: 37.430, west: 126.917, north: 37.510, east: 126.985 } },
  { slug: 'seocho',       name: '서초구',   center: { lat: 37.4837, lng: 127.0324 }, bbox: { south: 37.421, west: 126.985, north: 37.524, east: 127.069 } },
  { slug: 'gangnam',      name: '강남구',   center: { lat: 37.5172, lng: 127.0473 }, bbox: { south: 37.464, west: 127.013, north: 37.554, east: 127.090 } },
  { slug: 'songpa',       name: '송파구',   center: { lat: 37.5145, lng: 127.1059 }, bbox: { south: 37.480, west: 127.064, north: 37.554, east: 127.155 } },
  { slug: 'gangdong',     name: '강동구',   center: { lat: 37.5301, lng: 127.1238 }, bbox: { south: 37.520, west: 127.105, north: 37.581, east: 127.181 } },
];

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 좌표 → 자치구 매핑. bbox 후보 중 중심점이 가장 가까운 자치구 선택.
 * 후보가 없으면 (서울 외) null. 서울 전역 어디든 매칭되도록 bbox는 약간 여유 있게 잡아둠.
 */
export function latLngToDistrict(lat: number, lng: number): SeoulDistrict | null {
  const candidates = SEOUL_DISTRICTS.filter(
    (d) => lat >= d.bbox.south && lat <= d.bbox.north && lng >= d.bbox.west && lng <= d.bbox.east,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  let best = candidates[0];
  let bestDist = distanceM(lat, lng, best.center.lat, best.center.lng);
  for (let i = 1; i < candidates.length; i++) {
    const d = distanceM(lat, lng, candidates[i].center.lat, candidates[i].center.lng);
    if (d < bestDist) {
      bestDist = d;
      best = candidates[i];
    }
  }
  return best;
}

export function getDistrictBySlug(slug: string): SeoulDistrict | null {
  return SEOUL_DISTRICTS.find((d) => d.slug === slug) ?? null;
}
