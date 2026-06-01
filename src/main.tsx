import { createRoot } from 'react-dom/client';
import { StrictMode, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
// Pretendard self-host — Vite 가 woff2 subset 들을 dist/assets/ 로 복사 + content-hash
// → Vercel immutable 캐시 적용. 브라우저는 unicode-range 매칭되는 subset 만 fetch.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';
import { useAuthStore } from '@/stores/authStore';
import RequireAuth from '@/components/auth/RequireAuth';
import Toaster from '@/components/ui/Toaster';
// GSAP 플러그인(ScrollTrigger 등) 진입 시점에 1회 등록.
import '@/lib/gsap-setup';

// MSW — dev 환경에서 BE 미배포 상태 검수용.
// VITE_DISABLE_MSW=true 로 끌 수 있음 (실서버 붙일 때).
//
// ⚠️ 주의: 한 번 worker.start()가 호출되면 mockServiceWorker.js가 브라우저에
//   service worker로 등록되고, 이후 새로고침에도 살아남아 fetch를 가로챈다.
//   따라서 disable 모드에선 단순 early-return으로 부족하고, 기존에 등록된
//   SW를 명시 unregister해 줘야 한다.
async function startMockServiceWorker(): Promise<void> {
  // prod 또는 명시적 DISABLE 시 항상 언레지스터.
  // 과거 dev 방문으로 같은 origin에 등록된 stale SW가 prod 페이지의 fetch를
  // 가로채는 사고를 막기 위함 — main.tsx 진입 시점에 강제 정리한다.
  if (!import.meta.env.DEV || import.meta.env.VITE_DISABLE_MSW === 'true') {
    await unregisterMswServiceWorker();
    return;
  }
  const { worker } = await import('@/mocks/msw/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}

async function unregisterMswServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const url = reg.active?.scriptURL ?? '';
      if (url.includes('mockServiceWorker')) {
        await reg.unregister();
      }
    }
  } catch {
    // SW API 거부 환경 — 무시. 사용자가 DevTools에서 수동 해제 가능.
  }
}

const LoginPage = lazy(() => import('@/components/auth/LoginPage'));
const SignupPage = lazy(() => import('@/components/auth/SignupPage'));
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage'));
const SharedPage = lazy(() => import('@/components/share/SharedPage'));
const CalendarConnected = lazy(() => import('@/components/share/CalendarConnected'));

function Bootstrap() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* /shared/:token은 BE API와 충돌(vite/vercel rewrite 잡힘) — FE 라우트는 /s/:token. */}
          <Route path="/s/:token" element={<SharedPage />} />
          <Route path="/calendar/connected" element={<CalendarConnected />} />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// 새 배포로 chunk 해시가 바뀐 뒤, 캐시된 페이지가 옛 chunk(.js)를 요청하면
// SPA fallback(/(.*) → /index.html)이 HTML(text/html)을 200으로 반환 → MIME 에러로
// dynamic import 실패 → 흰 화면. Vite 가 그 시점에 'vite:preloadError' 를 쏘므로
// 세션당 1회 새로고침해 최신 index.html(새 해시)을 회수한다(무한 루프 방지).
window.addEventListener('vite:preloadError', () => {
  const KEY = 'chunk-preload-reloaded';
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* 스토리지 거부 환경 — 그래도 1회 reload 시도 */
  }
  window.location.reload();
});

startMockServiceWorker().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Bootstrap />
    </StrictMode>,
  );
});
