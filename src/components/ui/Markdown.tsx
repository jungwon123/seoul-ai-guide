import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 경량 마크다운 렌더러 — react-markdown(micromark/mdast, ~40KB+ gzip) 의존성을 제거하고
// 채팅에서 실제로 쓰는 문법(굵게/기울임/코드/링크/목록/문단)만 직접 파싱한다.
// React 엘리먼트로 렌더하므로 dangerouslySetInnerHTML 미사용 → XSS 안전.

// 안전한 링크만 허용 (javascript: 등 차단).
function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:\/\/|mailto:|\/)/i.test(h)) return h;
  return null;
}

// 인라인 토큰: **굵게** __굵게__ *기울임* _기울임_ `코드` [텍스트](url)
const INLINE_RE =
  /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;

function parseInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (rest) {
    const m = INLINE_RE.exec(rest);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2] !== undefined) out.push(<strong key={key} className="font-semibold text-text-primary">{m[2]}</strong>);
    else if (m[3] !== undefined) out.push(<strong key={key} className="font-semibold text-text-primary">{m[3]}</strong>);
    else if (m[4] !== undefined) out.push(<em key={key} className="italic">{m[4]}</em>);
    else if (m[5] !== undefined) out.push(<em key={key} className="italic">{m[5]}</em>);
    else if (m[6] !== undefined) out.push(<code key={key} className="px-1 py-0.5 rounded bg-bg-subtle text-[0.9em] font-mono">{m[6]}</code>);
    else if (m[7] !== undefined) {
      const href = safeHref(m[8]);
      out.push(
        href
          ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">{m[7]}</a>
          : m[7],
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

// 한 문단 안의 단일 줄바꿈 → <br/>.
function parseParagraph(block: string, keyBase: string): ReactNode[] {
  const lines = block.split('\n');
  const nodes: ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) nodes.push(<br key={`${keyBase}-br-${idx}`} />);
    nodes.push(...parseInline(line, `${keyBase}-l${idx}`));
  });
  return nodes;
}

const UL_RE = /^\s*[-*]\s+/;
const OL_RE = /^\s*\d+\.\s+/;

function renderBlocks(md: string): ReactNode[] {
  const blocks = md.trim().split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 0 && lines.every((l) => UL_RE.test(l))) {
      return (
        <ul key={bi} className="list-disc pl-5 my-1 space-y-0.5">
          {lines.map((l, li) => <li key={li} className="leading-[1.6]">{parseInline(l.replace(UL_RE, ''), `${bi}-${li}`)}</li>)}
        </ul>
      );
    }
    if (lines.length > 0 && lines.every((l) => OL_RE.test(l))) {
      return (
        <ol key={bi} className="list-decimal pl-5 my-1 space-y-0.5">
          {lines.map((l, li) => <li key={li} className="leading-[1.6]">{parseInline(l.replace(OL_RE, ''), `${bi}-${li}`)}</li>)}
        </ol>
      );
    }
    return <p key={bi} className="m-0">{parseParagraph(block, String(bi))}</p>;
  });
}

interface MarkdownProps {
  children: string;
  className?: string;
  inline?: boolean;
}

function MarkdownInner({ children, className, inline = false }: MarkdownProps): ReactNode {
  if (inline) {
    return <span className={className}>{parseInline(children, 'i')}</span>;
  }
  return <div className={cn('space-y-1.5 break-words', className)}>{renderBlocks(children)}</div>;
}

const Markdown = memo(MarkdownInner);
export default Markdown;
