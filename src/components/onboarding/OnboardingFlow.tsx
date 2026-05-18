import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import LottiePlayer from '@/components/ui/LottiePlayer';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'splash' | 'success';

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('splash');

  // Auto-dismiss the success celebration after the Lottie has time to play
  useEffect(() => {
    if (step !== 'success') return;
    const t = setTimeout(onComplete, 1600);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  if (step === 'splash') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base">
        <div className="text-center animate-fade-up">
          <p className="text-[13px] text-text-muted font-medium tracking-[0.1em] uppercase mb-4">
            AI Travel Curation
          </p>
          <h1
            className="text-[42px] text-text-primary mb-3 leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
          >
            LocalBiz
          </h1>
          <p className="text-[16px] text-text-secondary max-w-xs mx-auto leading-[1.6] mb-10">
            당신만의 서울을 큐레이션하세요.
            <br />
            AI 에이전트가 여행을 설계합니다.
          </p>
          <button
            onClick={() => setStep('success')}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-text-primary text-text-inverse rounded-full text-[14px] font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            시작하기
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-base">
      <div className="text-center animate-fade-up">
        <LottiePlayer
          src="/animations/success.json"
          className="w-40 h-40 mx-auto mb-4"
          loop={false}
          ariaLabel="설정 완료"
          fallback={
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-subtle flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          }
        />
        <h2
          className="text-[24px] text-text-primary mb-2"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          모든 준비가 끝났어요
        </h2>
        <p className="text-[14px] text-text-secondary">
          서울의 모든 순간을 함께할게요.
        </p>
      </div>
    </div>
  );
}
