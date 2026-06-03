import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Bookmark, MapPin, Calendar, HelpCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useMapStore } from '@/stores/mapStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useAuthStore } from '@/stores/authStore';
import { useTourStore } from '@/stores/tourStore';
import { cn } from '@/lib/utils';
import TourOverlay from '@/components/onboarding/TourOverlay';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInputConnected from '@/components/chat/ChatInputConnected';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LottiePlayer from '@/components/ui/LottiePlayer';
import AgentOrb from '@/components/agent/AgentOrb';

// Overlay panels — lazy loaded so the initial chat view never pulls in
// three.js / google-maps / calendar. These only load on first tab tap.
const MapPanel = lazy(() => import('@/components/map/MapPanel'));
const CalendarPanel = lazy(() => import('@/components/calendar/CalendarPanel'));
const BookmarkPanel = lazy(() => import('@/components/bookmark/BookmarkPanel'));

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
        className="pointer-events-none absolute top-0 left-0 w-9 h-9 rounded-xl bg-accent-mint border border-border-strong transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
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
            data-tour={`nav-${item.key}`}
            onClick={() => onSelect(isActive ? null : item.key)}
            className={cn(
              'relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer active:scale-[0.92] motion-safe:transition-transform',
              isActive
                ? 'text-accent-mint-ink'
                : 'text-text-primary hover:bg-black/10',
            )}
            aria-label={item.label}
            aria-pressed={isActive}
          >
            <Icon size={17} strokeWidth={1.6} />
            {badge > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9.5px] font-semibold tabular-nums transition-colors',
                  isActive ? 'bg-border-strong text-bg-surface' : 'bg-text-primary text-bg-surface',
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

  const initWelcome = useChatStore((s) => s.initWelcome);
  const loadChatsFromServer = useChatStore((s) => s.loadFromServer);
  const loadBookmarksFromServer = useBookmarkStore((s) => s.loadFromServer);
  const authToken = useAuthStore((s) => s.token);
  const navigation = useMapStore((s) => s.navigation);

  const placeCount = useBookmarkStore((s) => s.bookmarkedIds.length);
  const messageCount = useBookmarkStore((s) => s.messageItems.length);
  const totalBookmarks = placeCount + messageCount;

  useEffect(() => { initWelcome(); }, [initWelcome]);

  // 첫 진입 시 기능 안내 투어 자동 1회. (이미 본 적 있으면 실행 안 함 — localStorage)
  const startTour = useTourStore((s) => s.start);
  useEffect(() => { useTourStore.getState().maybeAutoStart(); }, []);

  // 로그인 직후 + 새로고침 시 BE thread/북마크 목록 동기화. 비로그인 상태에선 호출 안 함.
  useEffect(() => {
    if (!authToken) return;
    loadChatsFromServer();
    loadBookmarksFromServer();
  }, [authToken, loadChatsFromServer, loadBookmarksFromServer]);

  useEffect(() => {
    if (navigation) setOverlay('map');
  }, [navigation]);

  // 카드 클릭(selectPlace) 시 지도 오버레이 자동 오픈.
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  useEffect(() => {
    if (selectedPlace) setOverlay('map');
  }, [selectedPlace]);

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

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-warm-gradient">
        <header className="flex items-center justify-between px-3 h-[52px] shrink-0 border-b-2 border-border-strong bg-warm-gradient z-20">
          <ChatHeader onOpenSidebar={openSidebar} onGoHome={goHome} />
          <div className="flex items-center gap-1">
            <button
              onClick={startTour}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-primary hover:bg-black/10 transition-colors cursor-pointer"
              aria-label="기능 안내 다시 보기"
            >
              <HelpCircle size={17} strokeWidth={1.6} />
            </button>
            <NavButtons overlay={overlay} onSelect={selectOverlay} bookmarkCount={totalBookmarks} />
          </div>
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
            <header className="flex items-center justify-between px-3 h-[52px] shrink-0 border-b-2 border-border-strong bg-warm-gradient">
              <button
                onClick={closeOverlay}
                className="flex items-center gap-2 cursor-pointer group"
                aria-label="대화로 돌아가기"
              >
                <div className="w-8 h-8 shrink-0">
                  <AgentOrb state="idle" size={32} interactive={false} bold />
                </div>
                <h2 className="text-[15px] font-semibold text-text-primary">
                  {NAV_ITEMS.find((n) => n.key === overlay)?.label}
                </h2>
              </button>
              <button onClick={closeOverlay} className="text-[13px] font-semibold text-text-primary cursor-pointer px-2">닫기</button>
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

        <TourOverlay />
      </div>
    </ErrorBoundary>
  );
}
