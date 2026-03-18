"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "./api";

interface User {
  id: string;
  email: string;
  plan: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("autoact_token");
    const storedUser = localStorage.getItem("autoact_user");
    if (stored && storedUser) {
      setToken(stored);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("autoact_token");
        localStorage.removeItem("autoact_user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("autoact_token", res.token);
    localStorage.setItem("autoact_user", JSON.stringify(res.user));
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await api.register(email, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("autoact_token", res.token);
    localStorage.setItem("autoact_user", JSON.stringify(res.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("autoact_token");
    localStorage.removeItem("autoact_user");
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, token, loading, login, register, logout } },
    children
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
