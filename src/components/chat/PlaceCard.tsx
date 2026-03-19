'use client';

import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useMapStore } from '@/stores/mapStore';

interface PlaceCardProps {
  place: Place;
  compact?: boolean;
}

export default function PlaceCard({ place, compact }: PlaceCardProps) {
  const { selectPlace, setMarkers } = useMapStore();

  const cat = CATEGORY_CONFIG[place.category];

  const handleViewOnMap = () => {
    setMarkers([place]);
    selectPlace(place);
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-3 hover:border-border-active transition-all duration-200">
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${cat.color}15` }}
        >
          {cat.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-text-primary text-sm truncate">{place.name}</h4>
            <Badge color={cat.color}>{cat.label}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
            <span className="text-accent-gold">★ {place.rating}</span>
            <span>·</span>
            <span className="truncate">{place.address}</span>
          </div>
          {!compact && (
            <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{place.summary}</p>
          )}
        </div>
      </div>
      {!compact && (
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={handleViewOnMap}>
            지도에서 보기
          </Button>
          <Button variant="ghost" size="sm">
            예약하기
          </Button>
        </div>
      )}
    </div>
  );
}
