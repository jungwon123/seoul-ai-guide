'use client';

import type { AgentType } from '@/types';
import { AGENT_CONFIG } from '@/lib/utils';

export default function TypingIndicator({ agent }: { agent: AgentType }) {
  const config = AGENT_CONFIG[agent];
  return (
    <div className="flex items-start gap-3 animate-message-in">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{
          backgroundColor: `${config.color}30`,
          border: `1px solid ${config.color}50`,
          fontFamily: 'var(--font-display)',
        }}
      >
        {config.label[0]}
      </div>
      <div
        className="rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-2"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-default)',
          borderLeft: `2px solid ${config.color}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--color-neon-mint)',
              animation: `neonPulse 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
