'use client';

import { Calendar, Download } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { TRANSPORT_LABELS } from '@/lib/utils';
import { downloadICS } from '@/lib/kakao-calendar';
import EmptyState from '@/components/ui/EmptyState';
import type { Itinerary } from '@/types';

export default function CalendarPanel() {
  const { events, removeEvent } = useCalendarStore();

  if (events.length === 0) {
    return <EmptyState icon={Calendar} title="일정 없음" description="에이전트에게 일정을 만들어달라고 해보세요" />;
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {events.map((event) => (
        <div key={event.id} className="bg-bg-surface border border-border rounded-2xl overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-subtle/50">
            <h3 className="text-[14px] font-semibold text-text-primary tracking-[-0.02em]">{event.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">{event.date}</span>
              <button onClick={() => removeEvent(event.id)} className="text-[11px] text-text-muted hover:text-[#DC2626] transition-colors cursor-pointer">삭제</button>
            </div>
          </div>
          <div className="px-4 py-2">
            {event.stops.map((stop, i) => (
              <div key={stop.order}>
                <div className="flex items-center gap-3 py-2">
                  <span className="text-[12px] text-text-muted w-10 shrink-0 tabular-nums font-medium">{stop.arrivalTime}</span>
                  <span className="relative w-2 h-2 rounded-full bg-brand shrink-0">
                    {i < event.stops.length - 1 && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-px h-7 bg-border" />}
                  </span>
                  <span className="text-[12px] text-text-primary font-medium">{stop.placeName}</span>
                  <span className="text-[11px] text-text-muted ml-auto tabular-nums">{stop.duration}분</span>
                </div>
                {i < event.stops.length - 1 && stop.travelTimeToNext > 0 && (
                  <div className="pl-[68px] pb-0.5">
                    <span className="text-[11px] text-text-muted">{TRANSPORT_LABELS[stop.transportToNext].icon} {stop.travelTimeToNext}분</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-border">
            <button
              onClick={() => downloadICS({ id: event.id, title: event.title, date: event.date, stops: event.stops } as Itinerary)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-colors cursor-pointer"
            >
              <Download size={12} />
              캘린더에 추가
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
