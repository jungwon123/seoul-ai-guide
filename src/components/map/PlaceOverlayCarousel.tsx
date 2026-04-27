import { memo, useCallback, useEffect, useRef } from 'react';
import type { DisplayMarker } from './GoogleMap';
import PlaceOverlayItem from './PlaceOverlayItem';

interface Props {
  places: DisplayMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Distance in px from the map bottom. Default 12. Used to offset above a bottom sheet peek. */
  bottomOffset?: number;
}

const SCROLL_STYLE: React.CSSProperties = {
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
};

export default memo(function PlaceOverlayCarousel({ places, selectedId, onSelect, onClose, bottomOffset = 12 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemsMap = useRef<Map<string, HTMLElement>>(new Map());
  // Tracks if the most recent selection change originated from carousel scroll itself
  const internalSelectionRef = useRef(false);
  // Refs keep the scroll listener stable — the effect below must NOT re-subscribe
  // on every selection change (otherwise every card swipe tears down & re-adds
  // the handler, causing needless re-renders upstream).
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const lastReportedIdRef = useRef<string | null>(selectedId);
  useEffect(() => { lastReportedIdRef.current = selectedId; }, [selectedId]);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemsMap.current.set(id, el);
    else itemsMap.current.delete(id);
  }, []);

  // Scroll to selected card ONLY when change originated externally (pin click)
  useEffect(() => {
    if (internalSelectionRef.current) {
      internalSelectionRef.current = false;
      return;
    }
    if (!selectedId) return;
    const el = itemsMap.current.get(selectedId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedId]);

  // Register scroll listener exactly once — fresh values read via refs.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    let rafId = 0;

    const findCentered = () => {
      const rootRect = root.getBoundingClientRect();
      const center = rootRect.left + rootRect.width / 2;
      let bestId: string | null = null;
      let bestDist = Infinity;
      itemsMap.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        const elCenter = r.left + r.width / 2;
        const dist = Math.abs(elCenter - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      });
      if (bestId && bestId !== lastReportedIdRef.current) {
        lastReportedIdRef.current = bestId;
        internalSelectionRef.current = true;
        onSelectRef.current(bestId);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(findCentered);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (places.length === 0) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 right-0 z-20 animate-fade-up transition-[bottom] duration-200"
      style={{ bottom: bottomOffset }}
    >
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-[7.5%] pb-1"
        style={SCROLL_STYLE}
      >
        {places.map((place) => (
          <PlaceOverlayItem
            key={place.id}
            place={place}
            isBookmark={!!place.isBookmark}
            isSelected={place.id === selectedId}
            onSelect={onSelect}
            onClose={onClose}
            registerRef={registerRef}
          />
        ))}
      </div>
    </div>
  );
});
