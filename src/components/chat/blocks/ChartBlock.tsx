// 오각형(5지표) 레이더 차트 (REVIEW_COMPARE / ANALYSIS).
// 외부 차트 라이브러리 없이 SVG로 직접 그린다.
// 만족도(score_satisfaction)는 종합 점수라 축에서 제외하고 범례에 별도 표기,
// 나머지 5개 세부 지표를 오각형 축으로 비교한다.

import type { ChartBlock as ChartBlockData } from '@/types/api';

const METRICS = [
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
  // BE review_compare 가 보내는 places[] 를 source of truth 로 읽는다(scores: 6지표).
  // 빈/누락이면 차트 생략(크래시 방지).
  const places = data.places ?? [];
  if (places.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
        리뷰 5지표 비교
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
            stroke="var(--border)"
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
              <line x1={cx} y1={cy} x2={cx + Math.cos(a) * radius} y2={cy + Math.sin(a) * radius} stroke="var(--border)" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--text-primary)">
                {m.label}
              </text>
            </g>
          );
        })}
        {/* datasets */}
        {places.map((p, di) => {
          const color = DATASET_COLORS[di % DATASET_COLORS.length];
          const points = METRICS.map((m, i) => {
            const v = p.scores?.[m.key] ?? 0;
            const r = Math.max(0, Math.min(1, v / 5)) * radius;
            const a = angles[i];
            return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
          }).join(' ');
          return (
            <polygon
              key={p.name + di}
              points={points}
              fill={color}
              fillOpacity={0.18}
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-3 text-xs">
        {places.map((p, di) => (
          <div key={p.name + di} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: DATASET_COLORS[di % DATASET_COLORS.length] }}
            />
            <span className="text-text-primary">{p.name}</span>
            {p.scores?.satisfaction != null && (
              <span className="text-text-muted tabular-nums">
                · 만족도 {p.scores.satisfaction.toFixed(1)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
