import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sharedApi } from '@/lib/api';
import type { SharedConversation } from '@/types/api';

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    if (!token) {
      // 라우터가 :token 없이 도달했을 때 무한 스피너 방지.
      setLoading(false);
      setError('잘못된 공유 링크입니다');
      return;
    }
    setLoading(true);
    sharedApi
      .get(token)
      .then((res) => {
        if (!abort) setData(res);
      })
      .catch((e) => {
        if (!abort) setError((e as Error).message || '공유 링크를 불러올 수 없습니다');
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });
    return () => {
      abort = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen w-full px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M 12 12 L 12 0 A 12 12 0 0 1 22.392 18 Z" fill="#1F3A8B" />
            <path d="M 12 12 L 22.392 18 A 12 12 0 0 1 1.608 18 Z" fill="#DC2127" />
            <path d="M 12 12 L 1.608 18 A 12 12 0 0 1 12 0 Z" fill="#F4A12C" />
            <circle cx="12" cy="12" r="2.4" fill="#FFFFFF" />
          </svg>
          <span className="font-display text-base">Seoul Edit</span>
        </Link>

        <div className="bg-bg-surface border-2 border-border-strong rounded-2xl p-6 shadow-[3px_3px_0_rgba(15,15,15,0.9)]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl">{data?.thread_title ?? '공유된 대화'}</h1>
            <span className="text-xs text-text-muted uppercase tracking-wider">read-only</span>
          </div>

          {loading && <div className="text-sm text-text-secondary">불러오는 중...</div>}
          {error && (
            <div role="alert" className="text-sm text-brand bg-brand-subtle px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {data && (
            <div className="flex flex-col gap-4">
              {data.messages.map((m, i) => (
                <SharedMessage key={i} role={m.role} blocks={m.blocks} createdAt={m.created_at} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">
            나만의 서울 만들기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SharedMessage({ role, blocks, createdAt }: { role: string; blocks: unknown[]; createdAt: string }) {
  const isUser = role === 'user';
  const text = blocks
    .map((b) => {
      const block = b as { type?: string; content?: string; delta?: string; text?: string };
      if (block.type === 'text' || block.type === 'text_stream') {
        return block.content ?? block.delta ?? block.text ?? '';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
  const time = new Date(createdAt).toLocaleString('ko-KR');

  return (
    <div className={isUser ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'}>
      <div
        className={
          isUser
            ? 'bg-brand-subtle border border-brand rounded-2xl rounded-br-md px-4 py-2.5 text-sm'
            : 'bg-bg-warm border border-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm'
        }
      >
        {text || <span className="text-text-muted">[멀티미디어 응답]</span>}
      </div>
      <div className="text-[10px] text-text-muted mt-1 px-2">{time}</div>
    </div>
  );
}
