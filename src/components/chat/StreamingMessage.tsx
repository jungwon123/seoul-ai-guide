import { useChatStore } from '@/stores/chatStore';
import TypingIndicator from './TypingIndicator';
import StreamingBubble from './StreamingBubble';

export default function StreamingMessage() {
  const isLoading = useChatStore((s) => s.isLoading);
  const streamingText = useChatStore((s) => s.streamingText);
  const currentStatus = useChatStore((s) => s.currentStatus);
  const selectedAgent = useChatStore((s) => s.selectedAgent);

  if (!isLoading) return null;
  if (!streamingText) return <TypingIndicator agent={selectedAgent} status={currentStatus} />;
  return <StreamingBubble text={streamingText} agent={selectedAgent} />;
}
