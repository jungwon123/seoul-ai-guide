'use client';

import { cn } from '@/lib/utils';
import NeonIcon from './NeonIcon';

type Tab = 'chat' | 'map' | 'calendar' | 'booking';

interface MobileTabBarProps {
  active: Tab;
  onSelect: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'chat', label: '채팅', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
  { key: 'map', label: '지도', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' },
  { key: 'calendar', label: '일정', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z' },
  { key: 'booking', label: '예약', icon: 'M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z' },
];

export default function MobileTabBar({ active, onSelect }: MobileTabBarProps) {
  return (
    <nav
      className="flex lg:hidden shrink-0"
      style={{
        background: 'rgba(5, 8, 16, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border-default)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors cursor-pointer',
              isActive ? 'text-neon-mint' : 'text-text-muted',
            )}
          >
            <NeonIcon path={tab.icon} color={isActive ? '#00FFB2' : 'rgba(120,150,200,0.4)'} size={20} glow={isActive} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
