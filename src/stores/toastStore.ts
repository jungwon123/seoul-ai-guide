// 미니 토스트 시스템 — zustand 큐 + 자동 dismiss.
// Portal 렌더링은 src/components/ui/Toaster.tsx.

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export type ToastVariant = 'info' | 'success' | 'error';

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

interface ToastStore {
  toasts: Toast[];
  push: (message: string, opts?: { variant?: ToastVariant; durationMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, opts) => {
    const id = uuid();
    const toast: Toast = {
      id,
      message,
      variant: opts?.variant ?? 'info',
      durationMs: opts?.durationMs ?? 4000,
    };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (toast.durationMs > 0) {
      window.setTimeout(() => {
        useToastStore.getState().dismiss(id);
      }, toast.durationMs);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

// 외부에서 store import 없이 호출할 수 있는 단축 함수.
export const toast = {
  info: (msg: string, ms?: number) => useToastStore.getState().push(msg, { variant: 'info', durationMs: ms }),
  success: (msg: string, ms?: number) => useToastStore.getState().push(msg, { variant: 'success', durationMs: ms }),
  error: (msg: string, ms?: number) => useToastStore.getState().push(msg, { variant: 'error', durationMs: ms }),
};
