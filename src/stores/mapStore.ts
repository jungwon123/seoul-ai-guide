import { create } from 'zustand';
import type { Place, RoutePoint, Itinerary } from '@/types';
import placesData from '@/mocks/places.json';

const allPlaces = placesData as Place[];

export interface NavigationState {
  itinerary: Itinerary;
  stopIndex: number;
  isPlaying: boolean;
}

interface MapStore {
  markers: Place[];
  route: RoutePoint[];
  selectedPlace: Place | null;
  mapCenter: { lat: number; lng: number };

  // Navigation
  navigation: NavigationState | null;

  setMarkers: (places: Place[]) => void;
  setRoute: (route: RoutePoint[]) => void;
  selectPlace: (place: Place | null) => void;
  clearMap: () => void;

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
  // 1순위: places.json 매칭 (레거시 mock 일정).
  // 2순위: SSE-driven 일정 — stop 자체 필드(lat/lng/imageUrl 등)로 Place 합성.
  return itinerary.stops
    .map((stop): Place | null => {
      const matched = allPlaces.find((p) => p.id === stop.placeId);
      if (matched) return matched;
      if (stop.lat == null || stop.lng == null) return null;
      return {
        id: stop.placeId,
        name: stop.placeName,
        category: stop.category ?? 'tourism',
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

  setMarkers: (places) =>
    set({
      markers: places,
      mapCenter: places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : SEOUL_CENTER,
    }),

  setRoute: (route) => set({ route }),

  selectPlace: (place) => set({ selectedPlace: place }),

  clearMap: () => set({ markers: [], route: [], selectedPlace: null, mapCenter: SEOUL_CENTER }),

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
