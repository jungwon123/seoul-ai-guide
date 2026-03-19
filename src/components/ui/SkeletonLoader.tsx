'use client';

import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export default function SkeletonLoader({ lines = 3, className }: SkeletonLoaderProps) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          {i === 0 && <div className="w-8 h-8 rounded-full bg-bg-elevated shrink-0" />}
          <div className={cn('space-y-2 flex-1', i > 0 && 'ml-11')}>
            <div
              className="h-3 bg-bg-elevated rounded"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
            {i === 0 && <div className="h-3 bg-bg-elevated rounded w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}
