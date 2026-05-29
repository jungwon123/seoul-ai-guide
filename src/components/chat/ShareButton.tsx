// 채팅 공유 버튼 — 클릭 시 share_token 발급 + URL 클립보드 복사.
// messageId 가 있으면 "이 답변만" / "대화 전체" 2가지 범위를 선택할 수 있다.
//   - 이 답변만: BE message_range = { from: id, to: id } (단일 메시지 공유)
//   - 대화 전체: message_range 없음(기존 동작)

import { useState } from 'react';
import { Share2, Check, X, MessageSquare, MessagesSquare } from 'lucide-react';
import { chatsApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';
import { toast } from '@/stores/toastStore';

type Props = {
  threadId: string;
  // 있으면 '이 답변만 공유' 옵션 노출(메시지 단위). 없으면 전체 공유만.
  messageId?: number;
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

export default function ShareButton({ threadId, messageId }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 한 번이라도 공유했으면 "취소" 보조 액션 노출. 페이지 이탈 시 리셋(데모용 충분).
  const [wasShared, setWasShared] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const doShare = async (range?: { from_message_id: number; to_message_id: number }) => {
    if (busy) return;
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    try {
      const res = await chatsApi.share(threadId, range ? { message_range: range } : {});
      // BE는 share_url을 "/shared/{token}"로 발급하지만 vite/vercel rewrite가 BE API로 잡아채감.
      // FE 라우트는 /s/{token}이므로 사용자에게 보여줄 URL은 그 형태로 치환.
      const fePath = res.share_url.replace(/^\/shared\//, '/s/');
      const url = fePath.startsWith('http')
        ? fePath
        : `${window.location.origin}${fePath}`;
      const ok = await copyOrPrompt(url);
      if (ok) {
        setCopied(true);
        toast.success(range ? '이 답변 공유 링크를 복사했어요' : '대화 공유 링크를 복사했어요');
        setTimeout(() => setCopied(false), 2200);
      } else {
        toast.info('클립보드 권한이 없어 prompt로 표시했어요');
      }
      setWasShared(true);
    } catch (e) {
      const msg = friendlyApiError(e, '공유 링크 생성에 실패했습니다');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onShareClick = () => {
    // messageId 있으면 범위 선택 메뉴, 없으면 전체 공유 즉시 실행.
    if (messageId != null) setMenuOpen((v) => !v);
    else void doShare();
  };

  const onRevoke = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await chatsApi.revokeShare(threadId);
      setWasShared(false);
      toast.success('공유를 취소했어요');
    } catch (e) {
      const msg = friendlyApiError(e, '공유 취소에 실패했습니다');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onShareClick}
        disabled={busy}
        title={error ?? '공유'}
        aria-label="공유"
        aria-haspopup={messageId != null ? 'menu' : undefined}
        aria-expanded={messageId != null ? menuOpen : undefined}
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-overlay transition-colors disabled:opacity-50"
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />}
        <span>{copied ? '링크 복사됨' : '공유'}</span>
      </button>

      {wasShared && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          title="공유 취소"
          aria-label="공유 취소"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-[#DC2626] px-1.5 py-1 rounded hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
        >
          <X size={13} />
          <span>취소</span>
        </button>
      )}

      {/* 범위 선택 메뉴 (messageId 있을 때만) */}
      {menuOpen && messageId != null && (
        <>
          {/* 바깥 클릭 닫기 */}
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            className="absolute bottom-full left-0 mb-1.5 z-50 w-44 rounded-xl border border-border bg-bg-surface shadow-md py-1 animate-fade-up"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => void doShare({ from_message_id: messageId, to_message_id: messageId })}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <MessageSquare size={14} className="text-text-muted" aria-hidden="true" />
              이 답변만 공유
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void doShare()}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <MessagesSquare size={14} className="text-text-muted" aria-hidden="true" />
              대화 전체 공유
            </button>
          </div>
        </>
      )}
    </div>
  );
}
