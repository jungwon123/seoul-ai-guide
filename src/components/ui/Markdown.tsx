import { memo, Fragment, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { cn } from '@/lib/utils';

// 어시스턴트 텍스트(BE text_stream)에는 **굵게** 같은 마크다운이 섞여 온다.
// plain text 로 렌더하면 ** 가 그대로 보이므로 이 컴포넌트로 변환한다.
// prose 플러그인 없이 Tailwind 클래스로 직접 매핑해 컴팩트한 채팅 톤을 유지.

const BLOCK_COMPONENTS: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-bg-subtle text-[0.9em] font-mono">{children}</code>
  ),
  h1: ({ children }) => <h3 className="text-[15px] font-semibold mt-1">{children}</h3>,
  h2: ({ children }) => <h3 className="text-[14px] font-semibold mt-1">{children}</h3>,
  h3: ({ children }) => <h3 className="text-[14px] font-semibold mt-1">{children}</h3>,
};

// inline 변형 — 문단 래핑(<p>) 없이 텍스트를 그대로 흘려보낸다.
// 요약문처럼 line-clamp 가 걸린 컨테이너 안에서 굵게만 처리할 때 사용.
const INLINE_COMPONENTS: Components = {
  ...BLOCK_COMPONENTS,
  p: ({ children }) => <Fragment>{children}</Fragment>,
};

interface MarkdownProps {
  children: string;
  className?: string;
  inline?: boolean;
}

function MarkdownInner({ children, className, inline = false }: MarkdownProps): ReactNode {
  if (inline) {
    return (
      <span className={className}>
        <ReactMarkdown components={INLINE_COMPONENTS}>{children}</ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={cn('space-y-1.5 break-words', className)}>
      <ReactMarkdown components={BLOCK_COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}

const Markdown = memo(MarkdownInner);
export default Markdown;
