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
    <div className="glass-panel border-t border-border-default p-4 shrink-0">
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-3">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              className="px-4 py-2 text-[13px] text-text-secondary bg-bg-glass rounded-full border border-border-default hover:border-border-active hover:text-neon-mint hover:bg-neon-mint-glow transition-all duration-200 cursor-pointer whitespace-nowrap"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-1">
        <div
          className={cn(
            'flex-1 flex items-center bg-bg-elevated border border-border-default rounded-2xl px-4 py-1 transition-all duration-200',
            'focus-within:border-border-active',
          )}
          style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 178, 0.25), 0 0 60px rgba(0, 255, 178, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="서울에서 무엇을 하고 싶으세요?"
            disabled={disabled}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-sm text-text-primary',
              'placeholder:text-text-muted py-2',
              disabled && 'opacity-50',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className={cn(
              'w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0',
              !text.trim() || disabled ? 'opacity-30' : 'hover:scale-105',
            )}
            style={{
              background: text.trim() && !disabled
                ? 'linear-gradient(135deg, #00FFB2, #00C8A0)'
                : 'var(--color-bg-elevated)',
              color: text.trim() && !disabled ? '#050810' : 'var(--color-text-muted)',
              boxShadow: text.trim() && !disabled ? '0 0 20px rgba(0, 255, 178, 0.25)' : 'none',
            }}
            aria-label="전송"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
