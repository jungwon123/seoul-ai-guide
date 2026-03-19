'use client';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
}

export default function EmptyState({ emoji, title, description }: EmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center animate-fade-in-up">
        <div className="text-5xl mb-4">{emoji}</div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
        <p className="text-xs text-text-muted max-w-[200px] mx-auto">{description}</p>
      </div>
    </div>
  );
}
