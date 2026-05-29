import { memo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import ChatInput from './ChatInput';

export default memo(function ChatInputConnected() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const cancelMessage = useChatStore((s) => s.cancelMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const draftRestore = useChatStore((s) => s.draftRestore);
  const clearDraftRestore = useChatStore((s) => s.clearDraftRestore);
  const hasOnlyWelcome = useChatStore((s) => s.messages.length <= 1);

  return (
    <div className="shrink-0 border-t border-border bg-bg-surface/90 backdrop-blur-md">
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        loading={isLoading}
        onCancel={cancelMessage}
        draftRestore={draftRestore}
        onDraftRestored={clearDraftRestore}
        showChips={hasOnlyWelcome}
      />
    </div>
  );
});
