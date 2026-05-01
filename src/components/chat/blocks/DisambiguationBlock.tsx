import type { DisambiguationBlock as DisambiguationData } from '@/types/api';

type Props = {
  data: DisambiguationData;
  onSelect?: (candidateIndex: number) => void;
};

export default function DisambiguationBlock({ data, onSelect }: Props) {
  if (!data.candidates?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">
        어느 곳을 말씀하시는 건가요?
      </div>
      {data.message && <div className="text-sm text-text-secondary mb-3">{data.message}</div>}
      <ul className="flex flex-col gap-1.5">
        {data.candidates.map((c, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect?.(i)}
              className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-border-strong bg-bg-warm hover:bg-bg-surface transition-colors"
            >
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-text-muted mt-0.5">
                {[c.address, c.category].filter(Boolean).join(' · ')}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
