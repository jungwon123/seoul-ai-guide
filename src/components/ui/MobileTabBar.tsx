'use client';

import { cn } from '@/lib/utils';

type Tab = 'chat' | 'map' | 'calendar' | 'booking';

interface MobileTabBarProps {
  active: Tab;
  onSelect: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'chat', label: '채팅', emoji: '💬' },
  { key: 'map', label: '지도', emoji: '🗺️' },
  { key: 'calendar', label: '일정', emoji: '📅' },
  { key: 'booking', label: '예약', emoji: '🎟' },
];

export default function MobileTabBar({ active, onSelect }: MobileTabBarProps) {
  return (
    <nav className="flex lg:hidden border-t border-border-default bg-bg-secondary/90 backdrop-blur-sm shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors cursor-pointer',
            active === tab.key
              ? 'text-brand-primary'
              : 'text-text-muted',
          )}
        >
          <span className="text-lg leading-none">{tab.emoji}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
