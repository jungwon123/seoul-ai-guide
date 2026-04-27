import { memo } from 'react';
import type { AgentType } from '@/types';
import LottiePlayer from '@/components/ui/LottiePlayer';

interface CompactOrbProps {
  agent?: AgentType;
  isActive?: boolean;
  onClick?: () => void;
}

export default memo(function CompactOrb({ isActive, onClick }: CompactOrbProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group"
      aria-label="홈으로"
    >
      <LottiePlayer
        src="/animations/AI-logo.json"
        className="w-9 h-9 shrink-0"
        ariaLabel="Seoul Edit AI"
        fallback={
          <div className="w-9 h-9 rounded-full bg-brand-subtle border border-border" />
        }
      />
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-text-primary leading-tight tracking-[-0.01em]">
          Seoul Edit
        </span>
        <span className="text-[10px] text-text-muted leading-tight">
          {isActive ? '응답 중...' : 'AI 에이전트'}
        </span>
      </div>
    </button>
  );
});
