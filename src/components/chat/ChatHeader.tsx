import { memo } from 'react';
import { Menu } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import CompactOrb from '@/components/agent/CompactOrb';

interface Props {
  onOpenSidebar: () => void;
  onGoHome?: () => void;
}

export default memo(function ChatHeader({ onOpenSidebar, onGoHome }: Props) {
  const selectedAgent = useChatStore((s) => s.selectedAgent);
  const isLoading = useChatStore((s) => s.isLoading);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onOpenSidebar}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
        aria-label="대화 내역"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>
      <CompactOrb agent={selectedAgent} isActive={isLoading} onClick={onGoHome} />
    </div>
  );
});
