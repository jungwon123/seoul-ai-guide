'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Ticket } from 'lucide-react';
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

const CONTEXT_TABS: { key: ContextTab; label: string; icon: typeof MapPin }[] = [
  { key: 'map', label: '지도', icon: MapPin },
  { key: 'calendar', label: '일정', icon: Calendar },
  { key: 'booking', label: '예약', icon: Ticket },
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

  if (onboarded === null) return <div className="h-full bg-bg-base" />;
  if (!onboarded) return <OnboardingFlow onComplete={handleOnboardingComplete} />;

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-bg-base">
        {/* Header */}
        <header className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b border-border bg-bg-base/85 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <h1
              className="text-[18px] text-text-primary"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Seoul Edit
            </h1>
            <span className="h-4 w-px bg-border" />
            <span className="text-[11px] text-text-muted font-medium tracking-[0.04em]">AI Travel Curation</span>
          </div>
          <span className="text-[11px] text-text-muted font-medium">Phase 1</span>
        </header>

        {/* Desktop */}
        <div className="flex-1 hidden lg:grid overflow-hidden" style={{ gridTemplateColumns: '420px 1fr' }}>
          <div className="border-r border-border flex flex-col">
            <ErrorBoundary><ChatPanel /></ErrorBoundary>
          </div>
          <div className="flex flex-col bg-bg-base">
            {/* Context tabs */}
            <div className="flex border-b border-border px-5 shrink-0">
              {CONTEXT_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = contextTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setContextTab(tab.key)}
                    className={cn(
                      'group relative flex items-center gap-1.5 px-3 py-3.5 text-[13px] font-medium transition-colors duration-150 cursor-pointer',
                      isActive ? 'text-brand' : 'text-text-muted hover:text-text-secondary',
                    )}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {tab.label}
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-brand transition-all duration-200"
                      style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'scaleX(1)' : 'scaleX(0)' }}
                    />
                  </button>
                );
              })}
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

        {/* Mobile */}
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
