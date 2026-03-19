'use client';

import Button from './Button';

interface ErrorBubbleProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBubble({ message, onRetry }: ErrorBubbleProps) {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-accent-coral/20 flex items-center justify-center text-accent-coral text-sm shrink-0">
        !
      </div>
      <div className="bg-accent-coral/10 border border-accent-coral/20 rounded-2xl rounded-tl-sm px-4 py-3">
        <p className="text-sm text-accent-coral">{message}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="mt-2 text-accent-coral">
            다시 시도
          </Button>
        )}
      </div>
    </div>
  );
}
