// AI 응답 피드백 버튼 (👍/👎). 한 번 누르면 잠금.
// ⚠️ BE 미구현 — VITE_FEATURE_FEEDBACK=true 일 때만 노출. 기본은 숨김.

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { feedbackApi } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

type Props = {
  threadId: string;
  messageId: string | number;
};

type Rating = 'up' | 'down' | null;

const FEEDBACK_ENABLED = import.meta.env.VITE_FEATURE_FEEDBACK === 'true';

export default function FeedbackButton({ threadId, messageId }: Props) {
  if (!FEEDBACK_ENABLED) return null;
  const [rating, setRating] = useState<Rating>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (next: Exclude<Rating, null>) => {
    if (rating || submitting) return;
    setSubmitting(true);
    try {
      await feedbackApi.create({ thread_id: threadId, message_id: messageId, rating: next });
      setRating(next);
      toast.success('피드백이 전송되었어요');
    } catch (e) {
      toast.error((e as Error).message || '피드백 전송에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 text-text-muted">
      <button
        type="button"
        aria-label="좋아요"
        onClick={() => submit('up')}
        disabled={!!rating || submitting}
        className={cn(
          'p-1 rounded hover:bg-bg-overlay transition-colors',
          rating === 'up' && 'text-brand',
        )}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        aria-label="별로예요"
        onClick={() => submit('down')}
        disabled={!!rating || submitting}
        className={cn(
          'p-1 rounded hover:bg-bg-overlay transition-colors',
          rating === 'down' && 'text-brand',
        )}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}
