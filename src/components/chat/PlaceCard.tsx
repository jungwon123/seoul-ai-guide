'use client';

import { useState } from 'react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
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
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden transition-all duration-150 hover:border-border-strong hover:shadow-md hover:-translate-y-px cursor-pointer">
        {/* Image placeholder */}
        <div className="w-full h-24 bg-bg-subtle" />
        <div className="p-3">
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold text-text-primary truncate" style={{ letterSpacing: '-0.2px' }}>
              {place.name}
            </h4>
            <Badge color={cat.color}>{cat.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[12px] text-text-muted">
            <span>★ {place.rating}</span>
            <span>·</span>
            <span className="truncate">{place.address}</span>
          </div>
          {!compact && (
            <p className="text-[12px] text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{place.summary}</p>
          )}
          {!compact && (
            <div className="flex gap-2 mt-3 pt-2.5 border-t border-border">
              <Button variant="ghost" size="sm" onClick={handleViewOnMap} aria-label={`${place.name} 지도에서 보기`}>
                지도에서 보기
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setBookingOpen(true)} aria-label={`${place.name} 예약하기`}>
                예약하기
              </Button>
            </div>
          )}
        </div>
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
