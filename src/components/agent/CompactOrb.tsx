'use client';

import { useState, useEffect } from 'react';
import type { AgentType } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';

interface CompactOrbProps {
  agent: AgentType;
  isActive: boolean;
  onClick: () => void;
}

const AGENT_PALETTES: Record<AgentType, { primary: string; secondary: string }> = {
  claude: { primary: '#7C3AED', secondary: '#3B82F6' },
  gpt: { primary: '#059669', secondary: '#06B6D4' },
  gemini: { primary: '#EA580C', secondary: '#F59E0B' },
};

const LABELS: Record<AgentType, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini' };

export default function CompactOrb({ agent, isActive, onClick }: CompactOrbProps) {
  const [mounted, setMounted] = useState(false);
  const palette = AGENT_PALETTES[agent];
  const color = AGENT_COLORS[agent];

  useEffect(() => { setMounted(true); }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group"
      aria-label={`에이전트: ${LABELS[agent]}`}
    >
      <div className="relative">
        {/* Glow */}
        {isActive && (
          <div
            className="absolute inset-[-4px] rounded-full blur-[6px] transition-opacity duration-500"
            style={{ background: `${color}30` }}
          />
        )}
        {/* Orb */}
        <div
          className="relative w-9 h-9 rounded-full transition-transform duration-300 group-active:scale-90"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${palette.secondary}60, ${palette.primary}90)`,
            boxShadow: `0 2px 12px ${color}20, inset 0 1px 0 rgba(255,255,255,0.3)`,
            animation: mounted
              ? isActive ? 'compactPulse 2s ease-in-out infinite' : 'compactBreathe 4s ease-in-out infinite'
              : 'none',
          }}
        >
          <div
            className="absolute inset-[3px] rounded-full"
            style={{ background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.35), transparent 60%)' }}
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-text-primary leading-tight">{LABELS[agent]}</span>
        <span className="text-[10px] text-text-muted leading-tight">
          {isActive ? '응답 중...' : 'AI 에이전트'}
        </span>
      </div>

      <style>{`
        @keyframes compactBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes compactPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </button>
  );
}
