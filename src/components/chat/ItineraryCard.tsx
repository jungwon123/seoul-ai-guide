'use client';

import type { Itinerary } from '@/types';
import { TRANSPORT_LABELS } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { useCalendarStore } from '@/stores/calendarStore';

interface ItineraryCardProps {
  itinerary: Itinerary;
}

export default function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const addEvent = useCalendarStore((s) => s.addEvent);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-4 mt-2">
      <h4 className="font-semibold text-text-primary text-sm mb-3">
        📅 {itinerary.title}
      </h4>
      <div className="space-y-1">
        {itinerary.stops.map((stop, i) => (
          <div key={stop.order}>
            <div className="flex items-center gap-3 py-1.5">
              <span className="text-xs text-text-secondary w-12 shrink-0">{stop.arrivalTime}</span>
              <span className="w-6 h-6 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center font-bold shrink-0">
                {stop.order}
              </span>
              <span className="text-sm text-text-primary">{stop.placeName}</span>
              <span className="text-xs text-text-muted ml-auto">{stop.duration}분</span>
            </div>
            {i < itinerary.stops.length - 1 && stop.travelTimeToNext > 0 && (
              <div className="flex items-center gap-3 py-1 pl-12">
                <span className="text-xs text-text-muted">
                  {TRANSPORT_LABELS[stop.transportToNext].emoji}{' '}
                  {TRANSPORT_LABELS[stop.transportToNext].label} {stop.travelTimeToNext}분
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-border-default">
        <Button variant="ghost" size="sm">
          경로 보기
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addEvent(itinerary)}>
          일정 추가
        </Button>
      </div>
    </div>
  );
}
