'use client';

import type { AgentType } from '@/types';
import { AGENT_CONFIG } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AgentSelectorProps {
  selected: AgentType;
  onSelect: (agent: AgentType) => void;
}

const agents: AgentType[] = ['claude', 'gpt', 'gemini'];

export default function AgentSelector({ selected, onSelect }: AgentSelectorProps) {
  return (
    <div className="flex gap-1 bg-bg-primary/50 rounded-lg p-1">
      {agents.map((agent) => {
        const config = AGENT_CONFIG[agent];
        const isActive = selected === agent;
        return (
          <button
            key={agent}
            onClick={() => onSelect(agent)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer',
              isActive
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span>{config.label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
