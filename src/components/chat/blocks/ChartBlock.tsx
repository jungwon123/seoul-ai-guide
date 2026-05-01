// 6 지표 레이더 차트 (REVIEW_COMPARE / ANALYSIS).
// 외부 차트 라이브러리 없이 SVG로 직접 그린다.

import type { ChartBlock as ChartBlockData } from '@/types/api';

const METRICS = [
  { key: 'score_satisfaction', label: '만족도' },
  { key: 'accessibility', label: '접근성' },
  { key: 'cleanliness', label: '청결도' },
  { key: 'value', label: '가성비' },
  { key: 'atmosphere', label: '분위기' },
  { key: 'expertise', label: '전문성' },
] as const;

const DATASET_COLORS = ['#DC2127', '#1F3A8B', '#F4A12C', '#00853E'];

export default function ChartBlock({ data }: { data: ChartBlockData }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 100;
  const angles = METRICS.map((_, i) => (i * 2 * Math.PI) / METRICS.length - Math.PI / 2);

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
        6지표 레이더 비교
      </div>
      <svg width={size} height={size} className="block mx-auto">
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={angles
              .map((a) => `${cx + Math.cos(a) * radius * r},${cy + Math.sin(a) * radius * r}`)
              .join(' ')}
            fill="none"
            stroke="#D4CCB8"
            strokeWidth={1}
          />
        ))}
        {/* axes + labels */}
        {METRICS.map((m, i) => {
          const a = angles[i];
          const lx = cx + Math.cos(a) * (radius + 18);
          const ly = cy + Math.sin(a) * (radius + 18);
          return (
            <g key={m.key}>
              <line x1={cx} y1={cy} x2={cx + Math.cos(a) * radius} y2={cy + Math.sin(a) * radius} stroke="#D4CCB8" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#3A3A3A">
                {m.label}
              </text>
            </g>
          );
        })}
        {/* datasets */}
        {data.datasets.map((ds, di) => {
          const color = DATASET_COLORS[di % DATASET_COLORS.length];
          const points = METRICS.map((m, i) => {
            const v = (ds[m.key] ?? 0) as number;
            const r = Math.max(0, Math.min(1, v / 5)) * radius;
            const a = angles[i];
            return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
          }).join(' ');
          return (
            <polygon
              key={ds.label + di}
              points={points}
              fill={color}
              fillOpacity={0.18}
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 justify-center mt-3 text-xs">
        {data.datasets.map((ds, di) => (
          <div key={ds.label + di} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: DATASET_COLORS[di % DATASET_COLORS.length] }}
            />
            <span>{ds.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
