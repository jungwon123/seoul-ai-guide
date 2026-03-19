'use client';

import type { AgentType } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';

export default function TypingIndicator({ agent }: { agent: AgentType }) {
  const color = AGENT_COLORS[agent];
  return (
    <div className="flex gap-2.5 items-start animate-message">
      <div
        className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center text-[12px] font-semibold shrink-0"
        style={{ color }}
      >
        {agent[0].toUpperCase()}
      </div>
      <div className="flex items-center gap-1 pt-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[5px] h-[5px] rounded-full bg-text-muted"
            style={{
              animation: `dot 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
