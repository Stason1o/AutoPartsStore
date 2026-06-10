import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from '../api/client';

interface AuthState {
  loading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  loading: true,
  username: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => setUsername(null));
    api
      .get<{ username: string }>('/api/admin/me')
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const res = await api.post<{ username: string }>(
      '/api/admin/login',
      { username: user, password },
      { skipUnauthorizedRedirect: true },
    );
    setUsername(res.username);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/admin/logout');
    } finally {
      setUsername(null);
    }
  }, []);

  const value = useMemo(
    () => ({ loading, username, login, logout }),
    [loading, username, login, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
