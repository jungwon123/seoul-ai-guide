// 토스트 렌더러 — Portal로 fixed 우상단에 stack.
// DESIGN.md 톤: 크림 배경, 따뜻한 그림자, 네온 금지.

import { useEffect, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore, type ToastVariant } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: ReactElement }> = {
  info: {
    bg: 'bg-bg-surface',
    border: 'border-border',
    icon: <Info size={16} className="text-text-secondary" />,
  },
  success: {
    bg: 'bg-bg-surface',
    border: 'border-border',
    icon: <CheckCircle2 size={16} className="text-[#6B8E5A]" />,
  },
  error: {
    bg: 'bg-brand-subtle',
    border: 'border-brand',
    icon: <AlertCircle size={16} className="text-brand" />,
  },
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('toaster-root')) {
      const root = document.createElement('div');
      root.id = 'toaster-root';
      document.body.appendChild(root);
    }
  }, []);

  if (typeof document === 'undefined') return null;
  const target = document.getElementById('toaster-root');
  if (!target) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-[360px]">
      {toasts.map((t) => {
        const v = VARIANT_STYLES[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-[2px_2px_0_rgba(15,15,15,0.9)] pointer-events-auto animate-message',
              v.bg,
              v.border,
            )}
          >
            <div className="mt-0.5 shrink-0">{v.icon}</div>
            <p className="flex-1 text-[13px] leading-snug text-text-primary">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-overlay transition-colors shrink-0"
              aria-label="닫기"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>,
    target,
  );
}
