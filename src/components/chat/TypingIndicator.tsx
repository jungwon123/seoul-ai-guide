import type { AgentType } from '@/types';
import AgentMark from '../agent/AgentMark';

export default function TypingIndicator({ agent, status }: { agent: AgentType; status?: string }) {
  // BE 가 보내는 status 메시지 끝의 "..." 는 우리 애니메이션 점과 중복되므로 제거.
  // 예: "코스를 계획하고 있어요..." → "코스를 계획하고 있어요" + ···(애니메이션)
  const cleanStatus = status?.replace(/\.{2,}\s*$/, '').trim();

  return (
    <div className="flex gap-3 animate-message">
      <AgentMark agent={agent} size={28} />
      <div className="flex items-center gap-2 pt-1.5">
        {cleanStatus && (
          <span className="text-[13px] text-text-muted">{cleanStatus}</span>
        )}
        <div className="flex items-center gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[5px] h-[5px] rounded-full bg-text-muted"
              style={{ animation: 'dot 1.4s ease-in-out infinite', animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
