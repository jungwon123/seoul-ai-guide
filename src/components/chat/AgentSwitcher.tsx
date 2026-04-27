

import { X } from 'lucide-react';
import type { AgentType } from '@/types';
import { AGENT_COLORS, cn } from '@/lib/utils';

interface AgentSwitcherProps {
  isOpen: boolean;
  current: AgentType;
  onSelect: (agent: AgentType) => void;
  onClose: () => void;
}

const AGENTS: { key: AgentType; label: string; company: string; desc: string }[] = [
  { key: 'claude', label: 'Claude', company: 'Anthropic', desc: '섬세한 큐레이션' },
  { key: 'gpt', label: 'GPT', company: 'OpenAI', desc: '빠른 탐색' },
  { key: 'gemini', label: 'Gemini', company: 'Google', desc: '다양한 시각' },
];

export default function AgentSwitcher({ isOpen, current, onSelect, onClose }: AgentSwitcherProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface rounded-t-[24px] shadow-lg border-t border-border p-5 pb-8 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-text-primary">에이전트 선택</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted cursor-pointer" aria-label="닫기">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {AGENTS.map((agent) => {
            const color = AGENT_COLORS[agent.key];
            const isSelected = current === agent.key;
            return (
              <button
                key={agent.key}
                onClick={() => { onSelect(agent.key); onClose(); }}
                className={cn(
                  'w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left active:scale-[0.98]',
                  isSelected ? 'bg-bg-surface shadow-sm' : 'bg-bg-base',
                )}
                style={{ borderColor: isSelected ? color : 'var(--color-border)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-semibold shrink-0"
                  style={{ backgroundColor: `${color}0A`, color }}
                >
                  {agent.label[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-text-primary">{agent.label}</span>
                    <span className="text-[10px] text-text-muted">{agent.company}</span>
                  </div>
                  <span className="text-[12px] text-text-secondary">{agent.desc}</span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
