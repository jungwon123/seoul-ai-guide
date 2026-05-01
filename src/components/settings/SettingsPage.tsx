import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usersApi, googleCalendarApi } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [nicknameMsg, setNicknameMsg] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [savingNick, setSavingNick] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [connectingCal, setConnectingCal] = useState(false);
  const [calMsg, setCalMsg] = useState<string | null>(null);

  const onSaveNickname = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !user) return;
    setSavingNick(true);
    setNicknameMsg(null);
    try {
      const res = await usersApi.updateNickname(nickname.trim());
      setUser({ ...user, nickname: res.nickname });
      setNicknameMsg('닉네임을 저장했습니다.');
    } catch (err) {
      setNicknameMsg((err as Error).message || '저장 실패');
    } finally {
      setSavingNick(false);
    }
  };

  const onConnectGoogleCalendar = async () => {
    if (connectingCal) return;
    setConnectingCal(true);
    setCalMsg(null);
    try {
      const { auth_url } = await googleCalendarApi.getAuthUrl();
      // 동의 화면으로 전체 리다이렉트. 콜백은 BE가 직접 처리.
      window.location.href = auth_url;
    } catch (err) {
      setCalMsg((err as Error).message || '연동 URL을 불러올 수 없습니다');
      setConnectingCal(false);
    }
  };

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    setPwMsg(null);
    try {
      await usersApi.changePassword(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      setPwMsg('비밀번호를 변경했습니다.');
    } catch (err) {
      setPwMsg((err as Error).message || '변경 실패');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-10">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft size={16} /> 뒤로
        </button>
        <h1 className="font-display text-3xl mb-1">설정</h1>
        <p className="text-sm text-text-secondary mb-8">{user?.email}</p>

        <section className="bg-bg-surface border-2 border-border-strong rounded-2xl p-6 shadow-[2px_2px_0_rgba(15,15,15,0.9)] mb-6">
          <h2 className="font-display text-lg mb-4">프로필</h2>
          <form onSubmit={onSaveNickname} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">닉네임</span>
              <input
                type="text"
                maxLength={100}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border focus:border-brand outline-none transition-colors"
              />
            </label>
            {nicknameMsg && <div className="text-sm text-text-secondary">{nicknameMsg}</div>}
            <Button type="submit" disabled={savingNick}>
              {savingNick ? '저장 중...' : '저장'}
            </Button>
          </form>
        </section>

        <section className="bg-bg-surface border-2 border-border-strong rounded-2xl p-6 shadow-[2px_2px_0_rgba(15,15,15,0.9)] mb-6">
          <h2 className="font-display text-lg mb-4">비밀번호 변경</h2>
          <form onSubmit={onChangePassword} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">현재 비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border focus:border-brand outline-none transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">새 비밀번호</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border focus:border-brand outline-none transition-colors"
              />
            </label>
            {pwMsg && <div className="text-sm text-text-secondary">{pwMsg}</div>}
            <Button type="submit" disabled={savingPw}>
              {savingPw ? '변경 중...' : '변경'}
            </Button>
          </form>
        </section>

        <section className="bg-bg-surface border-2 border-border-strong rounded-2xl p-6 shadow-[2px_2px_0_rgba(15,15,15,0.9)] mb-6">
          <h2 className="font-display text-lg mb-2">Google Calendar 연동</h2>
          <p className="text-sm text-text-secondary mb-4">
            추천 일정을 본인 Google Calendar에 자동 등록합니다.
          </p>
          {calMsg && <div className="text-sm text-text-secondary mb-3">{calMsg}</div>}
          <Button onClick={onConnectGoogleCalendar} disabled={connectingCal}>
            {connectingCal ? '이동 중...' : 'Google Calendar 연동하기'}
          </Button>
        </section>

        <section className="bg-bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display text-lg mb-3">로그아웃</h2>
          <Button
            variant="danger"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            로그아웃
          </Button>
        </section>
      </div>
    </div>
  );
}
