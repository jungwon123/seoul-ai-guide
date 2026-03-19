'use client';

import { cn } from '@/lib/utils';
import { MessageCircle, MapPin, Calendar, Ticket } from 'lucide-react';

type Tab = 'chat' | 'map' | 'calendar' | 'booking';

interface MobileTabBarProps {
  active: Tab;
  onSelect: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; icon: typeof MessageCircle }[] = [
  { key: 'chat', label: '채팅', icon: MessageCircle },
  { key: 'map', label: '지도', icon: MapPin },
  { key: 'calendar', label: '일정', icon: Calendar },
  { key: 'booking', label: '예약', icon: Ticket },
];

export default function MobileTabBar({ active, onSelect }: MobileTabBarProps) {
  return (
    <nav className="flex lg:hidden border-t border-border bg-bg-surface/90 backdrop-blur-sm shrink-0">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors cursor-pointer',
              isActive ? 'text-brand' : 'text-text-muted',
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
