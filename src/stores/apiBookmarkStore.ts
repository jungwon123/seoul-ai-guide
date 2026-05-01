// 백엔드 연동 북마크 스토어 — 낙관적 업데이트 + 서버 동기화.
// 기존 bookmarkStore (localStorage)와 분리. 점진 전환 가능.

import { create } from 'zustand';
import { bookmarksApi } from '@/lib/api';
import type { BookmarkItem, PinType } from '@/types/api';

interface ApiBookmarkStore {
  items: BookmarkItem[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: (filter?: { thread_id?: string; pin_type?: PinType }) => Promise<void>;
  add: (input: { thread_id: string; message_id: string | number; pin_type: PinType; preview_text?: string }) => Promise<void>;
  remove: (bookmark_id: string) => Promise<void>;
  isBookmarked: (message_id: string | number, thread_id: string) => boolean;
  findByMessage: (message_id: string | number, thread_id: string) => BookmarkItem | undefined;
}

export const useApiBookmarkStore = create<ApiBookmarkStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  loaded: false,

  load: async (filter) => {
    set({ loading: true, error: null });
    try {
      const res = await bookmarksApi.list({ ...filter, limit: 100 });
      set({ items: res.items, loading: false, loaded: true });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  add: async (input) => {
    // 낙관적 추가
    const tempId = `temp-${Date.now()}`;
    const optimistic: BookmarkItem = {
      bookmark_id: tempId,
      thread_id: input.thread_id,
      thread_title: null,
      message_id: String(input.message_id),
      pin_type: input.pin_type,
      preview_text: input.preview_text ?? null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ items: [optimistic, ...s.items] }));
    try {
      const res = await bookmarksApi.create({
        thread_id: input.thread_id,
        message_id: input.message_id,
        pin_type: input.pin_type,
        preview_text: input.preview_text,
      });
      // 임시 → 실제 ID로 교체
      set((s) => ({
        items: s.items.map((b) =>
          b.bookmark_id === tempId
            ? { ...b, bookmark_id: res.bookmark_id, created_at: res.created_at }
            : b,
        ),
      }));
    } catch (e) {
      // 롤백
      set((s) => ({
        items: s.items.filter((b) => b.bookmark_id !== tempId),
        error: (e as Error).message,
      }));
      throw e;
    }
  },

  remove: async (bookmark_id) => {
    const prev = get().items;
    set({ items: prev.filter((b) => b.bookmark_id !== bookmark_id) });
    try {
      await bookmarksApi.delete(bookmark_id);
    } catch (e) {
      set({ items: prev, error: (e as Error).message });
      throw e;
    }
  },

  isBookmarked: (message_id, thread_id) => {
    const mid = String(message_id);
    return get().items.some((b) => b.message_id === mid && b.thread_id === thread_id);
  },

  findByMessage: (message_id, thread_id) => {
    const mid = String(message_id);
    return get().items.find((b) => b.message_id === mid && b.thread_id === thread_id);
  },
}));
