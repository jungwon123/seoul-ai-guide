import { memo, useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
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

export default memo(function ChatInput({ onSend, disabled, showChips }: ChatInputProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const canSend = text.trim() && !disabled;

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-3 stagger-children">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              className="group px-3.5 py-2 text-[13px] text-text-secondary bg-bg-surface rounded-full border border-border transition-all duration-200 cursor-pointer whitespace-nowrap hover:border-brand/30 hover:text-brand hover:bg-brand-subtle hover:shadow-xs"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'flex items-center gap-2 bg-bg-surface rounded-[14px] pl-4 pr-1.5 py-1.5 transition-all duration-200',
            focused
              ? 'border-2 border-brand/40 shadow-focus'
              : 'border border-border shadow-sm hover:border-border-strong',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="서울에서 무엇을 하고 싶으세요?"
            disabled={disabled}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary',
              'placeholder:text-text-muted leading-[1.5] min-w-0',
              disabled && 'opacity-40',
            )}
            aria-label="메시지 입력"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              'w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0',
              canSend
                ? 'bg-brand text-white shadow-xs hover:bg-brand-hover active:scale-95'
                : 'bg-bg-subtle text-text-muted',
            )}
            aria-label="전송"
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
});
