'use client';

import { useState } from 'react';
import { MapPin, ShoppingBag, Palette, UtensilsCrossed, Moon, Music, ArrowRight } from 'lucide-react';
import type { AgentType } from '@/types';
import { AGENT_COLORS, cn } from '@/lib/utils';

interface OnboardingFlowProps {
  onComplete: (agent: AgentType, interests: string[]) => void;
}

const AGENTS: { key: AgentType; label: string; company: string; desc: string }[] = [
  { key: 'claude', label: 'Claude', company: 'Anthropic', desc: '섬세한 큐레이션' },
  { key: 'gpt', label: 'GPT', company: 'OpenAI', desc: '빠른 탐색' },
  { key: 'gemini', label: 'Gemini', company: 'Google', desc: '다양한 시각' },
];

const INTERESTS = [
  { key: 'tourism', label: '관광 명소', icon: MapPin },
  { key: 'shopping', label: '쇼핑', icon: ShoppingBag },
  { key: 'culture', label: '문화 체험', icon: Palette },
  { key: 'food', label: '음식 / 맛집', icon: UtensilsCrossed },
  { key: 'nightlife', label: '야경 / 카페', icon: Moon },
  { key: 'entertainment', label: '엔터테인먼트', icon: Music },
];

type Step = 'splash' | 'agent' | 'interests';

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('splash');
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('claude');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (key: string) => {
    setSelectedInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  if (step === 'splash') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base">
        <div className="text-center animate-fade-up">
          <p className="text-[13px] text-text-muted font-medium tracking-[0.1em] uppercase mb-4">
            AI Travel Curation
          </p>
          <h1
            className="text-[42px] text-text-primary mb-3 leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
          >
            Seoul Edit
          </h1>
          <p className="text-[16px] text-text-secondary max-w-xs mx-auto leading-[1.6] mb-10">
            당신만의 서울을 큐레이션하세요.
            <br />
            AI 에이전트가 여행을 설계합니다.
          </p>
          <button
            onClick={() => setStep('agent')}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-text-primary text-text-inverse rounded-full text-[14px] font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            시작하기
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'agent') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base">
        <div className="w-full max-w-sm animate-fade-up">
          <p className="text-[12px] text-text-muted font-medium tracking-[0.08em] uppercase mb-2 text-center">Step 1 of 2</p>
          <h2
            className="text-[24px] text-text-primary text-center mb-8"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            어떤 에이전트와 함께할까요?
          </h2>
          <div className="space-y-2.5 mb-8 stagger-children">
            {AGENTS.map((agent) => {
              const color = AGENT_COLORS[agent.key];
              const isSelected = selectedAgent === agent.key;
              return (
                <button
                  key={agent.key}
                  onClick={() => setSelectedAgent(agent.key)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left',
                    isSelected ? 'bg-bg-surface shadow-md' : 'bg-bg-base hover:bg-bg-surface',
                  )}
                  style={{ borderColor: isSelected ? color : 'var(--color-border)' }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-[15px] shrink-0"
                    style={{ backgroundColor: `${color}0A`, color }}
                  >
                    {agent.label[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-text-primary">{agent.label}</span>
                      <span className="text-[11px] text-text-muted">{agent.company}</span>
                    </div>
                    <span className="text-[13px] text-text-secondary">{agent.desc}</span>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{ borderColor: isSelected ? color : 'var(--color-border)' }}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStep('interests')}
            className="w-full py-3 bg-text-primary text-text-inverse rounded-full text-[14px] font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base">
      <div className="w-full max-w-sm animate-fade-up">
        <p className="text-[12px] text-text-muted font-medium tracking-[0.08em] uppercase mb-2 text-center">Step 2 of 2</p>
        <h2
          className="text-[24px] text-text-primary text-center mb-8"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          어떤 경험을 찾고 있나요?
        </h2>
        <div className="grid grid-cols-2 gap-2.5 mb-8 stagger-children">
          {INTERESTS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedInterests.includes(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggleInterest(item.key)}
                className={cn(
                  'flex items-center gap-2.5 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'border-brand bg-brand-subtle shadow-xs'
                    : 'border-border bg-bg-surface hover:border-border-strong hover:shadow-xs',
                )}
              >
                <Icon size={18} strokeWidth={1.5} className={isSelected ? 'text-brand' : 'text-text-muted'} />
                <span className={cn('text-[13px] font-medium', isSelected ? 'text-brand' : 'text-text-secondary')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onComplete(selectedAgent, selectedInterests)}
          className="w-full py-3 bg-text-primary text-text-inverse rounded-full text-[14px] font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
