import type { AgentType, PlaceCategory, TransportMode } from '@/types';

export const AGENT_CONFIG: Record<AgentType, { label: string; color: string; company: string; desc: string }> = {
  claude: { label: 'Claude', color: 'var(--color-agent-claude)', company: 'Anthropic', desc: '섬세한 추천' },
  gpt: { label: 'GPT', color: 'var(--color-agent-gpt)', company: 'OpenAI', desc: '빠른 정보' },
  gemini: { label: 'Gemini', color: 'var(--color-agent-gemini)', company: 'Google', desc: '다양한 관점' },
};

export const AGENT_COLORS: Record<AgentType, string> = {
  claude: '#7C5CBF',
  gpt: '#19A97B',
  gemini: '#E8700A',
};

export const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; color: string }> = {
  tourism: { label: '관광', color: '#1C6EF2' },
  shopping: { label: '쇼핑', color: '#E8700A' },
  culture: { label: '문화', color: '#7C5CBF' },
  food: { label: '음식', color: '#D9534F' },
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
