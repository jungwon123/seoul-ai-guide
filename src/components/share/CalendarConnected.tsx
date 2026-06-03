// Google Calendar OAuth 콜백 후 사용자가 보는 페이지.
// BE 콜백(/api/v1/auth/google/calendar/callback)이 redirect 하도록 BE에 요청 필요.
// 현재 BE는 JSON {message:"..."} 반환하므로 사용자가 raw 페이지를 봄.
// 임시 대안: 사용자가 직접 이 URL로 돌아올 수 있는 안내.

import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function CalendarConnected() {
  const [params] = useSearchParams();
  const error = params.get('error');
  const success = !error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-warm-gradient">
      <div className="w-full max-w-md">
        <div className="bg-bg-surface border-2 border-border-strong rounded-2xl p-8 shadow-[4px_4px_0_rgba(15,15,15,0.9)] text-center">
          {success ? (
            <>
              <CheckCircle2 size={48} strokeWidth={1.5} className="text-[#6B8E5A] mx-auto mb-4" />
              <h1 className="font-display-round text-2xl mb-2">연동 완료</h1>
              <p className="text-sm text-text-secondary mb-6">
                Google Calendar 연결이 완료되었어요.
                이제 추천 일정을 본인 캘린더에 자동 등록할 수 있어요.
              </p>
            </>
          ) : (
            <>
              <XCircle size={48} strokeWidth={1.5} className="text-brand mx-auto mb-4" />
              <h1 className="font-display-round text-2xl mb-2">연동 실패</h1>
              <p className="text-sm text-text-secondary mb-6">
                {error === 'access_denied'
                  ? '권한 요청을 취소했어요. 다시 시도하려면 설정에서 연동해 주세요.'
                  : `오류가 발생했어요: ${error}`}
              </p>
            </>
          )}
          <Link
            to="/"
            className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-border-strong bg-brand px-6 py-2.5 text-[15px] font-semibold text-white shadow-[3px_3px_0_rgba(15,15,15,0.9)] transition-[transform,box-shadow] duration-150 hover:shadow-[5px_5px_0_rgba(15,15,15,0.9)] active:shadow-[1px_1px_0_rgba(15,15,15,0.9)] motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2"
          >
            메인으로
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand">
              <ArrowRight size={14} strokeWidth={2.6} aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
