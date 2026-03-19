import { create } from 'zustand';
import type { Place, RoutePoint } from '@/types';

interface MapStore {
  markers: Place[];
  route: RoutePoint[];
  selectedPlace: Place | null;
  mapCenter: { lat: number; lng: number };

  setMarkers: (places: Place[]) => void;
  setRoute: (route: RoutePoint[]) => void;
  selectPlace: (place: Place | null) => void;
  clearMap: () => void;
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

export const useMapStore = create<MapStore>((set) => ({
  markers: [],
  route: [],
  selectedPlace: null,
  mapCenter: SEOUL_CENTER,

  setMarkers: (places) =>
    set({
      markers: places,
      mapCenter: places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : SEOUL_CENTER,
    }),

  setRoute: (route) => set({ route }),

  selectPlace: (place) => set({ selectedPlace: place }),

  clearMap: () => set({ markers: [], route: [], selectedPlace: null, mapCenter: SEOUL_CENTER }),
}));
