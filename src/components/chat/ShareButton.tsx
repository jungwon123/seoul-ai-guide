// 채팅 공유 버튼 — 클릭 시 share_token 발급 + URL 클립보드 복사.

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { chatsApi } from '@/lib/api';
import { toast } from '@/stores/toastStore';

type Props = {
  threadId: string;
};

async function copyOrPrompt(url: string): Promise<boolean> {
  // navigator.clipboard는 모바일 사파리/구버전 등에서 거부될 수 있음.
  // 실패 시 prompt()로 폴백 — 사용자가 직접 복사할 수 있게 URL 노출.
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    window.prompt('아래 URL을 복사하세요', url);
  } catch {
    /* prompt 차단 환경 — 호출자가 URL을 화면에 노출 */
  }
  return false;
}

export default function ShareButton({ threadId }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await chatsApi.share(threadId, {});
      const url = res.share_url.startsWith('http')
        ? res.share_url
        : `${window.location.origin}${res.share_url}`;
      const ok = await copyOrPrompt(url);
      if (ok) {
        setCopied(true);
        toast.success('공유 링크를 복사했어요');
        setTimeout(() => setCopied(false), 2200);
      } else {
        toast.info('클립보드 권한이 없어 prompt로 표시했어요');
      }
    } catch (e) {
      const msg = (e as Error).message || '공유 실패';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={error ?? '공유 링크 복사'}
      aria-label="공유 링크 복사"
      className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-overlay transition-colors"
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      <span>{copied ? '링크 복사됨' : '공유'}</span>
    </button>
  );
}
