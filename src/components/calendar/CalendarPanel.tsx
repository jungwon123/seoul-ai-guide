'use client';

import { useCalendarStore } from '@/stores/calendarStore';
import { TRANSPORT_LABELS } from '@/lib/utils';
import { downloadICS } from '@/lib/kakao-calendar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import type { Itinerary } from '@/types';

const CALENDAR_ICON = 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z';

export default function CalendarPanel() {
  const { events, removeEvent } = useCalendarStore();

  const handleDownloadICS = (event: { id: string; title: string; date: string; stops: Itinerary['stops'] }) => {
    downloadICS(event as Itinerary);
  };

  if (events.length === 0) {
    return (
      <EmptyState
        iconPath={CALENDAR_ICON}
        title="일정 없음"
        description="에이전트에게 일정을 만들어달라고 해보세요"
        color="#00D4FF"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-xl p-4 animate-message-in"
          style={{
            background: 'var(--color-bg-panel)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
              {event.title}
            </h3>
            <button
              onClick={() => removeEvent(event.id)}
              className="text-text-muted hover:text-neon-coral text-xs transition-colors cursor-pointer"
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
                  <span
                    className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0"
                    style={{
                      background: 'rgba(0, 255, 178, 0.15)',
                      color: '#00FFB2',
                      border: '1px solid rgba(0, 255, 178, 0.3)',
                    }}
                  >
                    {stop.order}
                  </span>
                  <span className="text-xs text-text-primary">{stop.placeName}</span>
                  <span className="text-[10px] text-text-muted ml-auto">{stop.duration}분</span>
                </div>
                {i < event.stops.length - 1 && stop.travelTimeToNext > 0 && (
                  <div className="flex items-center gap-3 py-0.5 pl-12">
                    <span className="text-[10px] text-text-muted">
                      {TRANSPORT_LABELS[stop.transportToNext].icon} {stop.travelTimeToNext}분
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-default)' }}>
            <Button variant="ghost" size="sm" onClick={() => handleDownloadICS(event)}>
              캘린더에 추가 (.ics)
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
