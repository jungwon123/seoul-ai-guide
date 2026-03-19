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
  { key: 'tourism', label: '관광 명소', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' },
  { key: 'shopping', label: '쇼핑', icon: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42' },
  { key: 'culture', label: '문화 체험', icon: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z' },
  { key: 'food', label: '음식/맛집', icon: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7z' },
  { key: 'nightlife', label: '야경/카페', icon: 'M12.43 2.3c-2.38-.59-4.68-.27-6.63.64-.35.16-.41.64-.1.86C8.3 5.6 10 8.6 10 12c0 3.4-1.7 6.4-4.3 8.2-.32.22-.26.7.09.86 1.28.6 2.71.94 4.21.94 6.05 0 10.85-5.38 9.87-11.6-.61-3.92-3.59-6.9-7.44-8.1z' },
  { key: 'entertainment', label: '엔터테인먼트', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
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
      <div className="h-full flex flex-col items-center justify-center p-8 animate-message-in">
        <div className="mb-6">
          <span
            className="text-6xl font-extrabold"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #00FFB2, #00D4FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0, 255, 178, 0.4))',
            }}
          >
            S
          </span>
        </div>
        <h1
          className="text-3xl font-bold text-text-primary mb-3"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}
        >
          Seoul AI Guide
        </h1>
        <p className="text-text-secondary text-center mb-8 max-w-sm text-[15px]">
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
      <div className="h-full flex flex-col items-center justify-center p-8 animate-message-in">
        <h2
          className="text-xl font-bold text-text-primary mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
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
                className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-200 cursor-pointer"
                style={{
                  background: isSelected ? config.glowColor : 'var(--color-bg-panel)',
                  border: `2px solid ${isSelected ? `${config.color}60` : 'var(--color-border-default)'}`,
                  boxShadow: isSelected ? `0 0 24px ${config.glowColor}` : 'none',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                  style={{
                    backgroundColor: `${config.color}30`,
                    border: `1px solid ${config.color}60`,
                    color: config.color,
                    fontFamily: 'var(--font-display)',
                    boxShadow: `0 0 12px ${config.glowColor}`,
                  }}
                >
                  {config.label[0]}
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>{config.label}</div>
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
    <div className="h-full flex flex-col items-center justify-center p-8 animate-message-in">
      <h2
        className="text-xl font-bold text-text-primary mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
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
              className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 cursor-pointer"
              style={{
                background: isSelected ? 'rgba(0, 255, 178, 0.08)' : 'var(--color-bg-panel)',
                border: `2px solid ${isSelected ? 'rgba(0, 255, 178, 0.3)' : 'var(--color-border-default)'}`,
                backdropFilter: 'blur(12px)',
                boxShadow: isSelected ? '0 0 16px rgba(0, 255, 178, 0.15)' : 'none',
              }}
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill={isSelected ? '#00FFB2' : 'var(--color-text-muted)'}
                style={isSelected ? { filter: 'drop-shadow(0 0 8px rgba(0, 255, 178, 0.5))' } : undefined}
              >
                <path d={item.icon} />
              </svg>
              <span className={cn('text-sm font-medium', isSelected ? 'text-neon-mint' : 'text-text-secondary')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <Button size="lg" onClick={() => onComplete(selectedAgent, selectedInterests)}>
        시작하기
      </Button>
    </div>
  );
}
