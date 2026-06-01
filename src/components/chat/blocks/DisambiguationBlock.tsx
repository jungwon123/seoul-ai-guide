import type { DisambiguationBlock as DisambiguationData } from '@/types/api';

type Props = {
  data: DisambiguationData;
  onSelect?: (candidateIndex: number) => void;
};

export default function DisambiguationBlock({ data, onSelect }: Props) {
  const hasCandidates = !!data.candidates?.length;
  // candidates 가 없어도 message(예: "어느 장소와 비교하시겠어요?")는 항상 렌더.
  // BE 가 후보 없이 되묻는 disambiguation(REVIEW_COMPARE 등)을 빈 화면으로 떨구던 버그 수정.
  if (!hasCandidates && !data.message) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">
        {hasCandidates ? '어느 곳을 말씀하시는 건가요?' : '추가 정보가 필요해요'}
      </div>
      {data.message && (
        <div className={`text-sm text-text-secondary ${hasCandidates ? 'mb-3' : ''}`}>
          {data.message}
        </div>
      )}
      {hasCandidates && (
        <ul className="flex flex-col gap-1.5">
          {data.candidates!.map((c, i) => (
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
      )}
    </div>
  );
}
