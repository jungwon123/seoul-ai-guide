'use client';

import { Calendar } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { TRANSPORT_LABELS } from '@/lib/utils';
import { downloadICS } from '@/lib/kakao-calendar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import type { Itinerary } from '@/types';

export default function CalendarPanel() {
  const { events, removeEvent } = useCalendarStore();

  const handleDownloadICS = (event: { id: string; title: string; date: string; stops: Itinerary['stops'] }) => {
    downloadICS(event as Itinerary);
  };

  if (events.length === 0) {
    return <EmptyState icon={Calendar} title="일정 없음" description="에이전트에게 일정을 만들어달라고 해보세요" />;
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {events.map((event) => (
        <div key={event.id} className="bg-bg-surface border border-border rounded-xl p-3.5 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-text-primary">{event.title}</h3>
            <button onClick={() => removeEvent(event.id)} className="text-text-muted hover:text-[#D9534F] text-[11px] transition-colors cursor-pointer">
              삭제
            </button>
          </div>
          <p className="text-[12px] text-text-muted mb-3">{event.date}</p>
          <div className="space-y-0.5">
            {event.stops.map((stop, i) => (
              <div key={stop.order}>
                <div className="flex items-center gap-2.5 py-1.5">
                  <span className="text-[12px] text-text-muted w-10 shrink-0 tabular-nums">{stop.arrivalTime}</span>
                  <span className="w-5 h-5 rounded-md bg-brand-subtle text-brand text-[10px] flex items-center justify-center font-semibold shrink-0">{stop.order}</span>
                  <span className="text-[12px] text-text-primary">{stop.placeName}</span>
                  <span className="text-[11px] text-text-muted ml-auto">{stop.duration}분</span>
                </div>
                {i < event.stops.length - 1 && stop.travelTimeToNext > 0 && (
                  <div className="pl-[52px] py-0.5">
                    <span className="text-[11px] text-text-muted">{TRANSPORT_LABELS[stop.transportToNext].icon} {stop.travelTimeToNext}분</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => handleDownloadICS(event)}>캘린더에 추가 (.ics)</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
