'use client';

import { useState, useEffect } from 'react';
import ChatPanel from '@/components/chat/ChatPanel';
import MapPanel from '@/components/map/MapPanel';
import CalendarPanel from '@/components/calendar/CalendarPanel';
import BookingPanel from '@/components/booking/BookingPanel';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import MobileTabBar from '@/components/ui/MobileTabBar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import type { AgentType } from '@/types';

type ContextTab = 'map' | 'calendar' | 'booking';
type MobileTab = 'chat' | 'map' | 'calendar' | 'booking';

const CONTEXT_TABS: { key: ContextTab; label: string; emoji: string }[] = [
  { key: 'map', label: '지도', emoji: '🗺️' },
  { key: 'calendar', label: '일정', emoji: '📅' },
  { key: 'booking', label: '예약', emoji: '🎟' },
];

export default function Home() {
  const [contextTab, setContextTab] = useState<ContextTab>('map');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const setAgent = useChatStore((s) => s.setAgent);

  useEffect(() => {
    const stored = localStorage.getItem('seoul-ai-guide-onboarded');
    setOnboarded(stored === 'true');
  }, []);

  const handleOnboardingComplete = (agent: AgentType, _interests: string[]) => {
    localStorage.setItem('seoul-ai-guide-onboarded', 'true');
    localStorage.setItem('seoul-ai-guide-agent', agent);
    setAgent(agent);
    setOnboarded(true);
  };

  if (onboarded === null) {
    return <div className="h-full bg-bg-primary" />;
  }

  if (!onboarded) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-bg-primary">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border-default bg-bg-secondary/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center">
              <span className="text-brand-primary font-bold text-xs sm:text-sm">S</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              Seoul AI Guide
            </h1>
          </div>
          <span className="text-[10px] sm:text-xs text-text-muted">Phase 1 · Mock</span>
        </header>

        {/* === Desktop Layout === */}
        <div className="flex-1 hidden lg:flex overflow-hidden">
          {/* Chat Panel - Left 60% */}
          <div className="w-[60%] border-r border-border-default flex flex-col">
            <ErrorBoundary>
              <ChatPanel />
            </ErrorBoundary>
          </div>

          {/* Context Panel - Right 40% */}
          <div className="w-[40%] flex flex-col">
            <div className="flex border-b border-border-default bg-bg-secondary/30 shrink-0">
              {CONTEXT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setContextTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer',
                    contextTab === tab.key
                      ? 'text-brand-primary border-b-2 border-brand-primary bg-brand-primary/5'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {contextTab === 'map' && <MapPanel />}
                {contextTab === 'calendar' && <CalendarPanel />}
                {contextTab === 'booking' && <BookingPanel />}
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* === Mobile Layout === */}
        <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary>
              {mobileTab === 'chat' && <ChatPanel />}
              {mobileTab === 'map' && <MapPanel />}
              {mobileTab === 'calendar' && <CalendarPanel />}
              {mobileTab === 'booking' && <BookingPanel />}
            </ErrorBoundary>
          </div>
          <MobileTabBar active={mobileTab} onSelect={setMobileTab} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
