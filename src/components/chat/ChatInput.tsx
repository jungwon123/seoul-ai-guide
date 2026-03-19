'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
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
    <div className="p-3 shrink-0">
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-3 px-1">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              className="px-3.5 py-[7px] text-[13px] text-text-secondary bg-bg-surface rounded-full border border-border hover:border-brand hover:text-brand hover:bg-brand-subtle transition-all duration-150 cursor-pointer whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-end gap-2 bg-bg-surface border border-border rounded-xl px-3.5 py-2.5 shadow-sm transition-all duration-150 focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(28,110,242,0.08)]"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="서울에서 무엇을 하고 싶으세요?"
            disabled={disabled}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary',
              'placeholder:text-text-muted leading-[1.5]',
              disabled && 'opacity-40',
            )}
          />
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0',
              text.trim() && !disabled
                ? 'bg-brand text-white hover:bg-[#1558CC] hover:scale-103'
                : 'bg-bg-subtle text-text-muted',
            )}
            aria-label="전송"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
