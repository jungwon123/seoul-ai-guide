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
      if (matched) return { ...matched, category };
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
      mapCenter: places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : SEOUL_CENTER,
    }),

  setRoute: (route) => set({ route }),

  selectPlace: (place) =>
    set({
      selectedPlace: place,
      // 카드 클릭 시 지도 중심을 해당 장소로 이동.
      mapCenter: place ? { lat: place.lat, lng: place.lng } : SEOUL_CENTER,
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
    const place = allPlaces.find((p) => p.id === stop.placeId) ?? null;
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
