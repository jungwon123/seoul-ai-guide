# BE 요청 — 혼잡도(congestion) 연동 보완

> FE/BE 혼잡도 연동을 코드 레벨로 점검한 결과 발견한 BE 측 요청 사항. (관련 이전 작업: `docs/be-requests.md` #3 "Places 블록 congestion")
> 작성: 2026-06-04 · 대상 repo: `Techeer-2026-1/LocalBiz-Seoul`

## TL;DR
- **장소(place/places) 혼잡도** — FE/BE 계약 일치, 정상. 단 데이터 적재 의존(#2).
- **코스(course) 혼잡도** — BE가 stop에 **구조적으로 안 보냄** → 항상 미표시. BE 주입 필요(#1).

---

## 1. Course(코스) stop에 congestion 주입 (🔴 BE 요청 필요)

**상태**: FE 사전 적용 완료 — BE 주입만 되면 코드 변경 없이 자동 활성화.

**증상**: 코스 추천 카드(일정 stop 목록)에 혼잡도 뱃지가 **전혀 표시되지 않음**. 장소 카드는 데이터가 있으면 정상 표시되는데 코스만 항상 빈값.

**원인**: #3(`be-requests.md`)에서 추가한 congestion 주입이 **places/place 블록에만** 적용되고, **CourseBlock에는 적용되지 않음**.
- `backend/src/models/blocks.py` — `CoursePlaceInfo`에 `congestion` 필드 자체가 없음 (PlaceBlock에는 있음).
- `backend/src/graph/course_plan_node.py` / `response_builder_node.py` — 코스 stop 생성 시 `fetch_congestion_by_district` 호출 없음.
- 즉 BE가 코스 stop에 혼잡도를 **구조적으로 보내지 않음** → FE가 받을 데이터가 없음.

**요청**:
1. `CoursePlaceInfo`(`blocks.py`)에 `congestion: Optional[CongestionInfo] = None` 추가 — PlaceBlock과 **동일 스키마** `{ level: "low"|"medium"|"high", updated_at: str, source: Optional[str] }`.
2. 코스 생성 노드(`course_plan_node.py`)에서 각 stop의 `place.district` 기준으로 `crowdedness_node.fetch_congestion_by_district(pool, district)`를 **병렬 호출**해 `stop.place.congestion`에 주입.
   - `place_recommend_node.py:731~748`의 기존 패턴(district 유니크 추출 → `asyncio.gather(return_exceptions=True)` → place 매핑) **그대로 재사용** 가능.
3. 실패/데이터 없음 시 기존과 동일하게 **graceful 생략**(None).

**FE 측 (사전 적용 완료, 추가 작업 불필요)**:
- `src/types/api.ts` — `CoursePlaceInfo.congestion?: CongestionBlockInfo`
- `src/types/index.ts` — `ItineraryStop.congestion?: Congestion`
- `src/stores/chatStore.ts` — `courseBlockToItinerary`에서 stop별 congestion 추출(snake→camel)
- 코스 카드(`ItineraryStopsList.tsx` 등) 혼잡도 뱃지 렌더 준비 완료

**우선순위**: 중

**확인 방법**: 주입 후 "강남 반나절 코스 짜줘" 등으로 코스 받아 stop 카드에 혼잡도 뱃지 표시 확인.

---

## 2. 장소 congestion 실데이터 누락 점검 (🟡 데이터/운영)

**상태**: 코드는 정상(#3). 배포 DB 데이터 적재 여부 확인 요청.

**증상**: 장소 카드 혼잡도 뱃지가 **표시될 때도 있고 안 될 때도 있음**(특히 시간대에 따라).

**원인 추정**: `fetch_congestion_by_district`(`backend/src/graph/crowdedness_node.py`)는 다음 경우 **조용히 None** 반환 → 혼잡도 생략:
1. district명 → `adm_dong_code` 해석 실패
2. **현재 시각(`time_slot = 현재 hour`)** + 최신 `base_date`의 `population_stats` row 없음
3. 30일 baseline `avg_pop == 0` (의도적 생략)
4. place에 `district` 필드 비어 있음

→ 배포 DB의 `population_stats` ETL이 **모든 시간대(time_slot 0~23)·최근 일자**로 적재돼 있지 않으면 특정 시간대에 혼잡도가 안 뜸.

**요청 (확인용)**:
- 배포 DB `population_stats`에 (a) 최신 `base_date`, (b) 현재 사용 시간대(`time_slot`) 행이 실제 존재하는지 점검.
- 디버깅 편의상 congestion 생략 시 어떤 조건(1~4)으로 생략됐는지 **debug 로그** 1줄 추가 권장(`logger.debug`).

**우선순위**: 중

---

## 참고 — FE/BE 혼잡도 계약 (일치 확인됨)

| 항목 | BE | FE | 일치 |
|---|---|---|---|
| 스키마 | `CongestionInfo {level, updated_at, source}` | `Congestion {level, updatedAt, source}` | ✅ (어댑터가 snake→camel) |
| level 값 | `"low"\|"medium"\|"high"` (`_LEVEL_MAP`) | `CONGESTION_CONFIG` 키 low/medium/high | ✅ |
| place/places 주입 | `place_search_node` / `place_recommend_node` | `chatStore` 어댑터 | ✅ |
| **course stop 주입** | **없음** | 추출 시도(빈값) | ❌ → 위 #1 |
