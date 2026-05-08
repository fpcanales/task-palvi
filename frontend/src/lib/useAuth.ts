import { useCallback, useEffect, useState } from "react";

import { api, clearToken, setToken } from "../api/client";
import type { User } from "../types";

const TOKEN_KEY = "palvi.token";
const USER_KEY = "palvi.user";

export interface AuthState {
  token: string | null;
  user: User | null;
  hydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [hydrating, setHydrating] = useState<boolean>(
    () => !!localStorage.getItem(TOKEN_KEY),
  );

  // Validate stored token on mount via /api/auth/me
  useEffect(() => {
    if (!token) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        // client.ts already clears token + reloads on 401 with a token;
        // this catch is defensive for unexpected errors
        if (cancelled) return;
        setUser(null);
        setTokenState(null);
        clearToken();
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setToken(res.access_token);
    setTokenState(res.access_token);
    const u = await api.me();
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUser(null);
  }, []);

  return { token, user, hydrating, login, logout };
}
