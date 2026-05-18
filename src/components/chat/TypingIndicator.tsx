import type { AgentType } from '@/types';
import AgentMark from '../agent/AgentMark';

export default function TypingIndicator({ agent, status }: { agent: AgentType; status?: string }) {
  return (
    <div className="flex gap-3 animate-message">
      <AgentMark agent={agent} size={28} />
      <div className="flex items-center gap-2 pt-1.5">
        <div className="flex items-center gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[5px] h-[5px] rounded-full bg-text-muted"
              style={{ animation: 'dot 1.4s ease-in-out infinite', animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
        {status && (
          <span className="text-[13px] text-text-muted">{status}</span>
        )}
      </div>
    </div>
  );
}
