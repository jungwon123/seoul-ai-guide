'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface SideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function SideSheet({ isOpen, onClose, title, children }: SideSheetProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-bg-surface border-l border-border shadow-lg flex flex-col"
        style={{ animation: 'sheetIn 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards' }}
      >
        <div className="flex items-center justify-between px-5 h-[52px] border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes sheetIn {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
