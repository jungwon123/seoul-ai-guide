import type { ReferencesBlock as ReferencesBlockData, ReferenceItem } from '@/types/api';
import { Link2 } from 'lucide-react';

const SOURCE_LABEL: Record<string, string> = {
  review: '리뷰',
  blog: '블로그',
  official: '공식',
};

// BE 인텐트별 references 응답 필드명 불일치 흡수.
// 표준: { source_type, snippet, url }
// EVENT_RECOMMEND 변형: { source, title, url }
// docs/be-requests.md 참고 — BE 통일 시 폴백 제거.
function normalizeRef(ref: ReferenceItem): { label: string; text: string; url?: string } {
  const r = ref as ReferenceItem & { source?: string; title?: string };
  const rawLabel = r.source_type || r.source || '';
  const text = r.snippet || r.title || '';
  return {
    label: SOURCE_LABEL[rawLabel] ?? rawLabel,
    text,
    url: r.url,
  };
}

export default function ReferencesBlock({ data }: { data: ReferencesBlockData }) {
  if (!data.items?.length) return null;
  const normalized = data.items.map(normalizeRef).filter((r) => r.label || r.text || r.url);
  if (normalized.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-warm p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">추천 사유 / 인용</div>
      <ul className="flex flex-col gap-2">
        {normalized.map((ref, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center gap-2 mb-0.5">
              {ref.label && (
                <span className="px-1.5 py-0.5 rounded bg-bg-surface text-[10px] uppercase tracking-wider border border-border">
                  {ref.label}
                </span>
              )}
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
            {ref.text && <div className="text-text-secondary">"{ref.text}"</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
