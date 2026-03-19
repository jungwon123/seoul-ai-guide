import type { AgentType, PlaceCategory, TransportMode } from '@/types';

export const AGENT_CONFIG: Record<AgentType, { label: string; color: string; glowColor: string; company: string; desc: string }> = {
  claude: { label: 'Claude', color: '#9B6DFF', glowColor: 'rgba(155, 109, 255, 0.2)', company: 'Anthropic', desc: '섬세한 추천' },
  gpt: { label: 'GPT', color: '#00D4FF', glowColor: 'rgba(0, 212, 255, 0.2)', company: 'OpenAI', desc: '빠른 정보' },
  gemini: { label: 'Gemini', color: '#FF6B8A', glowColor: 'rgba(255, 107, 138, 0.2)', company: 'Google', desc: '다양한 관점' },
};

export const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; color: string; icon: string }> = {
  tourism: { label: '관광', color: '#00FFB2', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' },
  shopping: { label: '쇼핑', color: '#FFD166', icon: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1z' },
  culture: { label: '문화', color: '#9B6DFF', icon: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z' },
  food: { label: '음식', color: '#FF6B8A', icon: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z' },
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
