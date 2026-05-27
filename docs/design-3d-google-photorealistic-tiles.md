# [설계] 3D 지도 재설계 — Google Photorealistic 3D Tiles 로 교체

**작성일**: 2026-05-22
**상태**: ✅ 구현 완료 (2026-05-27) — `src/components/map/Google3DMap.tsx`
**대체 대상**: 현재 Three.js + OSM Overpass 기반 3D 시스템 — 삭제됨
**대체 후**: Google `Map3DElement` (Photorealistic 3D Tiles)

---

## 1. 왜 교체하나

### 현재 시스템 문제점
- 자체 OSM raster 타일 로딩 + 직접 ExtrudeGeometry 빌드 → 메인 스레드 부담, 라이브 fetch 의존
- 빌딩 데이터 fetch 가 Overpass API 의존 (rate limit, network 변동)
- IndexedDB 캐싱 / 자치구 polygon mapping / focus mode 등 점점 복잡해진 자체 인프라
- 시각 품질: 단색 ExtrudeGeometry 직육면체 → 실제 도시 느낌 약함
- 모바일 성능 불안정

### Google Photorealistic 3D Tiles 의 강점
- **실사 텍스처가 입혀진 진짜 3D 건물**: 지붕 색, 창문, 도로 그래픽 모두 사진 기반
- **Google 이 모든 데이터/로딩 처리**: 캐시, LOD, 타일 우선순위 자동
- **이미 사용 중인 Google Maps API 의 확장**: 신규 인증/SDK 학습 부담 작음
- **API 1줄로 카메라 fly-to / range / tilt 제어**: 자체 OrbitControls 대체

---

## 2. 비교 매트릭스

| 항목 | 현재 (Three.js + OSM) | Google Photorealistic 3D Tiles |
|---|---|---|
| 시각 품질 | 단색 도형 | 실사 텍스처 |
| 코드 크기 | `three-scene.ts` ~750줄 + 캐시/유틸 ~400줄 | 새 wrapper 약 150~200줄 |
| 번들 크기 | Three.js ~600KB gzipped | Google Maps JS API (이미 로드 중) + 미미 |
| 데이터 소스 의존 | Overpass API (외부, 불안정) | Google (안정) |
| 빌딩 캐싱 | IndexedDB 자체 관리 | Google 자동 |
| 카메라 제어 | OrbitControls + 자체 flyToStop | `flyCameraTo` / `flyCameraAround` |
| 마커 | Three.js Group/InstancedMesh | `<gmp-marker-3d>` Web Component |
| 라벨 | CSS2DRenderer | 마커 내장 또는 InfoWindow |
| Focus 모드 (target 빨강 + neighbors) | 자체 ExtrudeGeometry + EdgesGeometry | Marker3D 색만 강조 또는 fly 카메라 |
| 한국 커버리지 | OSM Overpass 데이터 (있음) | 서울 도심 양호 (외곽 일부 약함) |
| 비용 | Overpass 무료 (호스팅 제외) | $5 / 1000 세션 (Map Tiles API), 월 $200 무료 크레딧 |
| 모바일 호환 | three.js — 일반 | Chrome/Safari 18+ — 비교적 신 기술 |

---

## 3. 삭제 대상 (재설계 후)

```
src/lib/three-scene.ts                  ~750줄
src/lib/overpass.ts                     ~250줄
src/lib/buildings-cache.ts              ~70줄
src/lib/seoul-districts.ts              ~120줄
src/lib/seoul-districts-polygons.json   54KB
src/lib/focus-buildings.ts              ~90줄
src/lib/tile-cache.ts                   ~60줄
src/lib/prefetch-3d.ts                  ~45줄
src/mocks/buildings-jongno.json         1.1MB
scripts/build-district-buildings.mjs    ~150줄
```

총 ~1,500줄 코드 + 1.1MB+ 정적 자산 삭제.

`package.json` 에서 `three` 의존성도 제거 가능 (다른 곳 사용 여부 확인 후).

---

## 4. 신규 구성

### A. Web Component 도입
```html
<gmp-map-3d
  center="37.5663,126.9019,150"
  range="500"
  tilt="65"
  heading="0"
></gmp-map-3d>
```

또는 React 친화적인 wrapper 사용 가능: `@googlemaps/extended-component-library`.

### B. 새 파일
- `src/components/map/Google3DMap.tsx` — React wrapper
  - `useEffect` 로 Map3DElement 인스턴스 생성
  - props: `center, zoom/range, tilt, navigation, markers, onSelectPlace`
  - 네비게이션 stop 변경 시 `flyCameraTo` 호출
  - target stop 위치에 빨강 Marker3D, 나머지 stop 들은 파란 Marker3D
- `src/lib/google-3d-loader.ts` — Map Tiles API 로딩 + 인증 체크
  - 기존 `google-maps-loader.ts` 와 별도 모듈 (혹은 통합)

### C. ThreeMap 의 자리에 교체
- `src/components/map/MapPanel.tsx` 가 `ThreeMap` 대신 `Google3DMap` 사용
- 인터페이스 동일하게 유지 (`markers / navigation / onLoadingChange / onError`)

---

## 5. Focus 모드 (target + neighbors) 재구현

