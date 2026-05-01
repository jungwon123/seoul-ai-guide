import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AuthLayout from './AuthLayout';
import Button from '@/components/ui/Button';

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
      setError((err as Error).message || '회원가입에 실패했습니다');
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
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? '가입 중...' : '회원가입'}
        </Button>
      </form>
    </AuthLayout>
  );
}
