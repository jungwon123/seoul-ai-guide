'use client';

import type { AgentType } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';

export default function TypingIndicator({ agent }: { agent: AgentType }) {
  const color = AGENT_COLORS[agent];
  return (
    <div className="flex gap-3 animate-message">
      <div
        className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[11px] font-semibold shrink-0"
        style={{ backgroundColor: `${color}08`, color, border: `1px solid ${color}15` }}
      >
        {agent[0].toUpperCase()}
      </div>
      <div className="flex items-center gap-[5px] pt-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[5px] h-[5px] rounded-full bg-text-muted"
            style={{ animation: 'dot 1.4s ease-in-out infinite', animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}
