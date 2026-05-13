import type { MapRouteBlock as MapRouteData } from '@/types/api';
import { Route } from 'lucide-react';

const MODE_LABEL: Record<string, string> = {
  walk: '도보',
  subway: '지하철',
  bus: '버스',
  taxi: '택시',
};

export default function MapRouteBlock({ data }: { data: MapRouteData }) {
  const stopCount = data.markers.length;
  const segments = data.polyline?.segments ?? [];
  const uniqueModes = Array.from(new Set(segments.map((s) => s.mode)));
  const modeText = uniqueModes.length > 0
    ? uniqueModes.map((m) => MODE_LABEL[m] ?? m).join(' · ')
    : null;
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-3 text-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1.5">
        <Route size={12} /> 경로
      </div>
      <div className="text-text-secondary">
        <span>{stopCount}개 지점</span>
        {modeText && <span className="mx-1.5">·</span>}
        {modeText && <span>{modeText}</span>}
      </div>
    </div>
  );
}
