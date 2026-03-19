'use client';

import { useState } from 'react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import NeonIcon from '@/components/ui/NeonIcon';
import BookingForm from '@/components/booking/BookingForm';
import { useMapStore } from '@/stores/mapStore';

interface PlaceCardProps {
  place: Place;
  compact?: boolean;
}

export default function PlaceCard({ place, compact }: PlaceCardProps) {
  const { selectPlace, setMarkers } = useMapStore();
  const [bookingOpen, setBookingOpen] = useState(false);

  const cat = CATEGORY_CONFIG[place.category];

  const handleViewOnMap = () => {
    setMarkers([place]);
    selectPlace(place);
  };

  return (
    <>
      <div
        className="rounded-xl p-3 hover:border-border-active transition-all duration-200"
        style={{
          background: 'var(--color-bg-panel)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${cat.color}15` }}
          >
            <NeonIcon path={cat.icon} color={cat.color} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4
                className="font-bold text-text-primary text-sm truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {place.name}
              </h4>
              <Badge color={cat.color}>{cat.label}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
              <span style={{ color: '#FFD166', filter: 'drop-shadow(0 0 4px rgba(255,209,102,0.4))' }}>★ {place.rating}</span>
              <span className="opacity-40">·</span>
              <span className="truncate">{place.address}</span>
            </div>
            {!compact && (
              <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{place.summary}</p>
            )}
          </div>
        </div>
        {!compact && (
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={handleViewOnMap} aria-label={`${place.name} 지도에서 보기`}>
              지도에서 보기
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setBookingOpen(true)} aria-label={`${place.name} 예약하기`}>
              예약하기
            </Button>
          </div>
        )}
      </div>

      <BookingForm
        place={place}
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSubmit={() => setBookingOpen(false)}
      />
    </>
  );
}
