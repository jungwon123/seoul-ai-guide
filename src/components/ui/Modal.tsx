'use client';

import { useEffect, useRef } from 'react';

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(2, 4, 8, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-2xl animate-scale-in"
        style={{
          background: 'var(--color-bg-panel)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-lg font-bold text-text-primary"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h3>
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
