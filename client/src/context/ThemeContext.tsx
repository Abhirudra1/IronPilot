import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
const Ctx = createContext<{ theme: Theme; resolved: 'light' | 'dark'; setTheme: (t: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => { try { return (localStorage.getItem('ip_theme') as Theme) || 'system'; } catch { return 'system'; } });
  const [sysDark, setSysDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { const mq = matchMedia('(prefers-color-scheme: dark)'); const h = (e: MediaQueryListEvent) => setSysDark(e.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, []);
  const resolved = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0c0e12' : '#5a9e0c');
  }, [resolved]);
  const setTheme = (t: Theme) => { setThemeState(t); try { localStorage.setItem('ip_theme', t); } catch { /* ignore */ } };
  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => { const c = useContext(Ctx); if (!c) throw new Error('useTheme outside ThemeProvider'); return c; };
