import { memo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import ChatInput from './ChatInput';

export default memo(function ChatInputConnected() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const hasOnlyWelcome = useChatStore((s) => s.messages.length <= 1);

  return (
    <div className="shrink-0 border-t border-border bg-bg-surface/90 backdrop-blur-md">
      <ChatInput onSend={sendMessage} disabled={isLoading} showChips={hasOnlyWelcome} />
    </div>
  );
});
