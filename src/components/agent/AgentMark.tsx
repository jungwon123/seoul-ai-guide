import AgentOrb from './AgentOrb';

interface AgentMarkProps {
  // 단일 LocalBiz 에이전트로 통합되어 더 이상 분기에 안 쓰임.
  // 호출부 일괄 정리 전까지 prop만 유지(무시).
  agent?: unknown;
  size?: number;
  className?: string;
  spinDuration?: unknown;
}

export default function AgentMark({ size = 28, className = '' }: AgentMarkProps) {
  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }}>
      <AgentOrb state="idle" size={size} interactive={false} />
    </div>
  );
}
