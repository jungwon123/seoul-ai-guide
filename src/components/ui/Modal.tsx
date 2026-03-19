'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          'bg-bg-secondary border border-border-default rounded-2xl shadow-card',
          'w-full max-w-md mx-4 p-6 animate-scale-in',
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none cursor-pointer"
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
