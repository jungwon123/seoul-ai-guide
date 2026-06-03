import type { EventsBlock as EventsBlockData } from '@/types/api';
import { Calendar as CalendarIcon, MapPin, ExternalLink } from 'lucide-react';

// 출처(source) → 표시 라벨. 매핑 없으면 원문 그대로.
const EVENT_SOURCE_LABEL: Record<string, string> = {
  '서울시문화축제': '서울시 문화축제',
  '서울시문화행사': '서울시 문화행사',
  '서울시공공서비스예약': '공공서비스예약',
  naver_blog: 'Naver 블로그',
};

export default function EventsBlock({ data }: { data: EventsBlockData }) {
  if (!data.items?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {data.items.map((ev) => {
        // 신규/구 필드명 모두 수용.
        const href = ev.detail_url ?? ev.homepage_url;
        const image = ev.poster_url ?? ev.image_url;
        const startDate = ev.date_start ?? ev.start_date;
        const endDate = ev.date_end ?? ev.end_date;
        const sourceLabel = ev.source ? EVENT_SOURCE_LABEL[ev.source] ?? ev.source : null;
        const hasLink = !!href;

        const inner = (
          <div className="flex gap-3">
            {image && (
              <img
                src={image}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1.5">
                <div className="font-medium truncate flex-1">{ev.title}</div>
                {hasLink && (
                  <ExternalLink size={13} className="text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                {(startDate || endDate) && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon size={12} aria-hidden="true" />
                    {startDate}
                    {endDate && endDate !== startDate ? ` ~ ${endDate}` : ''}
                  </span>
                )}
                {(ev.place_name || ev.address) && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin size={12} aria-hidden="true" />
                    {ev.place_name ?? ev.address}
                  </span>
                )}
                {ev.price && <span className="inline-flex items-center">{ev.price}</span>}
              </div>
              {ev.description && (
                <p className="text-[12px] text-text-secondary leading-[1.5] mt-1.5 line-clamp-2">
                  {ev.description}
                </p>
              )}
              {sourceLabel && (
                <span className="inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-bg-subtle text-text-muted">
                  {sourceLabel}
                </span>
              )}
            </div>
          </div>
        );

        // detail_url 있으면 카드 전체가 새 탭 링크(키보드 접근성은 <a> 가 기본 제공) → 포스터 리프트.
        // 없으면 정적 포스터 — cursor default, 클릭 동작 없음.
        return hasLink ? (
          <a
            key={ev.event_id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${ev.title} 자세히 보기 (새 탭)`}
            className="block rounded-xl p-3 card-poster cursor-pointer"
          >
            {inner}
          </a>
        ) : (
          <div key={ev.event_id} className="block rounded-xl p-3 card-poster-static">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
