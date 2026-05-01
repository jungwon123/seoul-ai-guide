import type { AnalysisSourcesBlock as AnalysisSourcesData } from '@/types/api';

export default function AnalysisSourcesBlock({ data }: { data: AnalysisSourcesData }) {
  const reviewCount = data.review_count ?? 0;
  const blogCount = data.blog_count ?? 0;
  const officialCount = data.official_count ?? 0;
  const total = reviewCount + blogCount + officialCount;
  if (total === 0 && !data.sources?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-warm p-3 text-sm">
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">분석 근거</div>
      <div className="flex gap-4 text-xs text-text-secondary">
        {reviewCount > 0 && <span>리뷰 {reviewCount}건</span>}
        {blogCount > 0 && <span>블로그 {blogCount}건</span>}
        {officialCount > 0 && <span>공식 {officialCount}건</span>}
      </div>
      {data.sources?.length ? (
        <ul className="mt-2 flex flex-col gap-1.5 text-xs">
          {data.sources.slice(0, 5).map((s, i) => (
            <li key={i} className="text-text-secondary truncate">
              · {s.snippet || s.url || s.source_id}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
