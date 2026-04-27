import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { MapPin, Box, Map, Flame, Route } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { CONGESTION_CONFIG } from '@/lib/utils';
import placesData from '@/mocks/places.json';
import type { Place } from '@/types';
import PlaceOverlayCarousel from './PlaceOverlayCarousel';
import EmptyState from '@/components/ui/EmptyState';
import LottiePlayer from '@/components/ui/LottiePlayer';
import GoogleMap from './GoogleMap';
import NavigationHUD from './NavigationHUD';
import ItineraryDetailPanel from './ItineraryDetailPanel';
import ItineraryBottomSheet from './ItineraryBottomSheet';
import { useIsDesktop } from '@/lib/useMediaQuery';

// Three.js is heavy (~600KB of ES modules). Only pull it when the user
// actually toggles 3D view — keeps Map tab open itself fast.
const ThreeMap = lazy(() => import('./ThreeMap'));

export default function MapPanel() {
  const markers = useMapStore((s) => s.markers);
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  const selectPlace = useMapStore((s) => s.selectPlace);
  const mapCenter = useMapStore((s) => s.mapCenter);
  const navigation = useMapStore((s) => s.navigation);
  const bookmarkedIds = useBookmarkStore((s) => s.bookmarkedIds);
  const getBookmarkedPlaces = useBookmarkStore((s) => s.getBookmarkedPlaces);
  const isDesktop = useIsDesktop();

  // Combine: bookmarks (always) + agent recommendations (if any, dedup by id)
  const displayMarkers = useMemo(() => {
    const bookmarks = getBookmarkedPlaces();
    const bookmarkIds = new Set(bookmarks.map((p) => p.id));
    const bookmarkItems = bookmarks.map((p) => ({ ...p, isBookmark: true as const }));
    const recItems = markers
      .filter((p) => !bookmarkIds.has(p.id))
      .map((p) => ({ ...p, isBookmark: false as const }));
    return [...bookmarkItems, ...recItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, bookmarkedIds, getBookmarkedPlaces]);

  const handleCloseOverlay = useCallback(() => selectPlace(null), [selectPlace]);

  const handleSelectById = useCallback(
    (id: string) => {
      const place = displayMarkers.find((p) => p.id === id);
      if (place) selectPlace(place);
    },
    [displayMarkers, selectPlace],
  );

  const [is3D, setIs3D] = useState(false);
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [loading3D, setLoading3D] = useState(false);
  const [buildingCount, setBuildingCount] = useState(0);
  const [error3D, setError3D] = useState<string | null>(null);

  // Reset to 2D when navigation starts (Claude-style 2D map + side panel)
  const isNavigating = navigation !== null;
  useEffect(() => {
    if (isNavigating) setIs3D(false);
  }, [isNavigating]);

  // Route panel visibility — toggled by the "경로" button. Auto-opens when a new itinerary begins.
  const [routePanelOpen, setRoutePanelOpen] = useState(true);
  const navId = navigation?.itinerary.id ?? null;
  useEffect(() => { if (navId) setRoutePanelOpen(true); }, [navId]);
  const closeRoutePanel = useCallback(() => setRoutePanelOpen(false), []);

  const handleLoadingChange = useCallback((v: boolean) => setLoading3D(v), []);
  const handleBuildingCount = useCallback((n: number) => setBuildingCount(n), []);
  const handleError = useCallback((msg: string) => {
    setError3D(msg);
    setTimeout(() => setError3D(null), 4000);
  }, []);

  const hasContent = displayMarkers.length > 0 || is3D;

  // Congestion overlay data: all places with congestion → fixed geo-radius circles
  const congestionPoints = useMemo(
    () => (placesData as Place[])
      .filter((p): p is Place & { congestion: NonNullable<Place['congestion']> } => !!p.congestion)
      .map((p) => {
        const level = p.congestion.level;
        const cfg = CONGESTION_CONFIG[level];
        // low 150m / medium 250m / high 400m
        const radiusMeters = level === 'high' ? 400 : level === 'medium' ? 250 : 150;
        return { lat: p.lat, lng: p.lng, color: cfg.color, radiusMeters };
      }),
    [],
  );

  // Auto-off heatmap when switching to 3D (visualization is 2D-only here)
  useEffect(() => { if (is3D) setHeatmapOn(false); }, [is3D]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-bg-base">
      {/* Map area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 relative m-3 overflow-hidden rounded-2xl border border-border shadow-sm">
          {hasContent ? (
            <>
              {is3D ? (
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-bg-subtle">
                    <div className="flex items-center gap-3 bg-white/90 px-5 py-3 rounded-xl shadow-lg">
                      <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                      <span className="text-[13px] font-medium text-text-primary">3D 엔진 로딩 중…</span>
                    </div>
                  </div>
                }>
                  <ThreeMap
                    markers={displayMarkers}
                    selectedPlace={selectedPlace}
                    center={mapCenter}
                    zoom={16}
                    onLoadingChange={handleLoadingChange}
                    onBuildingCount={handleBuildingCount}
                    onError={handleError}
                    navigation={navigation}
                  />
                </Suspense>
              ) : (
                <GoogleMap
                  markers={displayMarkers}
                  selectedPlace={selectedPlace}
                  onSelectPlace={selectPlace}
                  itineraryMode={isNavigating}
                  congestionPoints={congestionPoints}
                  showHeatmap={heatmapOn}
                />
              )}

              {/* Top-right toggles */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                {!is3D && (
                  <button
                    onClick={() => setHeatmapOn((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold shadow-md transition-[background-color] duration-200 cursor-pointer ${
                      heatmapOn
                        ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                        : 'bg-white text-text-secondary hover:bg-bg-subtle border border-border'
                    }`}
                    aria-pressed={heatmapOn}
                    aria-label={heatmapOn ? '혼잡도 오버레이 끄기' : '혼잡도 오버레이 켜기'}
                  >
                    <Flame size={14} aria-hidden="true" />
                    혼잡도
                  </button>
                )}
                {navigation && !is3D && (
                  <button
                    onClick={() => setRoutePanelOpen((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold shadow-md transition-[background-color] duration-200 cursor-pointer ${
                      routePanelOpen
                        ? 'bg-brand text-white hover:bg-[#1558CC]'
                        : 'bg-white text-text-secondary hover:bg-bg-subtle border border-border'
                    }`}
                    aria-pressed={routePanelOpen}
                    aria-label={routePanelOpen ? '경로 패널 접기' : '경로 패널 펼치기'}
                  >
                    <Route size={14} aria-hidden="true" />
                    경로
                  </button>
                )}
                <button
                  onClick={() => { setIs3D(!is3D); setError3D(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold shadow-md transition-[background-color] duration-200 cursor-pointer text-white ${is3D ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-[#1558CC]'}`}
                  aria-label={is3D ? '2D 지도로 전환' : '3D 지도로 전환'}
                >
                  {is3D ? <Map size={14} aria-hidden="true" /> : <Box size={14} aria-hidden="true" />}
                  {is3D ? '2D 보기' : '3D 보기'}
                </button>
              </div>

              {/* Heatmap legend (bottom-left, only when on) */}
              {heatmapOn && !is3D && (
                <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border border-border flex items-center gap-2">
                  <span className="text-[11px] font-medium text-text-muted">여유</span>
                  <div
                    className="h-[6px] w-20 rounded-full"
                    style={{ background: 'linear-gradient(to right, #FEF3C7, #FCD34D, #F59E0B, #EF4444)' }}
                  />
                  <span className="text-[11px] font-medium text-text-muted">혼잡</span>
                </div>
              )}

              {/* 3D Loading */}
              {loading3D && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-overlay backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 bg-white/95 px-6 py-5 rounded-2xl shadow-lg">
                    <LottiePlayer
                      src="/animations/loading-3d.json"
                      className="w-16 h-16"
                      ariaLabel="3D 지도 로딩 중"
                      fallback={
                        <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                      }
                    />
                    <span className="text-[13px] font-medium text-text-primary">3D 지도 로딩 중…</span>
                  </div>
                </div>
              )}

              {/* Building count */}
              {is3D && !loading3D && buildingCount > 0 && (
                <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-text-primary/80 text-white text-[11px] font-medium backdrop-blur-sm tabular-nums">
                  {buildingCount.toLocaleString()}개 건물
                </div>
              )}

              {/* Error toast */}
              {error3D && (
                <div
                  role="alert"
                  className="absolute top-14 right-3 z-10 px-3 py-2 rounded-lg bg-red-600 text-white text-[12px] font-medium shadow-lg animate-fade-up"
                >
                  {error3D}
                </div>
              )}

              {/* Navigation HUD — only in 3D immersive mode (2D uses side panel / bottom sheet) */}
              {navigation && is3D && <NavigationHUD navigation={navigation} />}

              {/* Swipeable overlay carousel. Shows when:
                  - no navigation, or
                  - route panel is closed, or
                  - navigation + panel open but a pin was tapped (selectedPlace != null).
                  When the mobile bottom sheet is up in peek state, offset the carousel above it. */}
              {displayMarkers.length > 0 && !is3D && (
                !(navigation && routePanelOpen) || !!selectedPlace
              ) && (
                <PlaceOverlayCarousel
                  places={displayMarkers}
                  selectedId={selectedPlace?.id ?? null}
                  onSelect={handleSelectById}
                  onClose={handleCloseOverlay}
                  bottomOffset={
                    !isDesktop && navigation && routePanelOpen ? 108 : 12
                  }
                />
              )}
            </>
          ) : (
            <div className="h-full bg-bg-subtle">
              <EmptyState
                icon={MapPin}
                title="지도 탐색"
                description="에이전트에게 장소를 추천받으면 여기에 표시돼요"
              />
            </div>
          )}
        </div>

      </div>

      {/* Itinerary view — desktop side panel, mobile bottom sheet. Toggled by the "경로" button. */}
      {navigation && !is3D && routePanelOpen && (
        isDesktop
          ? <ItineraryDetailPanel navigation={navigation} onClose={closeRoutePanel} />
          : (
            <ItineraryBottomSheet
              navigation={navigation}
              onClose={closeRoutePanel}
              collapseOnSelect={!!selectedPlace}
            />
          )
      )}
    </div>
  );
}
