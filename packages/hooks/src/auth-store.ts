import { create } from "zustand";
import { apiFetch, getApiConfig } from "./api-client";

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
  timezone?: string;
  language?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  biometricEnabled?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<{ twoFactorRequired?: boolean }>;
  register: (email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  login: async (email, password, twoFactorCode) => {
    const res = await apiFetch<{
      token: string;
      user: AuthUser;
      twoFactorRequired?: boolean;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, twoFactorCode }),
    });

    if (res.twoFactorRequired) {
      return { twoFactorRequired: true };
    }

    await getApiConfig().setToken(res.token);
    set({ user: res.user });
    return {};
  },

  register: async (email, password, referralCode) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, referralCode }),
      }
    );
    await getApiConfig().setToken(res.token);
    set({ user: res.user });
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    await getApiConfig().setToken(null);
    set({ user: null });
  },

  refreshUser: async () => {
    try {
      const user = await apiFetch<AuthUser>("/auth/me");
      set({ user });
    } catch {
      set({ user: null });
    }
  },
}));
