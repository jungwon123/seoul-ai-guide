'use client';

import { useState } from 'react';
import type { AgentType } from '@/types';
import { AGENT_CONFIG, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface OnboardingFlowProps {
  onComplete: (agent: AgentType, interests: string[]) => void;
}

const AGENTS: AgentType[] = ['claude', 'gpt', 'gemini'];

const INTERESTS = [
  { key: 'tourism', label: '관광 명소', emoji: '🏛' },
  { key: 'shopping', label: '쇼핑', emoji: '🛍' },
  { key: 'culture', label: '문화 체험', emoji: '🎭' },
  { key: 'food', label: '음식/맛집', emoji: '🍜' },
  { key: 'nightlife', label: '야경/카페', emoji: '🌃' },
  { key: 'entertainment', label: '엔터테인먼트', emoji: '🎵' },
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
      <div className="h-full flex flex-col items-center justify-center bg-bg-primary p-8 animate-fade-in-up">
        <div className="w-20 h-20 rounded-2xl bg-brand-primary/20 flex items-center justify-center mb-6">
          <span className="text-4xl text-brand-primary font-bold">S</span>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-3 tracking-tight">
          Seoul AI Guide
        </h1>
        <p className="text-text-secondary text-center mb-8 max-w-sm">
          서울의 모든 경험을 AI 에이전트와 함께
        </p>
        <Button size="lg" onClick={() => setStep('agent')}>
          시작하기
        </Button>
      </div>
    );
  }

  if (step === 'agent') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg-primary p-8 animate-fade-in-up">
        <h2 className="text-xl font-bold text-text-primary mb-2">
          어떤 AI 에이전트와 여행할까요?
        </h2>
        <p className="text-text-secondary text-sm mb-8">언제든 변경할 수 있어요</p>
        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
          {AGENTS.map((agent) => {
            const config = AGENT_CONFIG[agent];
            const isSelected = selectedAgent === agent;
            return (
              <button
                key={agent}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'border-border-active bg-bg-elevated'
                    : 'border-border-default bg-bg-secondary hover:border-border-active/50',
                )}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: config.color }}
                >
                  {config.label[0]}
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-text-primary">{config.label}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{config.company}</div>
                  <div className="text-xs text-text-secondary mt-1">{config.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <Button size="lg" onClick={() => setStep('interests')}>
          다음
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-bg-primary p-8 animate-fade-in-up">
      <h2 className="text-xl font-bold text-text-primary mb-2">
        어떤 경험을 원하세요?
      </h2>
      <p className="text-text-secondary text-sm mb-8">여러 개 선택할 수 있어요</p>
      <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-sm">
        {INTERESTS.map((item) => {
          const isSelected = selectedInterests.includes(item.key);
          return (
            <button
              key={item.key}
              onClick={() => toggleInterest(item.key)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'border-border-active bg-brand-primary/10'
                  : 'border-border-default bg-bg-secondary hover:border-border-active/50',
              )}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={cn('text-sm font-medium', isSelected ? 'text-brand-primary' : 'text-text-secondary')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <Button
        size="lg"
        onClick={() => onComplete(selectedAgent, selectedInterests)}
      >
        시작하기
      </Button>
    </div>
  );
}
