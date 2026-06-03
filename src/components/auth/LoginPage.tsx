import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { friendlyAuthError } from '@/lib/auth-errors';
import AuthLayout from './AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 오픈 리다이렉트 방어: 내부 절대 경로(/...)만 허용. //evil.com, http://...,
  // javascript: 등은 모두 거부. /login·/signup 회귀 경로도 차단(루프 방지).
  const rawFrom = (location.state as { from?: string } | null)?.from ?? '/';
  const isInternal = rawFrom.startsWith('/') && !rawFrom.startsWith('//');
  const isAuthPath = rawFrom === '/login' || rawFrom.startsWith('/login?') ||
    rawFrom === '/signup' || rawFrom.startsWith('/signup?');
  const from = isInternal && !isAuthPath ? rawFrom : '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err, 'login'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="로그인"
      subtitle="당신만의 서울 큐레이션을 이어가세요"
      footer={
        <>
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">이메일</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border-2 border-border bg-bg-surface focus:border-brand outline-none transition-colors"
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border-2 border-border bg-bg-surface focus:border-brand outline-none transition-colors"
            placeholder="8자 이상"
          />
        </label>
        {error && (
          <div role="alert" className="text-sm text-brand bg-brand-subtle px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="group mt-1 flex w-full items-center justify-center gap-2 rounded-full border-2 border-border-strong bg-brand py-3 text-[15px] font-semibold text-white shadow-[3px_3px_0_rgba(15,15,15,0.9)] transition-[transform,box-shadow] duration-150 hover:shadow-[5px_5px_0_rgba(15,15,15,0.9)] active:shadow-[1px_1px_0_rgba(15,15,15,0.9)] motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_rgba(15,15,15,0.9)] disabled:translate-x-0 disabled:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2"
        >
          {submitting ? '로그인 중...' : '로그인'}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand">
            <ArrowRight size={14} strokeWidth={2.6} aria-hidden="true" />
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}
