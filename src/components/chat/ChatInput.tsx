'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  showChips?: boolean;
}

const EXAMPLE_CHIPS = [
  '강남에서 오늘 뭐 할 수 있어?',
  '서울 전통 문화 체험 추천해줘',
  '홍대 쇼핑 코스 짜줘',
  '한강 근처 맛집 알려줘',
];

export default function ChatInput({ onSend, disabled, showChips }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-border-default bg-bg-secondary/80 backdrop-blur-sm p-4">
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-3">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              className="px-3 py-1.5 text-xs text-text-secondary bg-bg-elevated rounded-full border border-border-default hover:border-border-active hover:text-brand-primary transition-all duration-200 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="서울에서 무엇을 하고 싶으세요?"
          disabled={disabled}
          className={cn(
            'flex-1 bg-bg-primary border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary',
            'placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors',
            disabled && 'opacity-50',
          )}
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer',
            text.trim() && !disabled
              ? 'bg-brand-primary text-bg-primary shadow-glow'
              : 'bg-bg-elevated text-text-muted',
          )}
          aria-label="전송"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
