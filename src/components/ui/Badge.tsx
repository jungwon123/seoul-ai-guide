

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export default function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium',
        className,
      )}
      style={color ? { backgroundColor: `${color}10`, color } : undefined}
    >
      {children}
    </span>
  );
}
