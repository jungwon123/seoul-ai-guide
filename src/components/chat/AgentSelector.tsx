'use client';

import type { AgentType } from '@/types';
import { AGENT_COLORS, cn } from '@/lib/utils';

interface AgentSelectorProps {
  selected: AgentType;
  onSelect: (agent: AgentType) => void;
}

const agents: { key: AgentType; label: string }[] = [
  { key: 'claude', label: 'Claude' },
  { key: 'gpt', label: 'GPT' },
  { key: 'gemini', label: 'Gemini' },
];

export default function AgentSelector({ selected, onSelect }: AgentSelectorProps) {
  return (
    <div className="flex border-b border-border px-4">
      {agents.map((agent) => {
        const isActive = selected === agent.key;
        const color = AGENT_COLORS[agent.key];
        return (
          <button
            key={agent.key}
            onClick={() => onSelect(agent.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-medium transition-all duration-150 cursor-pointer -mb-px',
              isActive ? '' : 'text-text-muted hover:text-text-secondary',
            )}
            style={isActive ? {
              color,
              borderBottom: `2px solid ${color}`,
            } : {
              borderBottom: '2px solid transparent',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isActive ? color : 'currentColor' }}
            />
            {agent.label}
          </button>
        );
      })}
    </div>
  );
}
