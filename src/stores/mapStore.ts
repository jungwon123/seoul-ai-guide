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
  return itinerary.stops
    .map((stop) => allPlaces.find((p) => p.id === stop.placeId))
    .filter((p): p is Place => p !== undefined);
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
