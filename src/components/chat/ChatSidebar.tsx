import { memo } from 'react';
import { X, Plus, MessageCircle, Trash2, Settings, LogOut, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useChatStore, type ChatSession } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { AGENT_COLORS, cn } from '@/lib/utils';

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
  const sessions = useChatStore((s) => s.sessions);
  const sessionId = useChatStore((s) => s.sessionId);
  const newChat = useChatStore((s) => s.newChat);
  const loadSession = useChatStore((s) => s.loadSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
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
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 w-[300px] bg-bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle size={28} strokeWidth={1} className="text-text-muted mb-3" />
              <p className="text-[13px] text-text-muted">아직 대화 내역이 없어요</p>
            </div>
          ) : (
            sessions.map((session: ChatSession) => {
              const isActive = session.id === sessionId;
              const agentColor = AGENT_COLORS[session.agent];
              const messageCount = session.messages.filter((m) => m.role === 'user').length;
              return (
                <div
                  key={session.id}
                  className={cn(
                    'group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                    isActive ? 'bg-brand-subtle' : 'hover:bg-bg-subtle',
                  )}
                  onClick={() => handleLoadSession(session.id)}
                >
                  <div
                    className="w-[6px] h-[6px] rounded-full mt-[7px] shrink-0"
                    style={{ backgroundColor: agentColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[13px] leading-tight truncate',
                      isActive ? 'font-semibold text-brand' : 'font-medium text-text-primary',
                    )}>
                      {session.title}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5">
                      <span>{formatDate(session.updatedAt)}</span>
                      <span>·</span>
                      <span>{messageCount}개 메시지</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all cursor-pointer shrink-0 mt-0.5"
                    aria-label="대화 삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
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
