'use client';

import { useRef } from 'react';
import { MapPin, Star, ChevronRight } from 'lucide-react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';

interface PlaceCarouselProps {
  places: Place[];
}

export default function PlaceCarousel({ places }: PlaceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const setMarkers = useMapStore((s) => s.setMarkers);
  const selectPlace = useMapStore((s) => s.selectPlace);

  const handlePlaceClick = (place: Place) => {
    setMarkers([place]);
    selectPlace(place);
  };

  return (
    <div className="mt-3 -mx-5">
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto scroll-smooth px-5 pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {places.map((place) => {
          const cat = CATEGORY_CONFIG[place.category];
          return (
            <button
              key={place.id}
              onClick={() => handlePlaceClick(place)}
              className="flex-none w-[200px] snap-start bg-bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.97] cursor-pointer text-left"
            >
              {/* Image */}
              <div className="relative h-24 bg-bg-subtle">
                <span
                  className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-white/95 backdrop-blur-sm"
                  style={{ backgroundColor: `${cat.color}CC` }}
                >
                  {cat.label}
                </span>
              </div>
              {/* Info */}
              <div className="p-2.5">
                <h4 className="text-[13px] font-semibold text-text-primary truncate">{place.name}</h4>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
                  <Star size={10} fill="currentColor" className="text-amber-500" />
                  <span>{place.rating}</span>
                  <span className="mx-0.5">·</span>
                  <MapPin size={9} />
                  <span className="truncate">{place.address.split(' ').slice(1, 3).join(' ')}</span>
                </div>
              </div>
            </button>
          );
        })}
        {/* View all */}
        <button className="flex-none w-16 snap-start flex flex-col items-center justify-center gap-1 text-text-muted cursor-pointer">
          <ChevronRight size={20} />
          <span className="text-[10px]">더보기</span>
        </button>
      </div>
    </div>
  );
}
