'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  defaultSnap?: 'peek' | 'half' | 'full';
}

const SNAP_POINTS = {
  peek: 'calc(100% - 120px)',
  half: '50%',
  full: '4%',
};

export default function BottomSheet({ children, header, defaultSnap = 'half' }: BottomSheetProps) {
  const [snap, setSnap] = useState(defaultSnap);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startTop: 0, isDragging: false });

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

    if (ratio < 0.2) {
      setSnap('full');
    } else if (ratio < 0.55) {
      setSnap('half');
    } else {
      setSnap('peek');
    }

    sheetRef.current.style.top = '';
  }, []);

  // Update snap on messages
  useEffect(() => {
    if (snap === 'peek') setSnap('half');
  }, [children]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={sheetRef}
      className={cn(
        'fixed left-0 right-0 bottom-0 z-30 bg-bg-surface rounded-t-[20px] shadow-lg border-t border-border flex flex-col',
      )}
      style={{
        top: SNAP_POINTS[snap],
        transition: 'top 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        maxHeight: '96%',
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

      {/* Header */}
      {header && <div className="px-4 pb-2 shrink-0">{header}</div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
