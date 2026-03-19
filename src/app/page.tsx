'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, MapPin, Calendar, Ticket } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { AGENT_COLORS } from '@/lib/utils';
import CompactOrb from '@/components/agent/CompactOrb';
import AgentSwitcher from '@/components/chat/AgentSwitcher';
import ChatSidebar from '@/components/chat/ChatSidebar';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';
import MapPanel from '@/components/map/MapPanel';
import CalendarPanel from '@/components/calendar/CalendarPanel';
import BookingPanel from '@/components/booking/BookingPanel';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { cn } from '@/lib/utils';
import type { AgentType } from '@/types';

type Overlay = 'map' | 'calendar' | 'booking' | null;

const NAV_ITEMS: { key: Exclude<Overlay, null>; label: string; icon: typeof MapPin }[] = [
  { key: 'map', label: '지도', icon: MapPin },
  { key: 'calendar', label: '일정', icon: Calendar },
  { key: 'booking', label: '예약', icon: Ticket },
];

export default function Home() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('seoul-ai-guide-onboarded') === 'true';
    } catch { return false; }
  });

  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const streamingText = useChatStore((s) => s.streamingText);
  const selectedAgent = useChatStore((s) => s.selectedAgent);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setAgent = useChatStore((s) => s.setAgent);
  const initWelcome = useChatStore((s) => s.initWelcome);

  const scrollRef = useRef<HTMLDivElement>(null);
  const agentColor = AGENT_COLORS[selectedAgent];
  const hasOnlyWelcome = messages.length <= 1;

  useEffect(() => { initWelcome(); }, [initWelcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, streamingText]);

  const handleOnboardingComplete = (agent: AgentType, _interests: string[]) => {
    try {
      localStorage.setItem('seoul-ai-guide-onboarded', 'true');
      localStorage.setItem('seoul-ai-guide-agent', agent);
    } catch { /* ignore */ }
    setAgent(agent);
    setOnboarded(true);
  };

  if (onboarded === null) return <div className="h-full bg-bg-base" />;
  if (!onboarded) return <OnboardingFlow onComplete={handleOnboardingComplete} />;

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-bg-base">
        {/* ===== Header ===== */}
        <header className="flex items-center justify-between px-3 h-[52px] shrink-0 border-b border-border bg-bg-surface/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
              aria-label="대화 내역"
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>
            <CompactOrb
              agent={selectedAgent}
              isActive={isLoading}
              onClick={() => setSwitcherOpen(true)}
            />
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = overlay === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setOverlay(isActive ? null : item.key)}
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer',
                    isActive
                      ? 'bg-brand-subtle text-brand'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-subtle',
                  )}
                  aria-label={item.label}
                >
                  <Icon size={17} strokeWidth={1.6} />
                </button>
              );
            })}
          </div>
        </header>

        {/* ===== Chat messages (scrollable full area) ===== */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Welcome state */}
          {hasOnlyWelcome && (
            <div className="flex flex-col items-center justify-center pt-20 pb-8 px-8 animate-fade-up">
              <div className="relative mb-6">
                {/* Hero orb */}
                <div
                  className="w-20 h-20 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${AGENT_COLORS[selectedAgent]}40, ${AGENT_COLORS[selectedAgent]}15)`,
                    boxShadow: `0 8px 32px ${AGENT_COLORS[selectedAgent]}15`,
                    animation: 'compactBreathe 4s ease-in-out infinite',
                  }}
                />
              </div>
              <h2
                className="text-[22px] font-bold text-text-primary mb-2 tracking-tight"
              >
                서울을 탐색해보세요
              </h2>
              <p className="text-[14px] text-text-muted text-center leading-relaxed max-w-[260px]">
                장소 추천, 코스 설계, 예약까지
                <br />무엇이든 물어보세요
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="px-4 pb-4 space-y-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming */}
            {isLoading && streamingText && (
              <div className="flex gap-2.5 pr-4 animate-message">
                <div
                  className="w-6 h-6 rounded-[8px] flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5"
                  style={{ backgroundColor: `${agentColor}08`, color: agentColor, border: `1px solid ${agentColor}15` }}
                >
                  {selectedAgent[0].toUpperCase()}
                </div>
                <div className="flex-1 text-[14px] leading-[1.7] text-text-primary">
                  {streamingText}
                  <span className="inline-block w-[2px] h-[14px] bg-brand ml-[1px] align-text-bottom" style={{ animation: 'cursorBlink 1s step-end infinite' }} />
                </div>
              </div>
            )}

            {isLoading && !streamingText && <TypingIndicator agent={selectedAgent} />}
          </div>
        </div>

        {/* ===== Input (fixed bottom) ===== */}
        <div className="shrink-0 border-t border-border bg-bg-surface/90 backdrop-blur-md">
          <ChatInput onSend={sendMessage} disabled={isLoading} showChips={hasOnlyWelcome} />
        </div>

        {/* ===== Overlays ===== */}

        {/* Sidebar */}
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Agent Switcher */}
        <AgentSwitcher
          isOpen={switcherOpen}
          current={selectedAgent}
          onSelect={setAgent}
          onClose={() => setSwitcherOpen(false)}
        />

        {/* Full-screen overlay for Map/Calendar/Booking */}
        {overlay && (
          <div className="fixed inset-0 z-30 bg-bg-base flex flex-col" style={{ animation: 'overlayIn 0.25s cubic-bezier(0.32, 0.72, 0, 1)' }}>
            <header className="flex items-center justify-between px-4 h-[52px] shrink-0 border-b border-border bg-bg-surface">
              <h2 className="text-[16px] font-semibold text-text-primary">
                {NAV_ITEMS.find((n) => n.key === overlay)?.label}
              </h2>
              <button
                onClick={() => setOverlay(null)}
                className="text-[13px] font-medium text-brand cursor-pointer"
              >
                닫기
              </button>
            </header>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {overlay === 'map' && <MapPanel />}
                {overlay === 'calendar' && <CalendarPanel />}
                {overlay === 'booking' && <BookingPanel />}
              </ErrorBoundary>
            </div>
          </div>
        )}

        <style>{`
          @keyframes overlayIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes compactBreathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.04); }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
