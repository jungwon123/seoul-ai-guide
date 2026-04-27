import { create } from 'zustand';
import type { Place, MessageBookmarkItem, MessageSnapshot } from '@/types';
import placesData from '@/mocks/places.json';

const allPlaces = placesData as Place[];

const PLACE_STORAGE_KEY = 'seoul-ai-bookmarks';
const MSG_STORAGE_KEY = 'seoul-ai-message-bookmarks';
const DEFAULT_PLACE_IDS = ['place-001', 'place-002', 'place-003', 'place-004'];

function loadPlaceIds(): string[] {
  try {
    const raw = localStorage.getItem(PLACE_STORAGE_KEY);
    if (!raw) return DEFAULT_PLACE_IDS;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : DEFAULT_PLACE_IDS;
  } catch {
    return DEFAULT_PLACE_IDS;
  }
}

function loadMessageItems(): MessageBookmarkItem[] {
  try {
    const raw = localStorage.getItem(MSG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MessageBookmarkItem[]) : [];
  } catch {
    return [];
  }
}

function savePlaceIds(ids: string[]) {
  try {
    localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

function saveMessageItems(items: MessageBookmarkItem[]) {
  try {
    localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

interface ToggleMessageInput {
  messageId: string;
  conversationId: string;
  snapshot: MessageSnapshot;
}

interface BookmarkStore {
  // Place bookmarks (existing API, preserved)
  bookmarkedIds: string[];
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  getBookmarkedPlaces: () => Place[];

  // Message bookmarks (new)
  messageItems: MessageBookmarkItem[];
  toggleMessage: (input: ToggleMessageInput) => void;
  removeMessage: (messageId: string) => void;
  isMessageBookmarked: (messageId: string) => boolean;
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarkedIds: typeof window !== 'undefined' ? loadPlaceIds() : DEFAULT_PLACE_IDS,
  messageItems: typeof window !== 'undefined' ? loadMessageItems() : [],

  toggle: (id) => {
    const { bookmarkedIds } = get();
    const next = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter((x) => x !== id)
      : [...bookmarkedIds, id];
    savePlaceIds(next);
    set({ bookmarkedIds: next });
  },

  add: (id) => {
    const { bookmarkedIds } = get();
    if (bookmarkedIds.includes(id)) return;
    const next = [...bookmarkedIds, id];
    savePlaceIds(next);
    set({ bookmarkedIds: next });
  },

  remove: (id) => {
    const next = get().bookmarkedIds.filter((x) => x !== id);
    savePlaceIds(next);
    set({ bookmarkedIds: next });
  },

  isBookmarked: (id) => get().bookmarkedIds.includes(id),

  getBookmarkedPlaces: () =>
    get()
      .bookmarkedIds.map((id) => allPlaces.find((p) => p.id === id))
      .filter((p): p is Place => p !== undefined),

  toggleMessage: ({ messageId, conversationId, snapshot }) => {
    const { messageItems } = get();
    const exists = messageItems.some((m) => m.messageId === messageId);
    const next = exists
      ? messageItems.filter((m) => m.messageId !== messageId)
      : [
          {
            bookmarkId: `mb_${messageId}`,
            messageId,
            conversationId,
            snapshot,
            createdAt: new Date().toISOString(),
          },
          ...messageItems,
        ];
    saveMessageItems(next);
    set({ messageItems: next });
  },

  removeMessage: (messageId) => {
    const next = get().messageItems.filter((m) => m.messageId !== messageId);
    saveMessageItems(next);
    set({ messageItems: next });
  },

  isMessageBookmarked: (messageId) =>
    get().messageItems.some((m) => m.messageId === messageId),
}));
