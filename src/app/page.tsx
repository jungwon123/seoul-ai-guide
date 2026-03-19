'use client';

import { useState, useEffect } from 'react';
import { Menu, MapPin, Calendar, Ticket } from 'lucide-react';
import ChatPanel from '@/components/chat/ChatPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import MapPanel from '@/components/map/MapPanel';
import CalendarPanel from '@/components/calendar/CalendarPanel';
import BookingPanel from '@/components/booking/BookingPanel';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import MobileTabBar from '@/components/ui/MobileTabBar';
import SideSheet from '@/components/ui/SideSheet';
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        <header className="flex items-center justify-between px-3 sm:px-5 h-[48px] shrink-0 border-b border-border bg-bg-surface/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
              aria-label="대화 내역 열기"
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>
            <h1 className="text-[17px] text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
              Seoul Edit
            </h1>
          </div>
          {/* Desktop context tab buttons */}
          <div className="hidden lg:flex items-center gap-1">
            {CONTEXT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = sheetOpen && contextTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setContextTab(tab.key);
                    setSheetOpen(!(sheetOpen && contextTab === tab.key));
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer',
                    isActive
                      ? 'bg-brand-subtle text-brand'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-subtle',
                  )}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Chat Sidebar */}
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Desktop — Chat centered, context as side sheet */}
        <div className="flex-1 hidden lg:flex overflow-hidden justify-center">
          <div className="w-full max-w-[520px] flex flex-col border-x border-border">
            <ErrorBoundary><ChatPanel /></ErrorBoundary>
          </div>
        </div>

        {/* Desktop side sheet */}
        <div className="hidden lg:block">
          <SideSheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title={CONTEXT_TABS.find((t) => t.key === contextTab)?.label || ''}
          >
            <ErrorBoundary>
              {contextTab === 'map' && <MapPanel />}
              {contextTab === 'calendar' && <CalendarPanel />}
              {contextTab === 'booking' && <BookingPanel />}
            </ErrorBoundary>
          </SideSheet>
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
