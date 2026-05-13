import type { AgentType, PlaceCategory, TransportMode, CongestionLevel } from '@/types';

export const AGENT_CONFIG: Record<AgentType, { label: string; color: string; company: string; desc: string }> = {
  claude: { label: 'Claude', color: '#1F3A8B', company: 'Anthropic', desc: '섬세한 추천' },
  gpt: { label: 'GPT', color: '#00853E', company: 'OpenAI', desc: '빠른 정보' },
  gemini: { label: 'Gemini', color: '#F4A12C', company: 'Google', desc: '다양한 관점' },
};

export const AGENT_COLORS: Record<AgentType, string> = {
  claude: '#1F3A8B',
  gpt: '#00853E',
  gemini: '#F4A12C',
};

export const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; color: string }> = {
  tourism: { label: '관광', color: '#1F3A8B' },
  shopping: { label: '쇼핑', color: '#DC2127' },
  culture: { label: '문화', color: '#F4A12C' },
  food: { label: '음식', color: '#00853E' },
};

// BE가 보내는 카테고리 문자열(한글/영문 혼재)을 FE 4분류 enum으로 정규화.
// 매칭 안 되면 undefined — 호출 측에서 안전한 기본값 부여(예: 'tourism').
export function normalizeCategory(raw: string | null | undefined): PlaceCategory | undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase().trim();
  if (s === 'tourism' || s === 'shopping' || s === 'culture' || s === 'food') return s;
  if (/(음식|맛집|카페|식당|술집|주점|food|cafe|restaurant|pub|bar)/.test(s)) return 'food';
  if (/(쇼핑|쇼핑몰|상점|shop|mall|store|market)/.test(s)) return 'shopping';
  if (/(문화|공연|전시|박물관|갤러리|미술|축제|교육|클래식|culture|museum|gallery|exhibition|performance|festival)/.test(s)) return 'culture';
  if (/(관광|공원|명소|랜드마크|tourism|tourist|park|landmark|attraction)/.test(s)) return 'tourism';
  return undefined;
}

export const CONGESTION_CONFIG: Record<CongestionLevel, { label: string; color: string; bg: string; weight: number }> = {
  low: { label: '여유', color: '#10B981', bg: '#10B98114', weight: 0.2 },
  medium: { label: '보통', color: '#F59E0B', bg: '#F59E0B14', weight: 0.5 },
  high: { label: '혼잡', color: '#EF4444', bg: '#EF444414', weight: 1.0 },
};

export const TRANSPORT_LABELS: Record<TransportMode, { label: string; icon: string }> = {
  walk: { label: '도보', icon: '🚶' },
  subway: { label: '지하철', icon: '🚇' },
  bus: { label: '버스', icon: '🚌' },
  taxi: { label: '택시', icon: '🚕' },
};

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function staggerDelay(index: number, base: number = 0.04): string {
  return `${index * base}s`;
}
