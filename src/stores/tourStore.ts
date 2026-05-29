import { create } from 'zustand';
import { TOUR_STEPS } from '@/lib/tour-steps';

// 기능 안내 투어 상태. 첫 진입 시 자동 1회, 헤더 도움말(?) 버튼으로 재실행.
const STORAGE_KEY = 'seoul-ai-guide-tour-done';

function tourDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore (프라이빗 모드 등) */
  }
}

interface TourStore {
  active: boolean;
  stepIndex: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  /** 첫 진입에서 아직 본 적 없으면 자동 시작. */
  maybeAutoStart: () => void;
}

export const useTourStore = create<TourStore>((set, get) => ({
  active: false,
  stepIndex: 0,

  start: () => set({ active: true, stepIndex: 0 }),

  next: () => {
    const { stepIndex } = get();
    if (stepIndex >= TOUR_STEPS.length - 1) {
      markDone();
      set({ active: false, stepIndex: 0 });
    } else {
      set({ stepIndex: stepIndex + 1 });
    }
  },

  prev: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

  skip: () => {
    markDone();
    set({ active: false, stepIndex: 0 });
  },

  maybeAutoStart: () => {
    if (!tourDone()) set({ active: true, stepIndex: 0 });
  },
}));
