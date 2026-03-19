'use client';

import { Clock } from 'lucide-react';
import type { Itinerary } from '@/types';
import { TRANSPORT_LABELS } from '@/lib/utils';
import { useCalendarStore } from '@/stores/calendarStore';

export default function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  const addEvent = useCalendarStore((s) => s.addEvent);

  return (
    <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-subtle/50">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-text-muted" strokeWidth={1.5} />
          <h4 className="text-[14px] font-semibold text-text-primary tracking-[-0.02em]">
            {itinerary.title}
          </h4>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-2.5">
        {itinerary.stops.map((stop, i) => (
          <div key={stop.order} className="relative">
            <div className="flex items-center gap-3 py-2.5">
              <span className="text-[12px] text-text-muted w-10 shrink-0 tabular-nums font-medium">{stop.arrivalTime}</span>
              <span className="relative w-2 h-2 rounded-full bg-brand shrink-0">
                {i < itinerary.stops.length - 1 && (
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 w-px h-8 bg-border" />
                )}
              </span>
              <span className="text-[13px] text-text-primary font-medium">{stop.placeName}</span>
              <span className="text-[11px] text-text-muted ml-auto tabular-nums">{stop.duration}분</span>
            </div>
            {i < itinerary.stops.length - 1 && stop.travelTimeToNext > 0 && (
              <div className="pl-[68px] pb-1">
                <span className="text-[11px] text-text-muted">
                  {TRANSPORT_LABELS[stop.transportToNext].icon} {TRANSPORT_LABELS[stop.transportToNext].label} {stop.travelTimeToNext}분
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex border-t border-border">
        <button className="flex-1 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-colors cursor-pointer border-r border-border">
          경로 보기
        </button>
        <button onClick={() => addEvent(itinerary)} className="flex-1 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-colors cursor-pointer">
          일정 추가
        </button>
      </div>
    </div>
  );
}
