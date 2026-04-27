import { useRef } from 'react';
import type { AgentType } from '@/types';
import { useTextHeight } from '@/lib/useTextHeight';
import AgentMark from '../agent/AgentMark';

interface Props {
  text: string;
  agent: AgentType;
}

export default function StreamingBubble({ text, agent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = containerRef.current?.clientWidth ?? 300;
  const predictedHeight = useTextHeight(text, containerWidth);

  return (
    <div className="flex gap-2.5 pr-4 animate-message">
      <AgentMark agent={agent} size={24} className="mt-0.5" />
      <div
        ref={containerRef}
        className="flex-1 text-[14px] leading-[1.7] text-text-primary"
        style={{ minHeight: predictedHeight > 0 ? predictedHeight : undefined }}
      >
        {text}
        <span className="inline-block w-[2px] h-[14px] bg-brand ml-[1px] align-text-bottom" style={{ animation: 'cursorBlink 1s step-end infinite' }} />
      </div>
    </div>
  );
}
