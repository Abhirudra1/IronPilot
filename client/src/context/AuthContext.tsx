import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken, isUnreachable } from '@/lib/api';
import type { User } from '@/types';

interface AuthCtx {
  user: User | null; loading: boolean; serverDown: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => void; setUser: (u: User) => void; refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { const { data } = await api.get('/auth/me'); setUser(data.user); setServerDown(false); }
    catch (e) {
      // Only a real 401 logs the user out; an unreachable API keeps the session and shows a retry screen instead
      if (isUnreachable(e)) setServerDown(true); else { clearToken(); setUser(null); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const h = () => setUser(null); window.addEventListener('fc:logout', h); return () => window.removeEventListener('fc:logout', h); }, []);
  useEffect(() => {
    const down = () => setServerDown(true);
    const up = () => { setServerDown(false); if (!user && getToken()) void refresh(); };
    window.addEventListener('fc:server-down', down); window.addEventListener('fc:server-up', up);
    return () => { window.removeEventListener('fc:server-down', down); window.removeEventListener('fc:server-up', up); };
  }, [user, refresh]);
  // While the API is unreachable, probe it every 10 s so the app recovers on its own
  useEffect(() => {
    if (!serverDown) return;
    const id = setInterval(() => { void api.get('/health', { baseURL: `${import.meta.env.VITE_API_URL || ''}/api` }).catch(() => undefined); }, 10_000);
    return () => clearInterval(id);
  }, [serverDown]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const { data } = await api.post('/auth/login', { email, password, remember });
    setToken(data.token, remember); setUser(data.user); return data.user as User;
  }, []);
  const register = useCallback(async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/auth/register', payload);
    setToken(data.token, true); setUser(data.user); return data.user as User;
  }, []);
  const logout = useCallback(() => { clearToken(); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, serverDown, login, register, logout, setUser, refresh }), [user, loading, serverDown, login, register, logout, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c; };
