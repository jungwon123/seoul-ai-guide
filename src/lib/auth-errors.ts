import { ApiHttpError } from '@/lib/api';

// Login/Signup 양 페이지가 공유하는 에러 메시지 매핑.
// BE 응답이 영문이거나 HTTP status로만 의미가 드러나는 케이스를 한글 폴백으로 정규화.
export function friendlyAuthError(err: unknown, mode: 'login' | 'signup'): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 409) return '이미 가입된 이메일입니다';
    if (err.status === 401) {
      // BE가 이미 한글로 응답 (예: "이메일 또는 비밀번호가 올바르지 않습니다") — 그대로 사용.
      return err.message || '이메일 또는 비밀번호가 올바르지 않습니다';
    }
    if (err.status === 422) {
      // extractErrorMessage가 Pydantic 배열을 한글로 변환해 message에 담아둠.
      return err.message || '입력값을 확인해 주세요';
    }
    if (err.status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요';
    if (err.status === 0 || err.message === 'Timeout') return '네트워크 연결을 확인해 주세요';
    if (err.message) return err.message;
  }
  return (
    (err as Error)?.message ||
    (mode === 'login' ? '로그인에 실패했습니다' : '회원가입에 실패했습니다')
  );
}
