// 인증 스토어 — JWT 토큰 + 사용자 프로필 (Zustand).
// localStorage와 동기화: 새로고침 시 자동 복구.

import { create } from 'zustand';
import { authApi, getToken, setToken, setOnUnauthorized } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import type { ApiUser, TokenResponse } from '@/types/api';

type AuthUser = {
  user_id: string;
  email: string;
  nickname: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  // actions
  init: () => void;
  signup: (email: string, password: string, nickname?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: (id_token: string) => Promise<void>;
  logout: () => void;
  setUser: (u: AuthUser | null) => void;
};

const USER_KEY = 'auth.user';

function persistUser(u: AuthUser | null): void {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* private mode */
  }
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    // localStorage 손상/외부 변조에 대비한 최소 schema 검증.
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { user_id?: unknown }).user_id === 'string' &&
      typeof (parsed as { email?: unknown }).email === 'string'
    ) {
      const p = parsed as { user_id: string; email: string; nickname?: unknown };
      return {
        user_id: p.user_id,
        email: p.email,
        nickname: typeof p.nickname === 'string' ? p.nickname : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeUser(payload: TokenResponse): AuthUser {
  const flat: ApiUser | undefined = payload.user;
  const id = flat?.user_id ?? payload.user_id ?? '';
  const email = flat?.email ?? payload.email ?? '';
  const nickname = (flat?.nickname ?? payload.nickname ?? null) as string | null;
  return { user_id: String(id), email, nickname };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  error: null,
  initialized: false,

  init: () => {
    const token = getToken();
    const user = loadUser();
    set({ token, user, initialized: true });
    setOnUnauthorized(() => {
      // 401이 처음 한 번만 토스트 — 이미 로그아웃된 상태면 silent
      if (get().token) {
        toast.error('세션이 만료되었습니다. 다시 로그인해 주세요.');
      }
      get().logout();
    });
  },

  signup: async (email, password, nickname) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.signup({ email, password, nickname });
      const u = normalizeUser(res);
      setToken(res.access_token);
      persistUser(u);
      set({ token: res.access_token, user: u, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login({ email, password });
      const u = normalizeUser(res);
      setToken(res.access_token);
      persistUser(u);
      set({ token: res.access_token, user: u, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  loginGoogle: async (id_token) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.google({ id_token });
      const u = normalizeUser(res);
      setToken(res.access_token);
      persistUser(u);
      set({ token: res.access_token, user: u, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  logout: () => {
    setToken(null);
    persistUser(null);
    set({ token: null, user: null });
  },

  setUser: (u) => {
    persistUser(u);
    set({ user: u });
  },
}));
