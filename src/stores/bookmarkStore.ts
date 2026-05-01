import { create } from 'zustand';
import type { Place, MessageBookmarkItem, MessageSnapshot } from '@/types';
import placesData from '@/mocks/places.json';

const allPlaces = placesData as Place[];

const PLACE_STORAGE_KEY = 'seoul-ai-bookmarks';
const PLACE_SNAPSHOT_STORAGE_KEY = 'seoul-ai-bookmark-snapshots';
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

function loadPlaceSnapshots(): Record<string, Place> {
  try {
    const raw = localStorage.getItem(PLACE_SNAPSHOT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, Place>;
    return {};
  } catch {
    return {};
  }
}

function savePlaceSnapshots(snapshots: Record<string, Place>) {
  try {
    localStorage.setItem(PLACE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch { /* ignore */ }
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
  // Place bookmarks
  bookmarkedIds: string[];
  // SSE-driven 장소(places.json에 없는)도 카드에 노출되도록 스냅샷 보관.
  placeSnapshots: Record<string, Place>;
  // toggle에 Place를 넘기면 스냅샷 같이 저장 (권장). string 단독 호출은 레거시 호환.
  toggle: (input: string | Place) => void;
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

// 초기 ID 중 places.json에도 없고 snapshots에도 없으면 stale → 제거.
// (이전 버전에서 SSE 장소 ID만 저장된 경우 해당)
function purgeStaleIds(ids: string[], snapshots: Record<string, Place>): string[] {
  return ids.filter((id) => snapshots[id] || allPlaces.some((p) => p.id === id));
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarkedIds:
    typeof window !== 'undefined'
      ? purgeStaleIds(loadPlaceIds(), loadPlaceSnapshots())
      : DEFAULT_PLACE_IDS,
  placeSnapshots: typeof window !== 'undefined' ? loadPlaceSnapshots() : {},
  messageItems: typeof window !== 'undefined' ? loadMessageItems() : [],

  toggle: (input) => {
    const place = typeof input === 'string' ? null : input;
    const id = place ? place.id : input as string;
    const { bookmarkedIds, placeSnapshots } = get();
    const isAdded = !bookmarkedIds.includes(id);
    const nextIds = isAdded
      ? [...bookmarkedIds, id]
      : bookmarkedIds.filter((x) => x !== id);
    const nextSnapshots = { ...placeSnapshots };
    if (isAdded && place) {
      nextSnapshots[id] = place;
    } else if (!isAdded) {
      delete nextSnapshots[id];
    }
    savePlaceIds(nextIds);
    savePlaceSnapshots(nextSnapshots);
    set({ bookmarkedIds: nextIds, placeSnapshots: nextSnapshots });
  },

  add: (id) => {
    const { bookmarkedIds } = get();
    if (bookmarkedIds.includes(id)) return;
    const next = [...bookmarkedIds, id];
    savePlaceIds(next);
    set({ bookmarkedIds: next });
  },

  remove: (id) => {
    const { bookmarkedIds, placeSnapshots } = get();
    const next = bookmarkedIds.filter((x) => x !== id);
    const nextSnapshots = { ...placeSnapshots };
    delete nextSnapshots[id];
    savePlaceIds(next);
    savePlaceSnapshots(nextSnapshots);
    set({ bookmarkedIds: next, placeSnapshots: nextSnapshots });
  },

  isBookmarked: (id) => get().bookmarkedIds.includes(id),

  getBookmarkedPlaces: () => {
    const { bookmarkedIds, placeSnapshots } = get();
    return bookmarkedIds
      .map((id) => placeSnapshots[id] ?? allPlaces.find((p) => p.id === id))
      .filter((p): p is Place => p !== undefined);
  },

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
