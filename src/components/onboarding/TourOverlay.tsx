import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTourStore } from '@/stores/tourStore';
import { TOUR_STEPS } from '@/lib/tour-steps';
import { cn } from '@/lib/utils';

// 스포트라이트 코치마크 오버레이.
// - 어두운 반투명 배경에 현재 대상 요소만 구멍(box-shadow spread)으로 강조.
// - 대상 옆에 설명 말풍선 + 진행도 + 이전/다음/건너뛰기.
// - 상단 탭 버튼 등 항상 떠 있는 chrome 요소만 대상으로 함.

const HOLE_PADDING = 8; // 구멍이 대상보다 살짝 크게
const GAP = 12; // 대상과 말풍선 간격

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function TourOverlay() {
  const active = useTourStore((s) => s.active);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const skip = useTourStore((s) => s.skip);

  const step = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // 대상 요소 측정 — 스텝 변경/리사이즈/스크롤 시 갱신.
  useLayoutEffect(() => {
    if (!active || !step) return;
    const measure = () => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, step]);

  // 말풍선 위치 계산 — 대상 rect + 말풍선 실측 크기 기준, 화면 경계 클램프.
  useLayoutEffect(() => {
    if (!active) return;
    const tipEl = tipRef.current;
    if (!tipEl) return;
    const tw = tipEl.offsetWidth;
    const th = tipEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      // 대상을 못 찾으면 화면 중앙에 설명만 표시.
      setTip({ top: vh / 2 - th / 2, left: vw / 2 - tw / 2 });
      return;
    }

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let top: number;
    let left: number;
    switch (step.placement) {
      case 'top':
        top = rect.top - GAP - th;
        left = cx - tw / 2;
        break;
      case 'left':
        top = cy - th / 2;
        left = rect.left - GAP - tw;
        break;
      case 'right':
        top = cy - th / 2;
        left = rect.right + GAP;
        break;
      case 'bottom':
      default:
        top = rect.bottom + GAP;
        left = cx - tw / 2;
        break;
    }
    left = Math.max(16, Math.min(left, vw - tw - 16));
    top = Math.max(16, Math.min(top, vh - th - 16));
    setTip({ top, left });
  }, [rect, step, active, stepIndex]);

  // Esc = 건너뛰기.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, skip]);

  if (!active || !step) return null;

  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const animate = !prefersReducedMotion();
  const motionTransition = animate
    ? 'top .3s cubic-bezier(0.32,0.72,0,1), left .3s cubic-bezier(0.32,0.72,0,1), width .3s cubic-bezier(0.32,0.72,0,1), height .3s cubic-bezier(0.32,0.72,0,1)'
    : undefined;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="기능 안내">
      {/* 클릭 차단 레이어 — 투어 중 앱 조작 방지(투명). */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* 스포트라이트 구멍 — box-shadow spread 로 주변을 어둡게. */}
      {rect && (
        <div
          aria-hidden="true"
          className="absolute rounded-2xl"
          style={{
            top: rect.top - HOLE_PADDING,
            left: rect.left - HOLE_PADDING,
            width: rect.width + HOLE_PADDING * 2,
            height: rect.height + HOLE_PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(20,16,10,0.72)',
            border: '2px solid var(--color-brand)',
            transition: motionTransition,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 설명 말풍선 */}
      <div
        ref={tipRef}
        className="absolute w-[min(320px,calc(100vw-32px))] bg-bg-surface rounded-2xl shadow-lg border border-border p-4"
        style={{
          top: tip?.top ?? -9999,
          left: tip?.left ?? -9999,
          transition: animate ? 'top .3s cubic-bezier(0.32,0.72,0,1), left .3s cubic-bezier(0.32,0.72,0,1)' : undefined,
        }}
      >
        <h3 className="font-display text-[16px] text-text-primary mb-1 tracking-[-0.01em]">
          {step.title}
        </h3>
        <p className="text-[13px] text-text-secondary leading-[1.6]">{step.body}</p>

        <div className="flex items-center justify-between mt-4">
          {/* 진행도 */}
          <div className="flex gap-1.5" aria-label={`${stepIndex + 1} / ${TOUR_STEPS.length}`}>
            {TOUR_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === stepIndex ? 'bg-brand' : 'bg-border',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={skip}
              className="text-[12px] text-text-muted hover:text-text-secondary px-2 py-1 rounded cursor-pointer"
            >
              건너뛰기
            </button>
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="text-[12px] font-medium text-text-secondary hover:text-text-primary px-2 py-1 rounded cursor-pointer"
              >
                이전
              </button>
            )}
            <button
              onClick={next}
              className="text-[12px] font-semibold text-white bg-brand hover:bg-[#B5563A] rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
            >
              {isLast ? '완료' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
