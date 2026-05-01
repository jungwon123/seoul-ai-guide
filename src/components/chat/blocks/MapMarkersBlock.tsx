import type { MapMarkersBlock as MapMarkersData } from '@/types/api';
import { MapPin } from 'lucide-react';

export default function MapMarkersBlock({ data }: { data: MapMarkersData }) {
  if (!data.markers?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-3 text-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">
        <MapPin size={12} /> 지도에 표시된 장소 {data.markers.length}곳
      </div>
      <ul className="flex flex-col gap-1">
        {data.markers.slice(0, 8).map((m) => (
          <li key={m.place_id} className="text-text-secondary truncate">
            · {m.label ?? m.place_id}
          </li>
        ))}
      </ul>
    </div>
  );
}
