import { memo, useState, useRef, useEffect, useCallback, type KeyboardEvent, type FocusEvent } from 'react';
import { X, Plus, MessageCircle, Trash2, Settings, LogOut, User, RefreshCw, Pencil, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useChatStore, type ChatSession } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default memo(function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sessions = useChatStore((s) => s.sessions);

  // GSAP spring 으로 사이드바 슬라이드 인/아웃 — back.out 으로 살짝 오버슈트.
  // ⚠ JSX 에 inline style.transform 을 두면 React 가 매 렌더마다 덮어써서 GSAP 와 충돌.
  //    transform 은 GSAP 가 단독 관리. 초기 위치는 useGSAP 의 first-run 분기에서 set.
  const firstRun = useRef(true);
  useGSAP(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const targetX = isOpen ? 0 : -100;
    if (firstRun.current) {
      firstRun.current = false;
      gsap.set(el, { xPercent: targetX });
      return;
    }
    if (prefersReducedMotion()) {
      gsap.set(el, { xPercent: targetX });
      return;
    }
    gsap.to(el, {
      xPercent: targetX,
      duration: isOpen ? 0.5 : 0.32,
      ease: isOpen ? 'back.out(1.3)' : 'power3.in',
    });
  }, { dependencies: [isOpen], scope: sidebarRef });
  const sessionId = useChatStore((s) => s.sessionId);
  const newChat = useChatStore((s) => s.newChat);
  const loadSession = useChatStore((s) => s.loadSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const chatsLoading = useChatStore((s) => s.chatsLoading);
  const chatsError = useChatStore((s) => s.chatsError);
  const loadFromServer = useChatStore((s) => s.loadFromServer);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleNewChat = () => {
    newChat();
    onClose();
  };

  const handleLoadSession = (id: string) => {
    loadSession(id);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  const displayName = user?.nickname?.trim() || user?.email || '게스트';
  const subText = user?.nickname && user?.email ? user.email : null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onClick={onClose} />
      )}

      <div
        ref={sidebarRef}
        className="fixed left-0 top-0 bottom-0 z-50 w-[300px] bg-bg-surface border-r border-border flex flex-col will-change-transform"
      >
        <div className="flex items-center justify-between px-4 h-[52px] border-b border-border shrink-0">
          <h2 className="text-[14px] font-semibold text-text-primary">대화 내역</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-3 pt-3 pb-1">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-[13px] font-medium text-text-primary hover:bg-bg-subtle hover:border-border-strong transition-all cursor-pointer"
          >
            <Plus size={14} />
            새 대화
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
          {sessions.length === 0 ? (
            chatsLoading ? (
              // Loading — sessions가 비어있고 BE에서 받아오는 중
              <div className="py-3 space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                    <div className="w-[6px] h-[6px] rounded-full mt-[7px] shrink-0 bg-bg-subtle animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3 rounded bg-bg-subtle animate-pulse" style={{ width: `${70 - i * 10}%` }} />
                      <div className="h-2.5 rounded bg-bg-subtle/70 animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatsError ? (
              // Error — BE 호출 실패 시 사용자에게 사유 + 재시도 노출
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-[13px] text-text-secondary mb-3">{chatsError}</p>
                <button
                  onClick={() => loadFromServer()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} /> 다시 시도
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle size={28} strokeWidth={1} className="text-text-muted mb-3" />
                <p className="text-[13px] text-text-muted">아직 대화 내역이 없어요</p>
              </div>
            )
          ) : (
            sessions.map((session: ChatSession) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === sessionId}
                onLoad={handleLoadSession}
                onDelete={deleteSession}
                onRename={renameSession}
              />
            ))
          )}
        </div>

        {/* 하단: 사용자 정보 + 설정 + 로그아웃 */}
        <div className="border-t border-border px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center shrink-0">
              <User size={14} strokeWidth={1.8} className="text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate leading-tight">
                {displayName}
              </p>
              {subText && (
                <p className="text-[11px] text-text-muted truncate mt-0.5">{subText}</p>
              )}
            </div>
            <Link
              to="/settings"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
              aria-label="설정"
              title="설정"
            >
              <Settings size={14} strokeWidth={1.8} />
            </Link>
            {user && (
              <button
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LogOut size={14} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

// 사이드바 세션 카드 — 인라인 제목 편집 지원.
// Pencil: 편집 진입 / Enter or blur: 저장 / Escape: 취소.
interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
}

function SessionItem({ session, isActive, onLoad, onDelete, onRename }: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // 외부에서 title이 바뀌면 (BE rename 동기화 등) draft도 동기화.
  useEffect(() => {
    if (!editing) setDraft(session.title);
  }, [session.title, editing]);

  const commit = useCallback(async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === session.title) {
      setDraft(session.title);
      return;
    }
    await onRename(session.id, trimmed).catch(() => {
      // 실패 시 원래 값 복구.
      setDraft(session.title);
    });
  }, [draft, session.id, session.title, onRename]);

  const cancel = useCallback(() => {
    setDraft(session.title);
    setEditing(false);
  }, [session.title]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  const handleBlur = (_e: FocusEvent<HTMLInputElement>) => {
    void commit();
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150',
        editing ? 'cursor-default' : 'cursor-pointer',
        isActive ? 'bg-brand-subtle' : 'hover:bg-bg-subtle',
      )}
      onClick={() => { if (!editing) onLoad(session.id); }}
    >
      <div className="w-[6px] h-[6px] rounded-full mt-[7px] shrink-0 bg-brand" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            maxLength={200}
            className="w-full text-[13px] leading-tight font-medium text-text-primary bg-bg-surface border border-brand rounded px-1.5 py-0.5 outline-none"
            aria-label="대화 제목 편집"
          />
        ) : (
          <p className={cn(
            'text-[13px] leading-tight truncate',
            isActive ? 'font-semibold text-brand' : 'font-medium text-text-primary',
          )}>
            {session.title}
          </p>
        )}
        <p className="text-[11px] text-text-muted mt-1">
          {formatDate(session.updatedAt)}
        </p>
      </div>
      {editing ? (
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); void commit(); }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-brand hover:bg-brand-subtle transition-colors cursor-pointer shrink-0 mt-0.5"
          aria-label="제목 저장"
        >
          <Check size={12} />
        </button>
      ) : (
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-all cursor-pointer"
            aria-label="대화 제목 편집"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all cursor-pointer"
            aria-label="대화 삭제"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
