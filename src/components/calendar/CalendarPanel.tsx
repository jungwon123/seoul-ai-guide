'use client';

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
    return (
      <EmptyState
        emoji="📅"
        title="일정 없음"
        description="에이전트에게 일정을 만들어달라고 해보세요"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {events.map((event) => (
        <div key={event.id} className="bg-bg-secondary border border-border-default rounded-xl p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">📅 {event.title}</h3>
            <button
              onClick={() => removeEvent(event.id)}
              className="text-text-muted hover:text-accent-coral text-xs transition-colors cursor-pointer"
            >
              삭제
            </button>
          </div>
          <p className="text-xs text-text-secondary mb-3">{event.date}</p>
          <div className="space-y-1">
            {event.stops.map((stop, i) => (
              <div key={stop.order}>
                <div className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-text-secondary w-12 shrink-0">{stop.arrivalTime}</span>
                  <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] flex items-center justify-center font-bold shrink-0">
                    {stop.order}
                  </span>
                  <span className="text-xs text-text-primary">{stop.placeName}</span>
                  <span className="text-[10px] text-text-muted ml-auto">{stop.duration}분</span>
                </div>
                {i < event.stops.length - 1 && stop.travelTimeToNext > 0 && (
                  <div className="flex items-center gap-3 py-0.5 pl-12">
                    <span className="text-[10px] text-text-muted">
                      {TRANSPORT_LABELS[stop.transportToNext].emoji} {stop.travelTimeToNext}분
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border-default">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadICS(event)}
            >
              캘린더에 추가 (.ics 다운로드)
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
