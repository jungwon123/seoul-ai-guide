import { memo } from 'react';
import { MapPin, Star, Clock, X } from 'lucide-react';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/utils';

interface Props {
  place: Place;
  onClose: () => void;
}

export default memo(function PlaceOverlayCard({ place, onClose }: Props) {
  const cat = CATEGORY_CONFIG[place.category];
  const initial = place.name.slice(0, 1);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-3 right-3 bottom-3 z-20 bg-bg-surface rounded-2xl shadow-md border border-border overflow-hidden animate-fade-up"
      role="dialog"
      aria-label={`${place.name} 상세`}
    >
      {/* Top: image + info */}
      <div className="flex gap-3 p-3">
        <div
          className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-[22px] font-semibold overflow-hidden"
          style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
        >
          {place.image ? (
            <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.02em] leading-tight truncate flex-1">
              {place.name}
            </h3>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer shrink-0"
              aria-label="닫기"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
            >
              {cat.label}
            </span>
            {place.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-text-secondary tabular-nums">
                <Star size={10} fill="currentColor" className="text-amber-500" aria-hidden="true" />
                {place.rating}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted min-w-0">
            <MapPin size={10} strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{place.address}</span>
          </div>

          {place.hours && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted">
              <Clock size={10} strokeWidth={1.5} aria-hidden="true" />
              <span className="truncate">{place.hours}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {place.summary && (
        <div className="px-3 pb-3 border-t border-border pt-2.5">
          <p className="text-[13px] text-text-primary leading-[1.55] line-clamp-3">
            {place.summary}
          </p>
        </div>
      )}
    </div>
  );
});
