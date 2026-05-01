import type { EventsBlock as EventsBlockData } from '@/types/api';
import { Calendar as CalendarIcon, MapPin } from 'lucide-react';

export default function EventsBlock({ data }: { data: EventsBlockData }) {
  if (!data.items?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {data.items.map((ev) => (
        <a
          key={ev.event_id}
          href={ev.homepage_url ?? '#'}
          target={ev.homepage_url ? '_blank' : undefined}
          rel={ev.homepage_url ? 'noopener noreferrer' : undefined}
          className="block rounded-xl border border-border bg-bg-surface p-3 hover:border-border-strong transition-colors"
        >
          <div className="flex gap-3">
            {ev.image_url && (
              <img
                src={ev.image_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{ev.title}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                {(ev.start_date || ev.end_date) && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon size={12} />
                    {ev.start_date}
                    {ev.end_date && ev.end_date !== ev.start_date ? ` ~ ${ev.end_date}` : ''}
                  </span>
                )}
                {(ev.place_name || ev.address) && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin size={12} />
                    {ev.place_name ?? ev.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
