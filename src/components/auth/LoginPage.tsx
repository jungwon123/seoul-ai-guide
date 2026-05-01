import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AuthLayout from './AuthLayout';
import Button from '@/components/ui/Button';

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
      setError((err as Error).message || '로그인에 실패했습니다');
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
            className="px-3 py-2 rounded-lg border border-border focus:border-brand outline-none transition-colors"
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
            className="px-3 py-2 rounded-lg border border-border focus:border-brand outline-none transition-colors"
            placeholder="8자 이상"
          />
        </label>
        {error && (
          <div role="alert" className="text-sm text-brand bg-brand-subtle px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? '로그인 중...' : '로그인'}
        </Button>
      </form>
    </AuthLayout>
  );
}
