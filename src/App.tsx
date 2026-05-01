import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Bookmark, MapPin, Calendar } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useMapStore } from '@/stores/mapStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/useHydrated';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInputConnected from '@/components/chat/ChatInputConnected';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LottiePlayer from '@/components/ui/LottiePlayer';

// Overlay panels — lazy loaded so the initial chat view never pulls in
// three.js / google-maps / calendar. These only load on first tab tap.
const MapPanel = lazy(() => import('@/components/map/MapPanel'));
const CalendarPanel = lazy(() => import('@/components/calendar/CalendarPanel'));
const BookmarkPanel = lazy(() => import('@/components/bookmark/BookmarkPanel'));
const OnboardingFlow = lazy(() => import('@/components/onboarding/OnboardingFlow'));

type Overlay = 'bookmark' | 'map' | 'calendar' | null;

const NAV_ITEMS: { key: Exclude<Overlay, null>; label: string; icon: typeof MapPin }[] = [
  { key: 'bookmark', label: '북마크', icon: Bookmark },
  { key: 'map', label: '지도', icon: MapPin },
  { key: 'calendar', label: '일정', icon: Calendar },
];

function NavButtons({
  overlay, onSelect, bookmarkCount,
}: { overlay: Overlay; onSelect: (key: Overlay) => void; bookmarkCount: number }) {
  // 슬라이딩 인디케이터 — Linear/Vercel 스타일.
  // 버튼 36px(w-9) + gap 2px(gap-0.5) → 인덱스당 38px translateX.
  const activeIndex = overlay ? NAV_ITEMS.findIndex((n) => n.key === overlay) : -1;
  return (
    <div className="relative flex items-center gap-0.5">
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 w-9 h-9 rounded-xl bg-brand-subtle transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          transform: `translateX(${Math.max(activeIndex, 0) * 38}px)`,
          opacity: activeIndex >= 0 ? 1 : 0,
        }}
      />
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = overlay === item.key;
        const badge = item.key === 'bookmark' ? bookmarkCount : 0;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(isActive ? null : item.key)}
            className={cn(
              'relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer active:scale-[0.92] motion-safe:transition-transform',
              isActive
                ? 'text-brand'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-subtle',
            )}
            aria-label={item.label}
            aria-pressed={isActive}
          >
            <Icon size={17} strokeWidth={1.6} />
            {badge > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9.5px] font-semibold tabular-nums transition-colors',
                  isActive ? 'bg-brand text-white' : 'bg-text-primary text-bg-surface',
                )}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function OverlayFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-text-muted text-[13px]">
      <LottiePlayer
        src="/animations/loading.json"
        className="w-16 h-16"
        ariaLabel="불러오는 중"
        fallback={
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span>불러오는 중…</span>
          </div>
        }
      />
    </div>
  );
}

export default function App() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const storedOnboarded = useLocalStorage('seoul-ai-guide-onboarded');
  const [onboardedOverride, setOnboardedOverride] = useState(false);
  const onboarded = storedOnboarded === 'true' || onboardedOverride;

  const initWelcome = useChatStore((s) => s.initWelcome);
  const navigation = useMapStore((s) => s.navigation);

  const placeCount = useBookmarkStore((s) => s.bookmarkedIds.length);
  const messageCount = useBookmarkStore((s) => s.messageItems.length);
  const totalBookmarks = placeCount + messageCount;

  useEffect(() => { initWelcome(); }, [initWelcome]);

  useEffect(() => {
    if (navigation) setOverlay('map');
  }, [navigation]);

  // 카드 클릭(selectPlace) 시 지도 오버레이 자동 오픈.
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  useEffect(() => {
    if (selectedPlace) setOverlay('map');
  }, [selectedPlace]);

  const handleOnboardingComplete = useCallback(() => {
    try { localStorage.setItem('seoul-ai-guide-onboarded', 'true'); } catch { /* ignore */ }
    setOnboardedOverride(true);
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  // 오버레이 닫기 — 200ms exit 애니메이션 후 unmount.
  const closeOverlay = useCallback(() => {
    setOverlayClosing(true);
    window.setTimeout(() => {
      setOverlay(null);
      setOverlayClosing(false);
    }, 200);
  }, []);
  const goHome = useCallback(() => {
    closeOverlay();
    setSidebarOpen(false);
  }, [closeOverlay]);

  // NavButtons에서 다른 overlay로 이동할 때는 즉시 교체 (애니메이션 없이).
  const selectOverlay = useCallback(
    (key: Overlay) => {
      if (key === null) {
        closeOverlay();
      } else {
        setOverlayClosing(false);
        setOverlay(key);
      }
    },
    [closeOverlay],
  );

  if (!onboarded) {
    return (
      <Suspense fallback={<div className="h-full bg-bg-base" />}>
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-bg-base">
        <header className="flex items-center justify-between px-3 h-[52px] shrink-0 border-b border-border bg-bg-surface/90 backdrop-blur-md z-20">
          <ChatHeader onOpenSidebar={openSidebar} onGoHome={goHome} />
          <NavButtons overlay={overlay} onSelect={selectOverlay} bookmarkCount={totalBookmarks} />
        </header>

        <ChatMessages />
        <ChatInputConnected />

        <ChatSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {overlay && (
          <div
            className="fixed inset-0 z-30 bg-bg-base flex flex-col"
            style={{
              animation: overlayClosing
                ? 'overlayOut 0.2s cubic-bezier(0.32, 0.72, 0, 1) forwards'
                : 'overlayIn 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <header className="flex items-center justify-between px-3 h-[52px] shrink-0 border-b border-border bg-bg-surface">
              <button
                onClick={closeOverlay}
                className="flex items-center gap-2 cursor-pointer group"
                aria-label="대화로 돌아가기"
              >
                <LottiePlayer
                  src="/animations/AI-logo.json"
                  className="w-8 h-8 shrink-0"
                  ariaLabel="Seoul Edit AI"
                  fallback={<div className="w-8 h-8 rounded-full bg-brand-subtle border border-border" />}
                />
                <h2 className="text-[15px] font-semibold text-text-primary">
                  {NAV_ITEMS.find((n) => n.key === overlay)?.label}
                </h2>
              </button>
              <button onClick={closeOverlay} className="text-[13px] font-medium text-brand cursor-pointer px-2">닫기</button>
            </header>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                <Suspense fallback={<OverlayFallback />}>
                  {overlay === 'map' && <MapPanel />}
                  {overlay === 'calendar' && <CalendarPanel />}
                  {overlay === 'bookmark' && <BookmarkPanel onClose={closeOverlay} />}
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
