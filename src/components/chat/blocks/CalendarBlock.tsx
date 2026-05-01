import type { CalendarBlock as CalendarBlockData } from '@/types/api';
import { Calendar, ExternalLink, MapPin } from 'lucide-react';

export default function CalendarBlock({ data }: { data: CalendarBlockData }) {
  return (
    <div className="rounded-xl border-2 border-border-strong bg-bg-surface p-4 shadow-[2px_2px_0_rgba(15,15,15,0.9)]">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">
        <Calendar size={12} /> 일정 등록 완료
      </div>
      <div className="font-display text-lg mb-1.5">{data.title ?? '일정'}</div>
      {data.start_time && (
        <div className="text-sm text-text-secondary">
          {new Date(data.start_time).toLocaleString('ko-KR')}
          {data.end_time && ` ~ ${new Date(data.end_time).toLocaleString('ko-KR')}`}
        </div>
      )}
      {data.location && (
        <div className="text-sm text-text-secondary inline-flex items-center gap-1 mt-0.5">
          <MapPin size={12} /> {data.location}
        </div>
      )}
      {data.calendar_link && (
        <a
          href={data.calendar_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-sm text-brand font-medium hover:underline"
        >
          캘린더에서 열기 <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
