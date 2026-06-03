import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { friendlyAuthError } from '@/lib/auth-errors';
import AuthLayout from './AuthLayout';

export default function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email.trim(), password, nickname.trim() || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err, 'signup'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="회원가입"
      subtitle="이메일과 비밀번호 8자 이상이면 됩니다"
      footer={
        <>
          이미 계정이 있나요?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            로그인
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
          <span className="font-medium">닉네임 (선택)</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={100}
            className="px-3 py-2 rounded-lg border border-border focus:border-brand outline-none transition-colors"
            placeholder="비워두면 이메일을 사용합니다"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">비밀번호</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
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
        <button
          type="submit"
          disabled={submitting}
          className="group mt-1 flex w-full items-center justify-center gap-2 rounded-full border-2 border-border-strong bg-brand py-3 text-[15px] font-semibold text-white shadow-[3px_3px_0_rgba(15,15,15,0.9)] transition-[transform,box-shadow] duration-150 hover:shadow-[5px_5px_0_rgba(15,15,15,0.9)] active:shadow-[1px_1px_0_rgba(15,15,15,0.9)] motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_rgba(15,15,15,0.9)] disabled:translate-x-0 disabled:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2"
        >
          {submitting ? '가입 중...' : '회원가입'}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand">
            <ArrowRight size={14} strokeWidth={2.6} aria-hidden="true" />
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}
