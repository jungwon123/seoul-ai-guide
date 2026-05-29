// 88 올림픽 톤의 단순한 인증 폼 셸 (Login/Signup 공용).

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
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8 gap-2">
          <AgentOrb state="idle" size={72} interactive={false} />
          <span className="font-display text-xl tracking-tight">LocalBiz</span>
        </div>

        <div className="bg-bg-surface border-2 border-border-strong rounded-2xl p-8 shadow-[4px_4px_0_rgba(15,15,15,0.9)]">
          <h1 className="font-display text-2xl mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary mb-6">{subtitle}</p>}
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}
