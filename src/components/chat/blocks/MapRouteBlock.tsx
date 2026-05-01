import type { MapRouteBlock as MapRouteData } from '@/types/api';
import { Route } from 'lucide-react';

export default function MapRouteBlock({ data }: { data: MapRouteData }) {
  const distanceKm = data.distance_meters ? (data.distance_meters / 1000).toFixed(1) : null;
  const durationMin = data.duration_seconds ? Math.round(data.duration_seconds / 60) : null;
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-3 text-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1.5">
        <Route size={12} /> 경로
      </div>
      <div className="text-text-secondary">
        {distanceKm && <span>{distanceKm}km</span>}
        {distanceKm && durationMin && <span className="mx-1.5">·</span>}
        {durationMin && <span>도보 약 {durationMin}분</span>}
        {!distanceKm && !durationMin && (
          <span>{(data.waypoints?.length ?? 0)}개 지점 경유</span>
        )}
      </div>
    </div>
  );
}
