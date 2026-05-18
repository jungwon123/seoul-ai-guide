import { create } from 'zustand';
import type { Place, MessageBookmarkItem, MessageSnapshot } from '@/types';
import type { BookmarkItem, PinType, PlaceBookmarkItem } from '@/types/api';
import { bookmarksApi, placeBookmarksApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';
import placesData from '@/mocks/places.json';

const allPlaces = placesData as Place[];

const PLACE_STORAGE_KEY = 'seoul-ai-bookmarks';
const PLACE_SNAPSHOT_STORAGE_KEY = 'seoul-ai-bookmark-snapshots';
const PLACE_BOOKMARK_ID_KEY = 'seoul-ai-place-bookmark-ids';
const MSG_STORAGE_KEY = 'seoul-ai-message-bookmarks';
// prod에선 빈 상태로 시작. dev에선 mock 4개 시드해서 UI 검수 편의.
const DEFAULT_PLACE_IDS: string[] = import.meta.env.DEV
  ? ['place-001', 'place-002', 'place-003', 'place-004']
  : [];

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

// place_id → BE bookmark_id 매핑. DELETE 호출 시 필요.
function loadPlaceBookmarkIds(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PLACE_BOOKMARK_ID_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, number>;
    return {};
  } catch {
    return {};
  }
}

function savePlaceBookmarkIds(map: Record<string, number>) {
  try {
    localStorage.setItem(PLACE_BOOKMARK_ID_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

function placeToCreateRequest(place: Place) {
  return {
    place_id: place.id,
    name: place.name,
    category: place.category ?? null,
    address: place.address || null,
    lat: typeof place.lat === 'number' && place.lat !== 0 ? place.lat : null,
    lng: typeof place.lng === 'number' && place.lng !== 0 ? place.lng : null,
    rating: typeof place.rating === 'number' && place.rating > 0 ? place.rating : null,
    image_url: place.image ?? null,
    summary: place.summary || null,
  };
}

function placeBookmarkItemToPlace(item: PlaceBookmarkItem): Place {
  return {
    id: item.place_id,
    name: item.name,
    // BE 카테고리가 임의 문자열이라 안전한 fallback.
    category: (item.category as Place['category']) ?? 'tourism',
    address: item.address ?? '',
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    hours: '',
    rating: item.rating ?? 0,
    summary: item.summary ?? '',
    image: item.image_url ?? undefined,
  };
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
  // Place bookmarks — BE PR #80 동기화 (optimistic + offline localStorage 캐시).
  bookmarkedIds: string[];
  // SSE-driven 장소(places.json에 없는)도 카드에 노출되도록 스냅샷 보관.
  placeSnapshots: Record<string, Place>;
  // place_id → BE bookmark_id. DELETE 호출에 필요. 매핑 없으면 BE 호출 skip.
  placeBookmarkIds: Record<string, number>;
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
  placeBookmarkIds: typeof window !== 'undefined' ? loadPlaceBookmarkIds() : {},
  messageItems: typeof window !== 'undefined' ? loadMessageItems() : [],
  messageBookmarksLoading: false,
  messageBookmarksError: null,

  toggle: (input) => {
    const place = typeof input === 'string' ? null : input;
    const id = place ? place.id : input as string;
    const { bookmarkedIds, placeSnapshots, placeBookmarkIds } = get();
    const isAdded = !bookmarkedIds.includes(id);

    // Optimistic 로컬 업데이트.
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

    // BE 동기화 — 실패해도 다음 loadFromServer에서 진실 복원.
    if (isAdded) {
      // 추가: snapshot이 있으면 BE에 보내고 bookmark_id 회수.
      const snap = place ?? placeSnapshots[id];
      if (!snap) return; // 정보 부족 — BE 호출 skip.
      placeBookmarksApi
        .create(placeToCreateRequest(snap))
        .then((res) => {
          const updated = { ...get().placeBookmarkIds, [id]: res.bookmark_id };
          savePlaceBookmarkIds(updated);
          set({ placeBookmarkIds: updated });
        })
        .catch(() => { /* silent — 다음 loadFromServer 복원 */ });
    } else {
      // 삭제: 매핑이 있을 때만 BE DELETE.
      const bookmarkId = placeBookmarkIds[id];
      if (bookmarkId == null) return;
      const nextMap = { ...placeBookmarkIds };
      delete nextMap[id];
      savePlaceBookmarkIds(nextMap);
      set({ placeBookmarkIds: nextMap });
      placeBookmarksApi.delete(bookmarkId).catch(() => { /* silent */ });
    }
  },

  add: (id) => {
    const { bookmarkedIds, placeSnapshots } = get();
    if (bookmarkedIds.includes(id)) return;
    const next = [...bookmarkedIds, id];
    savePlaceIds(next);
    set({ bookmarkedIds: next });
    // BE 동기화 — snapshot이 있는 경우만 정확한 정보 전송 가능.
    const snap = placeSnapshots[id];
    if (snap) {
      placeBookmarksApi
        .create(placeToCreateRequest(snap))
        .then((res) => {
          const updated = { ...get().placeBookmarkIds, [id]: res.bookmark_id };
          savePlaceBookmarkIds(updated);
          set({ placeBookmarkIds: updated });
        })
        .catch(() => { /* silent */ });
    }
  },

  remove: (id) => {
    const { bookmarkedIds, placeSnapshots, placeBookmarkIds } = get();
    const next = bookmarkedIds.filter((x) => x !== id);
    const nextSnapshots = { ...placeSnapshots };
    delete nextSnapshots[id];
    savePlaceIds(next);
    savePlaceSnapshots(nextSnapshots);
    set({ bookmarkedIds: next, placeSnapshots: nextSnapshots });

    const bookmarkId = placeBookmarkIds[id];
    if (bookmarkId == null) return;
    const nextMap = { ...placeBookmarkIds };
    delete nextMap[id];
    savePlaceBookmarkIds(nextMap);
    set({ placeBookmarkIds: nextMap });
    placeBookmarksApi.delete(bookmarkId).catch(() => { /* silent */ });
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
    // 두 종류 북마크(메시지 + 장소) 병렬 fetch.
    const [msgRes, placeRes] = await Promise.allSettled([
      bookmarksApi.list({ limit: 100 }),
      placeBookmarksApi.list({ limit: 100 }),
    ]);

    if (msgRes.status === 'fulfilled') {
      const items = msgRes.value.items.map(bookmarkItemToMessage);
      saveMessageItems(items);
      set({ messageItems: items });
    }

    if (placeRes.status === 'fulfilled') {
      // BE = 진실. localStorage 캐시를 덮어쓴다.
      const items = placeRes.value.items;
      const ids = items.map((it) => it.place_id);
      const snapshots: Record<string, Place> = {};
      const idMap: Record<string, number> = {};
      for (const it of items) {
        snapshots[it.place_id] = placeBookmarkItemToPlace(it);
        idMap[it.place_id] = it.bookmark_id;
      }
      savePlaceIds(ids);
      savePlaceSnapshots(snapshots);
      savePlaceBookmarkIds(idMap);
      set({ bookmarkedIds: ids, placeSnapshots: snapshots, placeBookmarkIds: idMap });
    }

    if (msgRes.status === 'rejected') {
      set({
        messageBookmarksLoading: false,
        messageBookmarksError: friendlyApiError(
          msgRes.reason,
          '북마크를 불러올 수 없습니다',
        ),
      });
    } else {
      set({ messageBookmarksLoading: false });
    }
  },
}));
