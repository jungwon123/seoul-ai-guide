'use client';

import { useState } from 'react';
import { MapPin, ShoppingBag, Palette, UtensilsCrossed, Moon, Music } from 'lucide-react';
import type { AgentType } from '@/types';
import { AGENT_COLORS, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface OnboardingFlowProps {
  onComplete: (agent: AgentType, interests: string[]) => void;
}

const AGENTS: { key: AgentType; label: string; company: string; desc: string }[] = [
  { key: 'claude', label: 'Claude', company: 'Anthropic', desc: '섬세한 추천' },
  { key: 'gpt', label: 'GPT', company: 'OpenAI', desc: '빠른 정보' },
  { key: 'gemini', label: 'Gemini', company: 'Google', desc: '다양한 관점' },
];

const INTERESTS = [
  { key: 'tourism', label: '관광 명소', icon: MapPin },
  { key: 'shopping', label: '쇼핑', icon: ShoppingBag },
  { key: 'culture', label: '문화 체험', icon: Palette },
  { key: 'food', label: '음식/맛집', icon: UtensilsCrossed },
  { key: 'nightlife', label: '야경/카페', icon: Moon },
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
      <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base animate-fade-up">
        <h1
          className="text-4xl text-text-primary mb-3"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}
        >
          Seoul AI Guide
        </h1>
        <p className="text-text-secondary text-center mb-8 max-w-xs text-[15px] leading-relaxed">
          서울의 모든 경험을 AI 에이전트와 함께
        </p>
        <Button size="lg" onClick={() => setStep('agent')}>시작하기</Button>
      </div>
    );
  }

  if (step === 'agent') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base animate-fade-up">
        <h2 className="text-[22px] font-bold text-text-primary mb-2">어떤 AI 에이전트와 여행할까요?</h2>
        <p className="text-text-secondary text-[14px] mb-8">언제든 변경할 수 있어요</p>
        <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-md">
          {AGENTS.map((agent) => {
            const color = AGENT_COLORS[agent.key];
            const isSelected = selectedAgent === agent.key;
            return (
              <button
                key={agent.key}
                onClick={() => setSelectedAgent(agent.key)}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-150 cursor-pointer',
                  isSelected ? 'bg-bg-surface shadow-md' : 'bg-bg-base hover:bg-bg-surface',
                )}
                style={{ borderColor: isSelected ? color : 'var(--color-border)' }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center font-semibold text-[15px]"
                  style={{ backgroundColor: `${color}12`, color }}
                >
                  {agent.label[0]}
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-semibold text-text-primary">{agent.label}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{agent.company}</div>
                  <div className="text-[12px] text-text-secondary mt-1">{agent.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <Button size="lg" onClick={() => setStep('interests')}>다음</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base animate-fade-up">
      <h2 className="text-[22px] font-bold text-text-primary mb-2">어떤 경험을 원하세요?</h2>
      <p className="text-text-secondary text-[14px] mb-8">여러 개 선택할 수 있어요</p>
      <div className="grid grid-cols-2 gap-2.5 mb-8 w-full max-w-sm">
        {INTERESTS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedInterests.includes(item.key);
          return (
            <button
              key={item.key}
              onClick={() => toggleInterest(item.key)}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer',
                isSelected
                  ? 'border-brand bg-brand-subtle'
                  : 'border-border bg-bg-surface hover:border-border-strong',
              )}
            >
              <Icon size={20} strokeWidth={1.5} className={isSelected ? 'text-brand' : 'text-text-muted'} />
              <span className={cn('text-[13px] font-medium', isSelected ? 'text-brand' : 'text-text-secondary')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <Button size="lg" onClick={() => onComplete(selectedAgent, selectedInterests)}>시작하기</Button>
    </div>
  );
}
