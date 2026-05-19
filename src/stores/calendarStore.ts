import { create } from 'zustand';
import type { CalendarEventItem } from '@/types/api';
import { calendarApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';

// 일정 탭 — Google Calendar 직조회 결과 보관. BE Phase 1 (PR 캘린더).
// 우리 DB 미저장. 새로고침/다른 기기/외부 수정 모두 Google 이 source of truth.

interface CalendarStore {
  events: CalendarEventItem[];
  loading: boolean;
  error: string | null;
  // BE 403 (google_calendar_not_connected) — FE 가 연동 CTA 강조용으로 사용.
  notConnected: boolean;

  loadFromServer: () => Promise<void>;
  removeEvent: (event_id: string) => Promise<void>;
}

// BE 403 body { "detail": "google_calendar_not_connected" } → ApiHttpError 의
// status=403, message="google_calendar_not_connected" 로 변환되어 throw.
function isNotConnectedError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const anyE = e as { status?: number; message?: string };
  return anyE.status === 403 && anyE.message === 'google_calendar_not_connected';
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  loading: false,
  error: null,
  notConnected: false,

  loadFromServer: async () => {
    set({ loading: true, error: null });
    try {
      const res = await calendarApi.listEvents({ limit: 50 });
      set({ events: res.items, loading: false, notConnected: false });
    } catch (e) {
      if (isNotConnectedError(e)) {
        // 미연동은 정상 상태 — error 가 아니라 notConnected 플래그로 분리.
        set({ events: [], loading: false, notConnected: true, error: null });
        return;
      }
      set({
        loading: false,
        error: friendlyApiError(e, '일정을 불러올 수 없습니다'),
      });
    }
  },

  removeEvent: async (event_id) => {
    const prev = get().events;
    // Optimistic 제거.
    set({ events: prev.filter((e) => e.event_id !== event_id) });
    try {
      await calendarApi.deleteEvent(event_id);
    } catch {
      // 롤백 — BE 실패 시 다음 loadFromServer 에서 진실 복원되지만 즉시 되돌림.
      set({ events: prev });
    }
  },
}));
