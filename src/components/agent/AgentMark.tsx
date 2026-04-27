import type { AgentType } from '@/types';

const AGENT_PALETTES: Record<AgentType, { primary: string; secondary: string; accent: string }> = {
  claude: { primary: '#1F3A8B', secondary: '#DC2127', accent: '#F4A12C' },
  gpt: { primary: '#00853E', secondary: '#5BA86A', accent: '#F4A12C' },
  gemini: { primary: '#F4A12C', secondary: '#FFC72C', accent: '#DC2127' },
};

interface AgentMarkProps {
  agent: AgentType;
  size?: number;
  className?: string;
  spinDuration?: number;
}

export default function AgentMark({ agent, size = 28, className = '', spinDuration = 8 }: AgentMarkProps) {
  const p = AGENT_PALETTES[agent];

  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }} aria-label={`${agent} mark`}>
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{
          animation: `orbSpin ${spinDuration}s linear infinite`,
          willChange: 'transform',
          transformOrigin: 'center',
        }}
      >
        {/* Tri-segment pinwheel — 88 emblem swirl */}
        <path d="M 12 12 L 12 0 A 12 12 0 0 1 22.392 18 Z" fill={p.primary} />
        <path d="M 12 12 L 22.392 18 A 12 12 0 0 1 1.608 18 Z" fill={p.secondary} />
        <path d="M 12 12 L 1.608 18 A 12 12 0 0 1 12 0 Z" fill={p.accent} />
        {/* Inner white dot — emblem center */}
        <circle cx="12" cy="12" r="2.4" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
