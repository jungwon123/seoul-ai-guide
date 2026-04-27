

import { useEffect, useState, useMemo } from 'react';
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

const AGENT_PALETTES: Record<AgentType, { primary: string; secondary: string; accent: string }> = {
  claude: { primary: '#1F3A8B', secondary: '#DC2127', accent: '#F4A12C' },   /* 88 emblem swirl: navy + red + orange */
  gpt: { primary: '#00853E', secondary: '#5BA86A', accent: '#F4A12C' },       /* olympic green + sage + warm accent */
  gemini: { primary: '#F4A12C', secondary: '#FFC72C', accent: '#DC2127' },    /* orange + yellow + red */
};

export default function AgentOrb({ agent, isThinking, isStreaming, onAgentChange }: AgentOrbProps) {
  const [mounted, setMounted] = useState(false);
  const [seed, setSeed] = useState(0);
  const palette = AGENT_PALETTES[agent];
  const isActive = isThinking || isStreaming;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setSeed((s) => s + 1); }, [agent]);

  const filterId = useMemo(() => `orb-distort-${seed}`, [seed]);
  const turbulenceSpeed = isActive ? '0.04' : '0.015';

  return (
    <div className="relative flex flex-col items-center gap-5 py-6 select-none">
      {/* Deep ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[1.5s]"
        style={{
          width: isActive ? '340px' : '280px',
          height: isActive ? '340px' : '280px',
          background: `radial-gradient(circle, ${palette.primary}18 0%, ${palette.secondary}08 40%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />

      {/* SVG Filter for organic distortion */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="4"
              seed={seed}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur={isActive ? '3s' : '8s'}
                values="0.012;0.018;0.012"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={isActive ? '18' : '10'}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* The Orb */}
      <button
        onClick={() => {
          const idx = agents.indexOf(agent);
          onAgentChange(agents[(idx + 1) % agents.length]);
        }}
        className="relative w-[120px] h-[120px] cursor-pointer group"
        style={{ filter: mounted ? `url(#${filterId})` : 'none' }}
        aria-label={`현재 에이전트: ${AGENT_LABELS[agent]}. 클릭하여 전환`}
      >
        {/* Layer 1 — Core sphere */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 40% 35%, ${palette.secondary}90, ${palette.primary}80, ${palette.accent}40)`,
            animation: mounted ? `orbRotate1 ${isActive ? '4s' : '8s'} ease-in-out infinite` : 'none',
          }}
        />

        {/* Layer 2 — Inner glow wave */}
        <div
          className="absolute inset-[8px] rounded-full transition-all duration-1000 mix-blend-screen"
          style={{
            background: `radial-gradient(ellipse at 60% 30%, ${palette.secondary}CC, transparent 60%), radial-gradient(ellipse at 30% 70%, ${palette.accent}88, transparent 50%)`,
            animation: mounted ? `orbRotate2 ${isActive ? '3s' : '6s'} ease-in-out infinite reverse` : 'none',
          }}
        />

        {/* Layer 3 — Highlight shimmer */}
        <div
          className="absolute inset-[4px] rounded-full transition-all duration-1000 mix-blend-overlay"
          style={{
            background: `
              radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.5), transparent 45%),
              radial-gradient(ellipse at 70% 60%, ${palette.primary}60, transparent 50%)
            `,
            animation: mounted ? `orbRotate3 ${isActive ? '5s' : '10s'} ease-in-out infinite` : 'none',
          }}
        />

        {/* Layer 4 — Edge luminance */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 40%, ${palette.primary}20 70%, ${palette.primary}05 100%)`,
            boxShadow: `
              inset 0 0 30px ${palette.primary}20,
              0 0 40px ${palette.primary}25,
              0 0 80px ${palette.secondary}15
            `,
            transition: 'box-shadow 1s, background 1s',
          }}
        />

        {/* Active pulse ring */}
        {isActive && (
          <div
            className="absolute inset-[-6px] rounded-full"
            style={{
              border: `1px solid ${palette.primary}30`,
              animation: 'orbPulseRing 2s ease-out infinite',
            }}
          />
        )}
      </button>

      {/* Agent switcher */}
      <div className="flex items-center gap-0.5 z-10">
        {agents.map((a) => {
          const isSelected = a === agent;
          const c = AGENT_COLORS[a];
          return (
            <button
              key={a}
              onClick={() => onAgentChange(a)}
              className="relative px-3 py-1.5 text-[12px] font-medium transition-all duration-200 cursor-pointer rounded-full"
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
                    boxShadow: isSelected ? `0 0 6px ${c}60` : 'none',
                  }}
                />
                {AGENT_LABELS[a]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status */}
      {isActive && (
        <p className="text-[11px] text-text-muted animate-fade-up tracking-wide">
          {isThinking && !isStreaming ? '생각하고 있어요...' : '응답 중...'}
        </p>
      )}

    </div>
  );
}
