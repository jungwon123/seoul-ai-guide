import { memo } from 'react';
import AgentOrb from './AgentOrb';

interface CompactOrbProps {
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
      <div className="w-9 h-9 shrink-0 overflow-hidden">
        <AgentOrb state={isActive ? 'thinking' : 'idle'} size={36} interactive={false} />
      </div>
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
