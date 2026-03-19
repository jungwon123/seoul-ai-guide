'use client';

import type { AgentType } from '@/types';
import { AGENT_CONFIG } from '@/lib/utils';

export default function TypingIndicator({ agent }: { agent: AgentType }) {
  const config = AGENT_CONFIG[agent];
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: config.color }}
      >
        {config.label[0]}
      </div>
      <div className="bg-bg-elevated rounded-2xl rounded-tl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-text-muted"
            style={{
              animation: `bounceDot 1.4s infinite ease-in-out both`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
