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
        <Icon size={40} strokeWidth={1} className="mx-auto mb-4 text-text-muted" />
        <h3
          className="text-xl text-text-primary mb-1"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}
        >
          {title}
        </h3>
        <p className="text-[13px] text-text-muted max-w-[240px] mx-auto leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
