'use client';

import type { AgentType } from '@/types';
import { AGENT_CONFIG, cn } from '@/lib/utils';

interface AgentSelectorProps {
  selected: AgentType;
  onSelect: (agent: AgentType) => void;
}

const agents: AgentType[] = ['claude', 'gpt', 'gemini'];

export default function AgentSelector({ selected, onSelect }: AgentSelectorProps) {
  return (
    <div className="flex gap-0.5 bg-bg-elevated border border-border-default rounded-full p-1">
      {agents.map((agent) => {
        const config = AGENT_CONFIG[agent];
        const isActive = selected === agent;
        return (
          <button
            key={agent}
            onClick={() => onSelect(agent)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer',
              isActive ? 'text-white' : 'text-text-secondary hover:text-text-primary',
            )}
            style={isActive ? {
              background: `linear-gradient(135deg, ${config.glowColor}, ${config.glowColor.replace('0.2', '0.05')})`,
              border: `1px solid ${config.color}60`,
              color: config.color,
              boxShadow: `0 0 12px ${config.glowColor}`,
            } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color, boxShadow: isActive ? `0 0 6px ${config.color}` : 'none' }}
            />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
