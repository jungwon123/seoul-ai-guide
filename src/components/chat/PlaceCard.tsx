'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Star } from 'lucide-react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';

const BookingForm = dynamic(() => import('@/components/booking/BookingForm'));

interface PlaceCardProps {
  place: Place;
  compact?: boolean;
}

export default function PlaceCard({ place, compact }: PlaceCardProps) {
  const selectPlace = useMapStore((s) => s.selectPlace);
  const setMarkers = useMapStore((s) => s.setMarkers);
  const [bookingOpen, setBookingOpen] = useState(false);

  const cat = CATEGORY_CONFIG[place.category];

  const handleViewOnMap = () => {
    setMarkers([place]);
    selectPlace(place);
  };

  return (
    <>
      <div className="group bg-bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border-strong hover:-translate-y-[1px]">
        <div className="relative h-28 bg-bg-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          <span
            className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[11px] font-medium text-white/90 backdrop-blur-sm"
            style={{ backgroundColor: `${cat.color}CC` }}
          >
            {cat.label}
          </span>
          <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-white/90 bg-black/30 backdrop-blur-sm">
            <Star size={10} fill="currentColor" />
            {place.rating}
          </span>
        </div>

        <div className="px-3.5 py-3">
          <h4 className="text-[15px] font-semibold text-text-primary tracking-[-0.02em] leading-tight">
            {place.name}
          </h4>
          <div className="flex items-center gap-1 mt-1.5 text-[12px] text-text-muted">
            <MapPin size={11} strokeWidth={1.5} />
            <span className="truncate">{place.address}</span>
          </div>
          {!compact && (
            <p className="text-[13px] text-text-secondary mt-2 leading-[1.6] line-clamp-2">
              {place.summary}
            </p>
          )}
          {!compact && (
            <div className="flex gap-3 mt-3 pt-3 border-t border-border">
              <button
                onClick={handleViewOnMap}
                className="text-[12px] font-medium text-brand hover:text-brand-hover transition-colors cursor-pointer"
                aria-label={`${place.name} 지도에서 보기`}
              >
                지도에서 보기
              </button>
              <button
                onClick={() => setBookingOpen(true)}
                className="text-[12px] font-medium text-brand hover:text-brand-hover transition-colors cursor-pointer"
                aria-label={`${place.name} 예약하기`}
              >
                예약하기
              </button>
            </div>
          )}
        </div>
      </div>

      {bookingOpen && (
        <BookingForm
          place={place}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onSubmit={() => setBookingOpen(false)}
        />
      )}
    </>
  );
}
