import { create } from 'zustand';
import type { Place, RoutePoint, Itinerary } from '@/types';
import { deriveStopCategory } from '@/lib/stop-category';
import placesData from '@/mocks/places.json';

const allPlaces = placesData as Place[];

export interface NavigationState {
  itinerary: Itinerary;
  stopIndex: number;
  isPlaying: boolean;
}

// lat/lng → viewport pixel 좌표 변환기. GoogleMap 이 마운트 시 등록, 언마운트 시 null.
// PlaceCard → 마커 FLIP 애니메이션이 이 함수를 통해 대상 좌표를 알아낸다.
export type MapProjector = (lat: number, lng: number) => { x: number; y: number } | null;

interface MapStore {
  markers: Place[];
  route: RoutePoint[];
  selectedPlace: Place | null;
  mapCenter: { lat: number; lng: number };

  // Navigation
  navigation: NavigationState | null;

  // Projection (FLIP 용)
  projector: MapProjector | null;
  // 지도 컨테이너 DOM — FLIP 도착 fallback (마커가 화면 밖일 때 컨테이너 중심으로).
  mapContainerEl: HTMLElement | null;

  setMarkers: (places: Place[]) => void;
  setRoute: (route: RoutePoint[]) => void;
  selectPlace: (place: Place | null) => void;
  // 채팅 카드(장소/행사) 클릭 전용. 해당 메시지의 장소 목록 전체를 지도에 올리고
  // 그 중 하나를 선택. 코스 모드(navigation)는 해제해 장소 UI 로 전환한다.
  focusPlaces: (places: Place[], selected: Place) => void;
  clearMap: () => void;
  setProjector: (fn: MapProjector | null) => void;
  setMapContainerEl: (el: HTMLElement | null) => void;

  // Navigation actions
  startNavigation: (itinerary: Itinerary) => void;
  stopNavigation: () => void;
  goToStop: (index: number) => void;
  nextStop: () => void;
  prevStop: () => void;
  togglePlayPause: () => void;
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

function getPlacesForItinerary(itinerary: Itinerary): Place[] {
  // 마커용 Place 합성. 카테고리는 deriveStopCategory 로 통일된 우선순위 사용:
  //   stop.category(BE) → mock category → 'tourism'.
  // ItineraryCard/ItineraryStopsList 가 같은 helper 를 쓰므로 패널 간 일관성 보장.
  return itinerary.stops
    .map((stop): Place | null => {
      const category = deriveStopCategory(stop);
      const matched = allPlaces.find((p) => p.id === stop.placeId);
      // 혼잡도는 BE stop 값을 우선, 없으면 mock 매칭값 사용 — 지도 마커 혼잡도 점 표시용.
      if (matched) return { ...matched, category, congestion: stop.congestion ?? matched.congestion };
      if (stop.lat == null || stop.lng == null) return null;
      return {
        id: stop.placeId,
        name: stop.placeName,
        category,
        address: stop.address ?? '',
        lat: stop.lat,
        lng: stop.lng,
        hours: '',
        rating: 0,
        summary: '',
        image: stop.imageUrl,
        congestion: stop.congestion,
      };
    })
    .filter((p): p is Place => p !== null);
}

export const useMapStore = create<MapStore>((set, get) => ({
  markers: [],
  route: [],
  selectedPlace: null,
  mapCenter: SEOUL_CENTER,
  navigation: null,
  projector: null,
  mapContainerEl: null,

  setMarkers: (places) =>
    set({
      markers: places,
      // 새 장소 추천이 도착하면 직전 코스(navigation) 모드를 해제한다.
      // 안 그러면 지도를 열 때 직전에 본 코스(예: 홍대)가 계속 떠 있는다 —
      // navigation 은 markers 와 별개라 핀만 바뀌고 코스 패널은 그대로 남기 때문.
      navigation: null,
      selectedPlace: null,
      mapCenter: places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : SEOUL_CENTER,
    }),

  setRoute: (route) => set({ route }),

  selectPlace: (place) =>
    set({
      selectedPlace: place,
      // 카드 클릭 시 지도 중심을 해당 장소로 이동.
      mapCenter: place ? { lat: place.lat, lng: place.lng } : SEOUL_CENTER,
    }),

  focusPlaces: (places, selected) =>
    set({
      markers: places,
      selectedPlace: selected,
      // 장소/행사 카드를 누르면 더 이상 코스(경로) 모드가 아니다 — 이전 코스 패널이
      // 남아 마지막 코스가 표시되던 버그(클릭한 카드와 무관하게 항상 마지막 코스) 차단.
      navigation: null,
      mapCenter: { lat: selected.lat, lng: selected.lng },
    }),

  clearMap: () => set({ markers: [], route: [], selectedPlace: null, mapCenter: SEOUL_CENTER }),

  setProjector: (fn) => set({ projector: fn }),

  setMapContainerEl: (el) => set({ mapContainerEl: el }),

  startNavigation: (itinerary) => {
    const places = getPlacesForItinerary(itinerary);
    const firstPlace = places[0];
    set({
      navigation: { itinerary, stopIndex: 0, isPlaying: false },
      markers: places,
      mapCenter: firstPlace
        ? { lat: firstPlace.lat, lng: firstPlace.lng }
        : SEOUL_CENTER,
      selectedPlace: firstPlace ?? null,
    });
  },

  stopNavigation: () => set({ navigation: null }),

  goToStop: (index) => {
    const { navigation } = get();
    if (!navigation) return;
    const maxIdx = navigation.itinerary.stops.length - 1;
    const clamped = Math.max(0, Math.min(index, maxIdx));
    const stop = navigation.itinerary.stops[clamped];
    // 지도에 실제로 올라간 마커(코스 합성 Place)에서 먼저 찾는다. mock 미매칭 BE 코스도
    // 마커는 존재하므로 selectedPlace 가 항상 잡혀 사이드바 클릭 시 마커 강조가 동작한다.
    const place =
      get().markers.find((p) => p.id === stop.placeId) ??
      allPlaces.find((p) => p.id === stop.placeId) ??
      null;
    set({
      navigation: { ...navigation, stopIndex: clamped },
      selectedPlace: place,
      mapCenter: place ? { lat: place.lat, lng: place.lng } : get().mapCenter,
    });
  },

  nextStop: () => {
    const { navigation, goToStop } = get();
    if (navigation) goToStop(navigation.stopIndex + 1);
  },

  prevStop: () => {
    const { navigation, goToStop } = get();
    if (navigation) goToStop(navigation.stopIndex - 1);
  },

  togglePlayPause: () => {
    const { navigation } = get();
    if (!navigation) return;
    set({ navigation: { ...navigation, isPlaying: !navigation.isPlaying } });
  },
}));
