import { create } from 'zustand';
import type { Place, MessageBookmarkItem, MessageSnapshot } from '@/types';
import type { BookmarkItem, PinType } from '@/types/api';
import { bookmarksApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';
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

// snapshot 내용으로 BE의 pin_type 추정. 명시적 종류가 없으면 'general'.
function pinTypeFromSnapshot(s: MessageSnapshot): PinType {
  if (s.itinerary) return 'course';
  if (s.places && s.places.length > 0) return 'place';
  return 'general';
}

// BE 응답엔 snapshot이 없으므로 preview_text를 본문으로 재구성.
function bookmarkItemToMessage(item: BookmarkItem): MessageBookmarkItem {
  return {
    bookmarkId: String(item.bookmark_id),
    messageId: String(item.message_id),
    conversationId: item.thread_id,
    pinType: item.pin_type,
    snapshot: {
      role: 'assistant',
      createdAt: item.created_at,
      content: item.preview_text ?? '',
    },
    createdAt: item.created_at,
  };
}

// 로컬 추가 시 BE 호출 전 임시로 부여하는 ID prefix. 동기화 후 BE id로 교체됨.
const TEMP_BOOKMARK_PREFIX = 'temp-mb-';
const isTempBookmark = (id: string): boolean => id.startsWith(TEMP_BOOKMARK_PREFIX);

interface BookmarkStore {
  // Place bookmarks (localStorage only — phase 3에선 BE 통합 보류)
  bookmarkedIds: string[];
  // SSE-driven 장소(places.json에 없는)도 카드에 노출되도록 스냅샷 보관.
  placeSnapshots: Record<string, Place>;
  // toggle에 Place를 넘기면 스냅샷 같이 저장 (권장). string 단독 호출은 레거시 호환.
  toggle: (input: string | Place) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  getBookmarkedPlaces: () => Place[];

  // Message bookmarks (BE 동기화)
  messageItems: MessageBookmarkItem[];
  // loadFromServer 4상태 UI용 — messageItems가 비어있을 때만 의미.
  messageBookmarksLoading: boolean;
  messageBookmarksError: string | null;
  toggleMessage: (input: ToggleMessageInput) => Promise<void>;
  removeMessage: (messageId: string) => Promise<void>;
  isMessageBookmarked: (messageId: string) => boolean;
  // BE에서 메시지 북마크 목록 동기화. 비로그인/실패 시 messageBookmarksError에 메시지.
  loadFromServer: () => Promise<void>;
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
  messageBookmarksLoading: false,
  messageBookmarksError: null,

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

  toggleMessage: async ({ messageId, conversationId, snapshot }) => {
    const { messageItems } = get();
    const existing = messageItems.find((m) => m.messageId === messageId);

    if (existing) {
      // 이미 북마크돼 있음 → 해제. removeMessage가 BE delete까지 처리.
      await get().removeMessage(messageId);
      return;
    }

    // Optimistic 추가 — BE 응답 오기 전 임시 ID로 표시.
    const tempId = `${TEMP_BOOKMARK_PREFIX}${messageId}-${Date.now()}`;
    const optimistic: MessageBookmarkItem = {
      bookmarkId: tempId,
      messageId,
      conversationId,
      pinType: pinTypeFromSnapshot(snapshot),
      snapshot,
      createdAt: new Date().toISOString(),
    };
    const optimisticItems = [optimistic, ...messageItems];
    saveMessageItems(optimisticItems);
    set({ messageItems: optimisticItems });

    try {
      const res = await bookmarksApi.create({
        thread_id: conversationId,
        message_id: messageId,
        pin_type: pinTypeFromSnapshot(snapshot),
        preview_text: snapshot.content?.slice(0, 200) || undefined,
      });
      // BE id로 교체
      const updated = get().messageItems.map((m) =>
        m.bookmarkId === tempId
          ? { ...m, bookmarkId: String(res.bookmark_id), createdAt: res.created_at }
          : m,
      );
      saveMessageItems(updated);
      set({ messageItems: updated });
    } catch {
      // 롤백 — 비로그인이거나 BE 실패. 로컬에서도 제거.
      const rolled = get().messageItems.filter((m) => m.bookmarkId !== tempId);
      saveMessageItems(rolled);
      set({ messageItems: rolled });
    }
  },

  removeMessage: async (messageId) => {
    const target = get().messageItems.find((m) => m.messageId === messageId);
    // Optimistic 제거 — UI는 즉시 반응. BE는 백그라운드 호출.
    const next = get().messageItems.filter((m) => m.messageId !== messageId);
    saveMessageItems(next);
    set({ messageItems: next });

    if (!target) return;
    // 아직 BE에 만들어지지 않은 임시 항목이면 BE 호출 스킵.
    if (isTempBookmark(target.bookmarkId)) return;
    try {
      await bookmarksApi.delete(target.bookmarkId);
    } catch {
      // silent — 다음 loadFromServer에서 진실 복구.
    }
  },

  isMessageBookmarked: (messageId) =>
    get().messageItems.some((m) => m.messageId === messageId),

  loadFromServer: async () => {
    set({ messageBookmarksLoading: true, messageBookmarksError: null });
    try {
      const res = await bookmarksApi.list({ limit: 100 });
      const items = res.items.map(bookmarkItemToMessage);
      saveMessageItems(items);
      set({ messageItems: items, messageBookmarksLoading: false });
    } catch (e) {
      // 비로그인 / 네트워크 실패 — 로컬 유지하되 오류 메시지는 노출.
      set({
        messageBookmarksLoading: false,
        messageBookmarksError: friendlyApiError(e, '북마크를 불러올 수 없습니다'),
      });
    }
  },
}));
