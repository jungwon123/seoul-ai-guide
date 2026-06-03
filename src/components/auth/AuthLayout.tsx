// 트렌디 그라데이션 파일럿 — 웜 그라데이션 배경 + 비비드 블롭 + 라운드 헤비 그로테스크.
// 레트로 정체성(굵은 흑선 카드 + chunky 오프셋 그림자)은 유지하며 색/폰트만 융합.

import type { ReactNode } from 'react';
import AgentOrb from '@/components/agent/AgentOrb';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 bg-warm-gradient overflow-hidden">
      {/* 비비드 그라데이션 블롭 — 레퍼런스의 손 일러스트 자리를 블러 오브로 대체, 깊이감만 */}
      <div
        aria-hidden="true"
        className="bg-vivid-gradient pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full opacity-60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-vivid-gradient pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full opacity-40 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        {/* 로고 + 민트 스티커 */}
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          {/* 흰 받침 + 굵은 선 orb. 레트로 흑선+chunky 융합 */}
          <div className="flex items-center justify-center rounded-full bg-bg-surface border-2 border-border-strong p-4 shadow-[4px_4px_0_rgba(15,15,15,0.9)]">
            <AgentOrb state="idle" size={78} interactive={false} bold />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display-round text-3xl text-text-primary">Anyway</span>
            <span
              className="rotate-[-6deg] rounded-full border-2 border-border-strong bg-accent-mint px-2.5 py-0.5 text-[11px] font-bold text-accent-mint-ink shadow-[2px_2px_0_rgba(15,15,15,0.9)]"
            >
              SEOUL
            </span>
          </div>
        </div>

        {/* 카드 — 레트로 융합 유지(순백 + 굵은 흑선 + chunky 그림자) */}
        <div className="bg-bg-surface border-2 border-border-strong rounded-2xl p-8 shadow-[4px_4px_0_rgba(15,15,15,0.9)]">
          <h1 className="font-display-round text-[28px] leading-tight mb-2 text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary mb-6">{subtitle}</p>}
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-text-primary/80">{footer}</div>}
      </div>
    </div>
  );
}
