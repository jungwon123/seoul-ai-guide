'use client';

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="text-center animate-fade-up">
        <div className="w-14 h-14 rounded-2xl bg-bg-subtle border border-border flex items-center justify-center mx-auto mb-5">
          <Icon size={24} strokeWidth={1.2} className="text-text-muted" />
        </div>
        <h3 className="text-[20px] text-text-primary mb-2 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h3>
        <p className="text-[13px] text-text-muted max-w-[240px] mx-auto leading-[1.65]">
          {description}
        </p>
      </div>
    </div>
  );
}
