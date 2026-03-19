import { create } from 'zustand';
import type { CalendarEvent, Itinerary } from '@/types';

interface CalendarStore {
  events: CalendarEvent[];
  selectedDate: string;

  addEvent: (itinerary: Itinerary) => void;
  removeEvent: (id: string) => void;
  setSelectedDate: (date: string) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  events: [],
  selectedDate: new Date().toISOString().split('T')[0],

  addEvent: (itinerary) => {
    const event: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: itinerary.title,
      date: itinerary.date,
      stops: itinerary.stops,
      createdAt: new Date().toISOString(),
      source: 'agent',
    };
    set((state) => ({ events: [...state.events, event] }));
  },

  removeEvent: (id) =>
    set((state) => ({ events: state.events.filter((e) => e.id !== id) })),

  setSelectedDate: (date) => set({ selectedDate: date }),
}));
