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
    <div className="flex px-5 gap-1" role="tablist" aria-label="AI 에이전트 선택">
      {agents.map((agent) => {
        const isActive = selected === agent.key;
        const color = AGENT_COLORS[agent.key];
        return (
          <button
            key={agent.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(agent.key)}
            className={cn(
              'group relative flex items-center gap-2 px-3 py-3.5 text-[13px] tracking-[-0.01em] transition-colors duration-150 cursor-pointer',
              isActive ? 'font-semibold' : 'font-medium text-text-muted hover:text-text-secondary',
            )}
            style={isActive ? { color } : undefined}
          >
            <span
              className="w-[7px] h-[7px] rounded-full transition-all duration-200"
              style={{
                backgroundColor: color,
                opacity: isActive ? 1 : 0.3,
                transform: isActive ? 'scale(1)' : 'scale(0.85)',
              }}
            />
            {agent.label}
            {/* Active indicator line */}
            <span
              className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-200"
              style={{
                backgroundColor: color,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
