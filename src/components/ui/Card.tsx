'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hoverable, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-secondary rounded-xl border border-border-default shadow-card',
        hoverable && 'hover:bg-bg-elevated hover:border-border-active transition-all duration-200 cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
