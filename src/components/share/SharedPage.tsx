import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sharedApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';
import type { Block, SharedConversation } from '@/types/api';
import { BlockRenderer } from '@/components/chat/blocks';
import PlaceCarousel from '@/components/chat/PlaceCarousel';
import ItineraryCard from '@/components/chat/ItineraryCard';
import {
  singlePlaceBlockToPlace,
  placesBlockToPlaces,
  courseBlockToItinerary,
} from '@/stores/chatStore';

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
        if (!abort) setError(friendlyApiError(e, '공유 링크를 불러올 수 없습니다'));
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });
    return () => {
      abort = true;
    };
  }, [token]);

  return (
    <div className="h-full w-full overflow-y-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M 12 12 L 12 0 A 12 12 0 0 1 22.392 18 Z" fill="#1F3A8B" />
            <path d="M 12 12 L 22.392 18 A 12 12 0 0 1 1.608 18 Z" fill="#DC2127" />
            <path d="M 12 12 L 1.608 18 A 12 12 0 0 1 12 0 Z" fill="#F4A12C" />
            <circle cx="12" cy="12" r="2.4" fill="#FFFFFF" />
          </svg>
          <span className="font-display text-base">LocalBiz</span>
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
  const time = new Date(createdAt).toLocaleString('ko-KR');
  const typedBlocks = blocks as Block[];

  // 텍스트 블록들은 모아서 하나의 버블로 (chat UI와 동일 패턴).
  const text = typedBlocks
    .map((b) => {
      if (b.type === 'text') return b.content;
      if (b.type === 'text_stream') return b.delta ?? b.content ?? '';
      return '';
    })
    .filter(Boolean)
    .join('');

  // 구조화 블록 — 카드/카루셀로 별도 렌더. intent/done/error 같은 제어 프레임 skip.
  // map_markers/map_route는 shared에 지도가 없어서 skip.
  const structuredBlocks = typedBlocks.filter(
    (b) =>
      b.type !== 'text' &&
      b.type !== 'text_stream' &&
      b.type !== 'intent' &&
      b.type !== 'status' &&
      b.type !== 'done' &&
      b.type !== 'done_partial' &&
      b.type !== 'error' &&
      b.type !== 'map_markers' &&
      b.type !== 'map_route',
  );

  return (
    <div className={isUser ? 'self-end max-w-[85%]' : 'self-start w-full max-w-full'}>
      {text && (
        <div
          className={
            isUser
              ? 'bg-brand-subtle border border-brand rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap'
              : 'bg-bg-warm border border-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm whitespace-pre-wrap leading-[1.6]'
          }
        >
          {text}
        </div>
      )}

      {!isUser && structuredBlocks.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-2.5">
          {structuredBlocks.map((b, i) => {
            if (b.type === 'place') {
              return <PlaceCarousel key={i} places={[singlePlaceBlockToPlace(b)]} />;
            }
            if (b.type === 'places') {
              return <PlaceCarousel key={i} places={placesBlockToPlaces(b)} />;
            }
            if (b.type === 'course') {
              return <ItineraryCard key={i} itinerary={courseBlockToItinerary(b)} hideActions />;
            }
            return <BlockRenderer key={i} block={b} />;
          })}
        </div>
      )}

      {!text && structuredBlocks.length === 0 && (
        <div className="bg-bg-warm border border-border rounded-2xl px-4 py-2.5 text-sm text-text-muted">
          [내용 없음]
        </div>
      )}

      <div className="text-[10px] text-text-muted mt-1 px-2">{time}</div>
    </div>
  );
}
