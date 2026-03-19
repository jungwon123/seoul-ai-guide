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

const CONTEXT_TABS: { key: ContextTab; label: string }[] = [
  { key: 'map', label: '지도' },
  { key: 'calendar', label: '일정' },
  { key: 'booking', label: '예약' },
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
    return <div className="h-full" style={{ background: 'radial-gradient(ellipse at 20% 50%, #0d1528 0%, #050810 60%)' }} />;
  }

  if (!onboarded) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Header with scanline */}
        <header
          className="relative flex items-center justify-between px-4 sm:px-6 py-3 shrink-0 overflow-hidden"
          style={{
            background: 'rgba(5, 8, 16, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-border-default)',
            boxShadow: '0 1px 0 rgba(0, 255, 178, 0.1)',
          }}
        >
          {/* Neon scanline */}
          <div
            className="absolute bottom-0 left-0 h-px"
            style={{
              width: '100px',
              background: 'linear-gradient(90deg, transparent, #00FFB2, transparent)',
              animation: 'scanline 3s linear infinite',
            }}
          />

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="text-lg sm:text-xl font-extrabold tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #00FFB2, #00D4FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              S
            </span>
            <h1
              className="text-base sm:text-lg font-bold text-text-primary tracking-tight"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}
            >
              Seoul AI Guide
            </h1>
          </div>
          <span className="text-[10px] sm:text-xs text-text-muted">Phase 1</span>
        </header>

        {/* === Desktop Layout === */}
        <div className="flex-1 hidden lg:flex overflow-hidden">
          <div className="w-[60%] border-r border-border-default flex flex-col">
            <ErrorBoundary><ChatPanel /></ErrorBoundary>
          </div>

          <div className="w-[40%] flex flex-col">
            <div className="flex glass-panel border-b border-border-default shrink-0">
              {CONTEXT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setContextTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center px-4 py-3 text-[13px] font-medium transition-all duration-200 cursor-pointer',
                    contextTab === tab.key
                      ? 'text-neon-mint'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                  style={contextTab === tab.key ? {
                    borderBottom: '2px solid #00FFB2',
                    background: 'rgba(0, 255, 178, 0.05)',
                    boxShadow: '0 2px 8px rgba(0, 255, 178, 0.1)',
                  } : undefined}
                >
                  {tab.label}
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
