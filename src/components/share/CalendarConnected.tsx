// Google Calendar OAuth 콜백 후 사용자가 보는 페이지.
// BE 콜백(/api/v1/auth/google/calendar/callback)이 redirect 하도록 BE에 요청 필요.
// 현재 BE는 JSON {message:"..."} 반환하므로 사용자가 raw 페이지를 봄.
// 임시 대안: 사용자가 직접 이 URL로 돌아올 수 있는 안내.

import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function CalendarConnected() {
  const [params] = useSearchParams();
  const error = params.get('error');
  const success = !error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-bg-surface border-2 border-border-strong rounded-2xl p-8 shadow-[4px_4px_0_rgba(15,15,15,0.9)] text-center">
          {success ? (
            <>
              <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#6B8E5A] mx-auto mb-4" />
              <h1 className="font-display text-2xl mb-2">연동 완료</h1>
              <p className="text-sm text-text-secondary mb-6">
                Google Calendar 연결이 완료되었어요.
                이제 추천 일정을 본인 캘린더에 자동 등록할 수 있어요.
              </p>
            </>
          ) : (
            <>
              <XCircle size={48} strokeWidth={1.5} className="text-brand mx-auto mb-4" />
              <h1 className="font-display text-2xl mb-2">연동 실패</h1>
              <p className="text-sm text-text-secondary mb-6">
                {error === 'access_denied'
                  ? '권한 요청을 취소했어요. 다시 시도하려면 설정에서 연동해 주세요.'
                  : `오류가 발생했어요: ${error}`}
              </p>
            </>
          )}
          <Link to="/">
            <Button>
              <span className="inline-flex items-center gap-1.5">
                메인으로 <ArrowRight size={14} />
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
