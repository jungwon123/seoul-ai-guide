import type { AgentType, PlaceCategory, TransportMode } from '@/types';

export const AGENT_CONFIG: Record<AgentType, { label: string; color: string; company: string; desc: string }> = {
  claude: { label: 'Claude', color: '#7C3AED', company: 'Anthropic', desc: '섬세한 추천' },
  gpt: { label: 'GPT', color: '#059669', company: 'OpenAI', desc: '빠른 정보' },
  gemini: { label: 'Gemini', color: '#EA580C', company: 'Google', desc: '다양한 관점' },
};

export const AGENT_COLORS: Record<AgentType, string> = {
  claude: '#7C3AED',
  gpt: '#059669',
  gemini: '#EA580C',
};

export const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; color: string }> = {
  tourism: { label: '관광', color: '#2563EB' },
  shopping: { label: '쇼핑', color: '#EA580C' },
  culture: { label: '문화', color: '#7C3AED' },
  food: { label: '음식', color: '#DC2626' },
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