Google 3D Tiles 에서는 ExtrudeGeometry 같은 게 없으므로 빌딩에 직접 색을 못 입힘. 대신:

- **Target stop**: 빨강 `<gmp-marker-3d>` + label "ㅅㅅㅅ 카페" + 카메라가 그 마커 주변 `range: 200, tilt: 75` 로 fly
- **Neighbor stops**: 파랑 `<gmp-marker-3d>` (기본 작은 핀)
- **건물 강조 자체는 포기** — 어차피 실사 텍스처로 어떤 건물인지 명확
- **마커가 너무 작게 보이면** → `<gmp-marker-3d>` 의 size 키우거나 `altitudeMode: relative-to-mesh` 로 건물 옥상 위에 띄움

이렇게 하면 사용자가 받는 인상: "이 카페 주변이 이렇게 생겼구나" — 빨강 핀이 정확한 건물 옥상에 꽂힘.

---

## 6. 마이그레이션 단계

### Phase A (인프라 — 사용자/BE 팀 협의 필요)
1. **GCP 콘솔에서 Map Tiles API 활성화**
2. 기존 Maps JS API key 의 권한에 Map Tiles 추가 (또는 새 key)
3. 빌링 한도 알림 설정 ($50/월 정도부터 경고)
4. (선택) 한국 서비스 약관 / VAT 처리 확인

### Phase B (FE 구현 — 1~2일)
1. `@googlemaps/extended-component-library` 설치 (또는 raw HTML element 직접 사용)
2. `Google3DMap.tsx` 신규 작성 — 인터페이스는 `ThreeMap` 와 호환
3. `MapPanel.tsx` 에서 lazy import 를 `Google3DMap` 으로 교체
4. 임시로 ThreeMap 도 유지 (feature flag 로 토글 가능하게 → 문제 시 폴백)

### Phase C (검증 — 0.5일)
1. 모바일/데스크탑 양쪽 동작 확인 (특히 Safari iOS)
2. 코스 진행 시 stop 별 카메라 이동 확인
3. 마커 / 라벨 / focus 효과 확인

### Phase D (정리 — 0.5일)
1. ThreeMap 관련 코드 + 정적 자산 일괄 삭제
2. `three` npm 의존성 제거
3. 번들 크기 측정 (예상: ~600KB gzipped 감소)
4. `package.json` 정리

총 2~3일 작업.

---

## 7. 리스크

| 리스크 | 영향 | 완화 |
|---|---|---|
| 한국 외곽 (서울 외) Photorealistic 커버리지 부재 | 외곽 검색 시 일반 위성 이미지로 fallback | 서비스가 서울 한정이라 큰 문제 X |
| Map3DElement Safari iOS 호환성 | 일부 사용자 못 봄 | feature detection + 자동 2D 폴백 |
| 비용 폭증 (예상 외 트래픽) | 청구서 surprise | Google Cloud 빌링 알림 + 일/월 quota 제한 |
| API key 노출 (FE bundle) | 외부 abuse | HTTP referrer / domain 제한 (기존 Maps key 와 동일 정책) |
| 신 기술 — Google 측 API 변경 | breaking change | 라이브러리 wrapper(`@googlemaps/extended-component-library`) 사용해서 흡수 |

---

## 8. 결정 필요한 항목 (사용자/BE 협의)

- [ ] **GCP 프로젝트의 Map Tiles API 활성화 가능한가?** (관리자 권한)
- [ ] **빌링 예산 정책** — 월 한도 얼마로 잡을지
- [ ] **API key 분리** — 기존 key 에 Map Tiles 추가 vs 새 key 발급
- [ ] **iOS Safari 폴백 정책** — 호환 안 되는 환경에서 어떻게 할지 (2D 만 보이게 / 안내 메시지 / 기존 Three.js 유지)
- [ ] **점진 도입 (feature flag) vs 한 번에 교체** — 안전 vs 코드 정리

---

## 9. 즉시 PoC 가능

위 결정 사항 컨펌 전이라도, **별도 브랜치에서 PoC** 정도는 가능:
- `Google3DMap.tsx` 신규 작성 (기존 ThreeMap 안 건드림)
- MapPanel 에 feature flag `?map3d=google` 같은 URL param 으로 토글
- 빠르게 시각 품질/성능 확인 후 본격 마이그레이션 결정

PoC 진행할까요?

---

## 10. 비용 추정 (참고)

- Photorealistic 3D Tiles 가격 (2025 기준): **$5 / 1000 sessions** (한 session = 30분 사용자 활동 윈도우)
- 무료 크레딧: 월 $200 → 약 40,000 session/월 무료
- 사용자 100명/일, 평균 1 session = 월 3,000 session → 무료 한도 충분
- 사용자 1000명/일, 평균 2 session = 월 60,000 session → 월 $100 정도

서비스 초기에는 무료 한도 안에서 운영 가능.

---

## 11. 다음 액션

1. **사용자**: 위 결정 항목 8번 확인 + 빌링 정책 결정
2. **BE/관리자**: GCP 콘솔에서 Map Tiles API 활성화
3. **FE**: PoC 브랜치에서 `Google3DMap.tsx` 작성 → 시각 확인 → 본격 마이그레이션 진행
