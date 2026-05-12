import { ApiHttpError } from '@/lib/api';

// API status 코드별 일반 한글 메시지. SettingsPage 등 도메인 무관 호출용.
// BE 한글 메시지가 있으면 그걸 우선 노출하고, 없을 때만 status 폴백.
export function friendlyApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 401) return err.message || '인증이 만료되었습니다. 다시 로그인해 주세요';
    if (err.status === 403) return err.message || '접근 권한이 없습니다';
    if (err.status === 404) return err.message || '요청한 항목을 찾을 수 없습니다';
    if (err.status === 409) return err.message || '이미 존재하는 항목입니다';
    if (err.status === 422) return err.message || '입력값을 확인해 주세요';
    if (err.status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요';
    if (err.status === 0 || err.message === 'Timeout') return '네트워크 연결을 확인해 주세요';
    if (err.message) return err.message;
  }
  return (err as Error)?.message || fallback;
}

// Login/Signup 양 페이지가 공유하는 에러 메시지 매핑.
// 일반 정책은 friendlyApiError에 위임하고, 인증 특수 케이스만 별도 분기.
export function friendlyAuthError(err: unknown, mode: 'login' | 'signup'): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 409) return '이미 가입된 이메일입니다';
    if (err.status === 401) {
      // BE가 이미 한글로 응답 (예: "이메일 또는 비밀번호가 올바르지 않습니다") — 그대로 사용.
      return err.message || '이메일 또는 비밀번호가 올바르지 않습니다';
    }
  }
  return friendlyApiError(
    err,
    mode === 'login' ? '로그인에 실패했습니다' : '회원가입에 실패했습니다',
  );
}
