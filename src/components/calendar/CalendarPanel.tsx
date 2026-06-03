import { useEffect, useState } from 'react';
import { Calendar, Link2, ExternalLink, MapPin, AlertCircle } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { useAuthStore } from '@/stores/authStore';
import { googleCalendarApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';
import { toast } from '@/stores/toastStore';
import EmptyState from '@/components/ui/EmptyState';
import type { CalendarEventItem } from '@/types/api';

function GoogleCalendarConnectBar() {
  const [busy, setBusy] = useState(false);
  const onConnect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { auth_url } = await googleCalendarApi.getAuthUrl();
      window.location.href = auth_url;
    } catch (e) {
      toast.error(friendlyApiError(e, '연동 URL을 불러올 수 없습니다'));
      setBusy(false);
    }
  };
  return (
    <div className="px-3 pt-3">
      <button
        onClick={onConnect}
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full border-2 border-border-strong bg-bg-surface shadow-[2px_2px_0_rgba(15,15,15,0.9)] hover:shadow-[3px_3px_0_rgba(15,15,15,0.9)] transition-[box-shadow] text-[12px] font-semibold text-text-primary disabled:opacity-60 cursor-pointer"
      >
        <Link2 size={13} />
        {busy ? '이동 중...' : 'Google Calendar 연동'}
      </button>
    </div>
  );
}

function NotConnectedPanel() {
  return (
    <div className="h-full flex flex-col">
      <GoogleCalendarConnectBar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="card-poster-static rounded-2xl p-8 w-full text-center">
          <EmptyState
            icon={Link2}
            title="Google Calendar 연동 필요"
            description="연동하면 에이전트가 만든 일정이 여기에 표시됩니다"
            lottieSrc="/animations/calender.json"
          />
        </div>
      </div>
    </div>
  );
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return '시간 정보 없음';
  const s = new Date(start);
  const startStr = s.toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (!end) return startStr;
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const endStr = sameDay
    ? e.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : e.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${startStr} ~ ${endStr}`;
}

function EventCard({ event }: { event: CalendarEventItem }) {
  const removeEvent = useCalendarStore((s) => s.removeEvent);
  const isLocalBiz = event.source === 'localbiz';

  return (
    <div className="card-poster-static rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg-subtle/50">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-[14px] font-semibold text-text-primary tracking-[-0.02em] flex-1 truncate">
            {event.title || '제목 없음'}
          </h3>
          {isLocalBiz && (
            <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-subtle text-brand">
              Anyway
            </span>
          )}
        </div>
        <div className="text-[11px] text-text-muted tabular-nums">
          {formatTimeRange(event.start_time, event.end_time)}
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        {event.location && (
          <div className="flex items-start gap-1.5 text-[12px] text-text-secondary">
            <MapPin size={12} className="mt-0.5 shrink-0 text-text-muted" />
            <span className="line-clamp-2">{event.location}</span>
          </div>
        )}
        {event.description && (
          <p className="text-[12px] text-text-secondary line-clamp-3 whitespace-pre-line">
            {event.description}
          </p>
        )}
      </div>
      <div className="flex border-t border-border">
        {event.calendar_link && (
          <a
            href={event.calendar_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-brand hover:bg-brand-subtle transition-colors cursor-pointer border-r border-border"
          >
            <ExternalLink size={12} />
            캘린더 열기
          </a>
        )}
        <button
          onClick={() => removeEvent(event.event_id)}
          className="flex-1 py-2.5 text-[12px] font-medium text-text-muted hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors cursor-pointer"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export default function CalendarPanel() {
  const events = useCalendarStore((s) => s.events);
  const loading = useCalendarStore((s) => s.loading);
  const error = useCalendarStore((s) => s.error);
  const notConnected = useCalendarStore((s) => s.notConnected);
  const loadFromServer = useCalendarStore((s) => s.loadFromServer);
  const authToken = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!authToken) return;
    loadFromServer();
  }, [authToken, loadFromServer]);

  if (!authToken) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="card-poster-static rounded-2xl p-8 mx-4 text-center">
          <EmptyState
            icon={Calendar}
            title="로그인 필요"
            description="로그인하면 일정이 여기에 표시됩니다"
          />
        </div>
      </div>
    );
  }

  if (notConnected) {
    return <NotConnectedPanel />;
  }

  if (loading && events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border-strong rounded-full animate-spin border-t-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <GoogleCalendarConnectBar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="card-poster-static rounded-2xl p-6 text-center w-full max-w-xs">
            <AlertCircle size={28} className="mx-auto mb-2 text-brand" />
            <p className="text-[13px] text-text-primary mb-3">{error}</p>
            <button
              onClick={loadFromServer}
              className="px-4 py-1.5 rounded-full border-2 border-border-strong text-[12px] font-semibold text-text-primary shadow-[2px_2px_0_rgba(15,15,15,0.9)] hover:shadow-[3px_3px_0_rgba(15,15,15,0.9)] transition-[box-shadow] cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <GoogleCalendarConnectBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card-poster-static rounded-2xl p-8 w-full text-center">
            <EmptyState
              icon={Calendar}
              title="일정 없음"
              description="에이전트에게 일정을 만들어달라고 해보세요"
              lottieSrc="/animations/calender.json"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {events.map((event) => (
        <EventCard key={event.event_id} event={event} />
      ))}
    </div>
  );
}
