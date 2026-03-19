'use client';

import type { Itinerary } from '@/types';
import { TRANSPORT_LABELS } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { useCalendarStore } from '@/stores/calendarStore';

export default function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  const addEvent = useCalendarStore((s) => s.addEvent);

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-3.5 mt-2">
      <h4 className="text-[14px] font-semibold text-text-primary mb-3" style={{ letterSpacing: '-0.2px' }}>
        {itinerary.title}
      </h4>
      <div className="space-y-0.5">
        {itinerary.stops.map((stop, i) => (
          <div key={stop.order}>
            <div className="flex items-center gap-2.5 py-1.5">
              <span className="text-[12px] text-text-muted w-10 shrink-0 tabular-nums">{stop.arrivalTime}</span>
              <span className="w-5 h-5 rounded-md bg-brand-subtle text-brand text-[10px] flex items-center justify-center font-semibold shrink-0">
                {stop.order}
              </span>
              <span className="text-[13px] text-text-primary">{stop.placeName}</span>
              <span className="text-[11px] text-text-muted ml-auto">{stop.duration}분</span>
            </div>
            {i < itinerary.stops.length - 1 && stop.travelTimeToNext > 0 && (
              <div className="flex items-center gap-2.5 py-0.5 pl-[52px]">
                <span className="text-[11px] text-text-muted">
                  {TRANSPORT_LABELS[stop.transportToNext].icon} {stop.travelTimeToNext}분
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-border">
        <Button variant="ghost" size="sm">경로 보기</Button>
        <Button variant="ghost" size="sm" onClick={() => addEvent(itinerary)}>일정 추가</Button>
      </div>
    </div>
  );
}
