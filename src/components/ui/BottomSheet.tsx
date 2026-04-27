

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type SnapState = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  children: React.ReactNode;
  /** Content fixed at the top of the sheet — visible at every snap state. */
  header?: React.ReactNode;
  defaultSnap?: SnapState;
  /** Height in px of the peek state (portion that remains visible above viewport bottom). */
  peekHeight?: number;
  onSnapChange?: (snap: SnapState) => void;
  className?: string;
}

export default function BottomSheet({
  children,
  header,
  defaultSnap = 'half',
  peekHeight = 120,
  onSnapChange,
  className,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapState>(defaultSnap);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startTop: 0, isDragging: false });

  const snapPoints: Record<SnapState, string> = {
    peek: `calc(100% - ${peekHeight}px)`,
    half: '50%',
    full: '4%',
  };

  const changeSnap = useCallback(
    (next: SnapState) => {
      setSnap(next);
      onSnapChange?.(next);
    },
    [onSnapChange],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = {
      startY: touch.clientY,
      startTop: sheetRef.current?.getBoundingClientRect().top || 0,
      isDragging: true,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - dragRef.current.startY;
    const newTop = Math.max(20, dragRef.current.startTop + deltaY);
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.top = `${newTop}px`;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!sheetRef.current) return;
    dragRef.current.isDragging = false;
    const rect = sheetRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const ratio = rect.top / vh;

    sheetRef.current.style.transition = 'top 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

    if (ratio < 0.2) changeSnap('full');
    else if (ratio < 0.55) changeSnap('half');
    else changeSnap('peek');

    sheetRef.current.style.top = '';
  }, [changeSnap]);

  // Keep snap in sync if defaultSnap changes (consumer-controlled reset).
  useEffect(() => { setSnap(defaultSnap); }, [defaultSnap]);

  return (
    <div
      ref={sheetRef}
      className={cn(
        'fixed left-0 right-0 bottom-0 z-30 bg-bg-surface rounded-t-[20px] shadow-lg border-t border-border flex flex-col',
        className,
      )}
      style={{
        top: snapPoints[snap],
        transition: 'top 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        maxHeight: '96%',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing shrink-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-9 h-1 rounded-full bg-border-strong" />
      </div>

      {/* Header — always visible, used for peek content */}
      {header && <div className="shrink-0">{header}</div>}

      {/* Expanded content — scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
