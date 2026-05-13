import type { LucideIcon } from 'lucide-react';
import LottiePlayer from './LottiePlayer';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional Lottie animation to replace the icon. icon is used as fallback if Lottie fails. */
  lottieSrc?: string;
}

export default function EmptyState({ icon: Icon, title, description, lottieSrc }: EmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="text-center animate-fade-up">
        {lottieSrc ? (
          <div className="w-32 h-32 mx-auto mb-4">
            <LottiePlayer
              src={lottieSrc}
              className="w-full h-full"
              ariaLabel={title}
              fallback={
                <div className="w-14 h-14 rounded-2xl bg-bg-subtle border border-border flex items-center justify-center mx-auto">
                  <Icon size={24} strokeWidth={1.2} className="text-text-muted" />
                </div>
              }
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-bg-subtle border border-border flex items-center justify-center mx-auto mb-5">
            <Icon size={24} strokeWidth={1.2} className="text-text-muted" />
          </div>
        )}
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
