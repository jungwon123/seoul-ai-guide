'use client';

import { useEffect, useState } from 'react';
import type { AgentType } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';

interface AgentOrbProps {
  agent: AgentType;
  isThinking: boolean;
  isStreaming: boolean;
  onAgentChange: (agent: AgentType) => void;
}

const agents: AgentType[] = ['claude', 'gpt', 'gemini'];
const AGENT_LABELS: Record<AgentType, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini' };

export default function AgentOrb({ agent, isThinking, isStreaming, onAgentChange }: AgentOrbProps) {
  const [mounted, setMounted] = useState(false);
  const color = AGENT_COLORS[agent];

  useEffect(() => { setMounted(true); }, []);

  const isActive = isThinking || isStreaming;

  return (
    <div className="relative flex flex-col items-center gap-5 py-8 select-none">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[80px] transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          transform: `translate(-50%, -50%) scale(${isActive ? 1.3 : 1})`,
        }}
      />

      {/* The Orb */}
      <div className="relative">
        {/* Outer ring — rotates */}
        <div
          className="absolute inset-[-12px] rounded-full transition-all duration-700"
          style={{
            border: `1px solid ${color}15`,
            animation: mounted ? `orbRingSpin ${isActive ? '3s' : '12s'} linear infinite` : 'none',
          }}
        >
          {/* Orbiting dot */}
          <div
            className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full transition-all duration-500"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
          />
        </div>

        {/* Second ring */}
        <div
          className="absolute inset-[-24px] rounded-full transition-all duration-700"
          style={{
            border: `1px dashed ${color}08`,
            animation: mounted ? `orbRingSpin 20s linear infinite reverse` : 'none',
          }}
        />

        {/* Core orb */}
        <button
          onClick={() => {
            const idx = agents.indexOf(agent);
            onAgentChange(agents[(idx + 1) % agents.length]);
          }}
          className="relative w-20 h-20 rounded-full cursor-pointer transition-transform duration-500 hover:scale-105 active:scale-95"
          style={{
            background: `
              radial-gradient(circle at 35% 35%, ${color}30, transparent 50%),
              radial-gradient(circle at 65% 65%, ${color}15, transparent 50%),
              radial-gradient(circle at 50% 50%, ${color}08, var(--color-bg-subtle))
            `,
            border: `1.5px solid ${color}20`,
            boxShadow: `
              0 0 0 1px ${color}06,
              0 4px 20px ${color}12,
              inset 0 1px 0 rgba(255,255,255,0.5)
            `,
            animation: isActive
              ? 'orbPulse 1.5s ease-in-out infinite'
              : 'orbBreathe 4s ease-in-out infinite',
          }}
          aria-label={`현재 에이전트: ${AGENT_LABELS[agent]}. 클릭하여 전환`}
        >
          {/* Inner shine */}
          <div
            className="absolute inset-[6px] rounded-full"
            style={{
              background: `radial-gradient(circle at 40% 30%, rgba(255,255,255,0.4), transparent 60%)`,
            }}
          />
          {/* Agent initial */}
          <span
            className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold transition-all duration-500"
            style={{ color, fontFamily: 'var(--font-display)' }}
          >
            {AGENT_LABELS[agent][0]}
          </span>
        </button>
      </div>

      {/* Agent label + switcher */}
      <div className="flex items-center gap-1 z-10">
        {agents.map((a) => {
          const isSelected = a === agent;
          const c = AGENT_COLORS[a];
          return (
            <button
              key={a}
              onClick={() => onAgentChange(a)}
              className="group relative px-3 py-1.5 text-[12px] font-medium transition-all duration-200 cursor-pointer rounded-full"
              style={{
                color: isSelected ? c : 'var(--color-text-muted)',
                background: isSelected ? `${c}08` : 'transparent',
              }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-[5px] h-[5px] rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: c,
                    opacity: isSelected ? 1 : 0.3,
                    transform: isSelected ? 'scale(1)' : 'scale(0.7)',
                  }}
                />
                {AGENT_LABELS[a]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status text */}
      {isActive && (
        <p className="text-[11px] text-text-muted animate-fade-up tracking-wide">
          {isThinking && !isStreaming ? '생각하고 있어요...' : '응답 중...'}
        </p>
      )}

      {/* Keyframes injected via style */}
      <style>{`
        @keyframes orbBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0px ${color}10; }
          50% { transform: scale(1.06); box-shadow: 0 0 0 12px ${color}00; }
        }
        @keyframes orbRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
