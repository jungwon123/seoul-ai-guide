import type { ReferencesBlock as ReferencesBlockData } from '@/types/api';
import { Link2 } from 'lucide-react';

const SOURCE_LABEL: Record<string, string> = {
  review: '리뷰',
  blog: '블로그',
  official: '공식',
};

export default function ReferencesBlock({ data }: { data: ReferencesBlockData }) {
  if (!data.items?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-warm p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">추천 사유 / 인용</div>
      <ul className="flex flex-col gap-2">
        {data.items.map((ref, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-1.5 py-0.5 rounded bg-bg-surface text-[10px] uppercase tracking-wider border border-border">
                {SOURCE_LABEL[ref.source_type] ?? ref.source_type}
              </span>
              {ref.url && (
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-brand"
                  aria-label="출처 열기"
                >
                  <Link2 size={12} />
                </a>
              )}
            </div>
            <div className="text-text-secondary">"{ref.snippet}"</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
