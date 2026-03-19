import type { AgentType, PlaceCategory, TransportMode } from '@/types';

export const AGENT_CONFIG: Record<AgentType, { label: string; color: string; company: string; desc: string }> = {
  claude: { label: 'Claude', color: '#7B61FF', company: 'Anthropic', desc: '섬세한 추천' },
  gpt: { label: 'GPT', color: '#10A37F', company: 'OpenAI', desc: '빠른 정보' },
  gemini: { label: 'Gemini', color: '#4285F4', company: 'Google', desc: '다양한 관점' },
};

export const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; color: string; emoji: string }> = {
  tourism: { label: '관광', color: '#4FFFB0', emoji: '🏛' },
  shopping: { label: '쇼핑', color: '#FFD166', emoji: '🛍' },
  culture: { label: '문화', color: '#7B61FF', emoji: '🎭' },
  food: { label: '음식', color: '#FF6B6B', emoji: '🍜' },
};

export const TRANSPORT_LABELS: Record<TransportMode, { label: string; emoji: string }> = {
  walk: { label: '도보', emoji: '🚶' },
  subway: { label: '지하철', emoji: '🚇' },
  bus: { label: '버스', emoji: '🚌' },
  taxi: { label: '택시', emoji: '🚕' },
};

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
