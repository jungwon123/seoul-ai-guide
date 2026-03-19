'use client';

interface EmptyStateProps {
  iconPath: string;
  title: string;
  description: string;
  color?: string;
}

export default function EmptyState({ iconPath, title, description, color = '#00FFB2' }: EmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center animate-message-in">
        <svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill={color}
          className="mx-auto mb-4"
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        >
          <path d={iconPath} />
        </svg>
        <h3
          className="text-lg font-bold text-text-primary mb-1 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h3>
        <p className="text-[13px] text-text-secondary max-w-[220px] mx-auto leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
