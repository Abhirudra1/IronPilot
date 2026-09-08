import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Dumbbell, CalendarDays, Play, Library, TrendingUp, Utensils, Sparkles, BarChart3, Trophy, User as UserIcon,
  Settings, Shield, Bell, Sun, Moon, Monitor, LogOut, WifiOff, Menu, X, History, ChevronRight, PanelLeftClose, PanelLeftOpen, CloudOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useOnline } from '@/hooks/useOnline';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { safePath } from '@/lib/safePath';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { Notification } from '@/types';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; short?: string };
// Grouped so the drawer reads as three clear areas: train, track, you
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'Train', items: [
    { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/session', label: 'Start workout', icon: Play },
    { to: '/plans', label: 'Plans', icon: Dumbbell, short: 'Plan' },
    { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/week', label: "Coach's week", icon: Sparkles },
    { to: '/equipment', label: 'Equipment guide', icon: Library },
  ] },
  { title: 'Track', items: [
    { to: '/nutrition', label: 'Nutrition', icon: Utensils, short: 'Food' },
    { to: '/progress', label: 'Weight & progress', icon: TrendingUp },
    { to: '/history', label: 'History', icon: History },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/achievements', label: 'Achievements', icon: Trophy },
  ] },
  { title: 'You', items: [
    { to: '/coach', label: 'AI Coach', icon: Sparkles, short: 'Coach' },
    { to: '/profile', label: 'Profile', icon: UserIcon },
    { to: '/settings', label: 'Settings', icon: Settings },
  ] },
];
const NAV = NAV_GROUPS.flatMap((g) => g.items);
const byPath = (p: string) => NAV.find((n) => n.to === p)!;
// Bottom bar: Home · Plan · [Start] · Food · Coach
const MOBILE_LEFT = [byPath('/'), byPath('/plans')];
const MOBILE_RIGHT = [byPath('/nutrition'), byPath('/coach')];
const TITLES: Record<string, string> = { ...Object.fromEntries(NAV.map((n) => [n.to, n.label])), '/': 'IronPilot', '/session': 'Workout', '/week': "This week's plan" };
const SIDEBAR_KEY = 'ip_sidebar';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/icons/icon.svg" alt="" className={cn('shrink-0 rounded-xl', compact ? 'h-8 w-8' : 'h-9 w-9')} />
      {!compact && <span className="text-lg font-extrabold tracking-tight">Iron<span className="text-brand-500 dark:text-brand-400">Pilot</span></span>}
    </span>
  );
}

function ThemeToggle({ full = false }: { full?: boolean }) {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  if (full) return <button onClick={() => setTheme(next)} className="btn-secondary w-full justify-between"><span className="flex items-center gap-2"><Icon className="h-4 w-4" /> Theme: {theme}</span><ChevronRight className="h-4 w-4 opacity-60" /></button>;
  return <button onClick={() => setTheme(next)} className="btn-ghost h-10 w-10 rounded-full p-0" aria-label={`Theme: ${theme}. Switch to ${next}`} title={`Theme: ${theme}`}><Icon className="h-5 w-5" /></button>;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: async () => (await api.get('/analytics/notifications')).data as { items: Notification[]; unread: number }, refetchInterval: 90_000 });
  const markAll = useMutation({ mutationFn: () => api.patch('/analytics/notifications/all/read'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const markOne = useMutation({ mutationFn: (id: string) => api.patch(`/analytics/notifications/${id}/read`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const unread = data?.unread || 0;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative h-10 w-10 rounded-full p-0" aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white dark:bg-brand-400 dark:text-zinc-950">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="card absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] p-2 shadow-card-lg">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-sm font-bold">Notifications</p>
                {unread > 0 && <button className="text-xs font-semibold text-brand-500 dark:text-brand-400" onClick={() => markAll.mutate()}>Mark all read</button>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!data?.items.length && <p className="p-4 text-center text-sm text-zinc-500">You're all caught up.</p>}
                {data?.items.slice(0, 20).map((n) => (
                  <button key={n._id} onClick={() => { if (!n.read) markOne.mutate(n._id); setOpen(false); if (n.link) nav(safePath(n.link)); }}
                    className={cn('block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-white/5', !n.read && 'bg-brand-500/5')}>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{n.message}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppShell() {
  const { user, logout, serverDown } = useAuth();
  const { online, queued } = useOnline();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'; } catch { return false; } });
  const loc = useLocation();
  useEffect(() => setDrawer(false), [loc.pathname]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'open'); } catch { /* ignore */ } }, [collapsed]);
  const title = TITLES[loc.pathname] || (loc.pathname.startsWith('/admin') ? 'Admin' : loc.pathname.startsWith('/equipment') ? 'Equipment' : loc.pathname.startsWith('/session') ? 'Workout' : '');

  const item = (active: boolean, mini: boolean) => cn('flex min-h-10 items-center gap-3 rounded-xl text-sm font-semibold transition', mini ? 'justify-center px-0' : 'px-3', active ? 'bg-zinc-900 text-white dark:bg-brand-400 dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5');

  /** Desktop sidebar (expanded or icon-only) and the mobile drawer share this markup (a render helper, not a nested component). */
  const sidebar = (mobile = false) => {
    const mini = collapsed && !mobile;
    return (
      <nav className="flex h-full flex-col" aria-label="Main">
        <div className={cn('flex items-center py-4', mini ? 'justify-center px-2' : 'justify-between px-4')}>
          <Brand compact={mini} />
          {mobile && <button onClick={() => setDrawer(false)} className="btn-ghost h-10 w-10 p-0" aria-label="Close menu"><X className="h-5 w-5" /></button>}
          {!mobile && !mini && <button onClick={() => setCollapsed(true)} className="btn-ghost h-9 w-9 p-0 text-zinc-400" aria-label="Collapse sidebar" title="Collapse"><PanelLeftClose className="h-4 w-4" /></button>}
        </div>
        {mini && <button onClick={() => setCollapsed(false)} className="btn-ghost mx-auto mb-1 h-9 w-9 p-0 text-zinc-400" aria-label="Expand sidebar" title="Expand"><PanelLeftOpen className="h-4 w-4" /></button>}
        <div className={cn('flex-1 overflow-y-auto overflow-x-hidden scrollbar-none', mini ? 'px-2' : 'px-3')}>
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="mb-2">
              {!mini && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{g.title}</p>}
              {mini && <div className="mx-auto my-1.5 h-px w-6 bg-zinc-200 dark:bg-white/10" />}
              <div className="space-y-0.5">
                {g.items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => item(isActive, mini)} title={mini ? n.label : undefined} aria-label={n.label}>
                    <n.icon className="h-[18px] w-[18px] shrink-0" />{!mini && <span className="truncate">{n.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => cn(item(false, mini), isActive && 'bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-white')} title={mini ? 'Admin Panel' : undefined} aria-label="Admin Panel">
              <Shield className="h-[18px] w-[18px] shrink-0" />{!mini && 'Admin Panel'}
            </NavLink>
          )}
        </div>
        <div className={cn('space-y-2 border-t border-zinc-200 dark:border-white/[0.06]', mini ? 'p-2' : 'p-3')}>
          {mobile && <ThemeToggle full />}
          <div className={cn('flex items-center gap-3 py-1', mini ? 'flex-col px-0' : 'px-1')}>
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-500/15 text-sm font-bold text-brand-600 dark:text-brand-400" title={user?.fullName}>
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user?.fullName?.[0]}
            </div>
            {!mini && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                <p className="truncate text-xs text-zinc-500">Level {user?.level} · {user?.points} pts</p>
              </div>
            )}
            <button onClick={logout} className="btn-ghost h-9 w-9 p-0" aria-label="Log out" title="Log out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </nav>
    );
  };

  return (
    <div className="min-h-[100dvh] lg:flex">
      <aside className={cn('hidden shrink-0 border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-white/[0.06] dark:bg-surface-800 lg:fixed lg:inset-y-0 lg:block', collapsed ? 'w-[4.75rem]' : 'w-64')} style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)' }}>{sidebar()}</aside>
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[82vw] max-w-xs bg-white dark:bg-surface-800 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)' }} initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} role="dialog" aria-label="Menu">{sidebar(true)}</motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('flex min-h-[100dvh] flex-1 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-white/[0.06] dark:bg-surface/90 lg:bg-zinc-50/80 lg:dark:bg-surface/80" style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
          <div className="flex h-14 items-center gap-1 px-2 sm:px-4 lg:h-16">
            <button onClick={() => setDrawer(true)} className="btn-ghost h-10 w-10 p-0 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0 lg:hidden">{title ? <span className="truncate text-base font-extrabold">{title}</span> : <Brand compact />}</div>
            <div className="ml-auto flex items-center gap-0.5">
              {!online && <span className="chip bg-amber-500/15 text-amber-700 dark:text-amber-300"><WifiOff className="h-3.5 w-3.5" /> Offline{queued ? ` · ${queued}` : ''}</span>}
              {online && queued > 0 && <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400">{queued} to sync</span>}
              <span className="hidden lg:block"><ThemeToggle /></span>
              <NotificationBell />
            </div>
          </div>
        </header>
        {serverDown && <div role="status" className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300"><CloudOff className="h-4 w-4" /> Can't reach the server - showing what's cached and retrying automatically.</div>}
        <main id="main" className="flex-1 py-4 sm:py-6 lg:pb-8" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))', paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto min-w-0 max-w-6xl"><ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary></div>
        </main>

        {/* Mobile bottom bar with raised Start button. Fixed to the visual viewport; safe-area padded for curved / notched phones. */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-white/[0.06] dark:bg-surface-800/95 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)', transform: 'translateZ(0)' }} aria-label="Bottom navigation">
          <div className="grid h-16 grid-cols-5 items-center">
            {MOBILE_LEFT.map((n) => <TabItem key={n.to} {...n} />)}
            <NavLink to="/session" className="flex flex-col items-center" aria-label="Start workout session">
              {({ isActive }) => (
                <>
                  <span className={cn('-mt-8 grid h-14 w-14 place-items-center rounded-full border-4 border-zinc-50 shadow-glow transition dark:border-surface', isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950')}><Play className="ml-0.5 h-6 w-6" fill="currentColor" /></span>
                  <span className={cn('mt-1 text-[10px] font-bold', isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500')}>Start</span>
                </>
              )}
            </NavLink>
            {MOBILE_RIGHT.map((n) => <TabItem key={n.to} {...n} />)}
          </div>
        </nav>
      </div>
    </div>
  );
}

function TabItem({ to, label, short, icon: Icon, end }: NavItem) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn('flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold', isActive ? 'text-zinc-900 dark:text-brand-400' : 'text-zinc-500 dark:text-zinc-400')}>
      {({ isActive }) => (<><span className={cn('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-brand-500/10 dark:bg-brand-400/15')}><Icon className="h-5 w-5" /></span>{short || label}</>)}
    </NavLink>
  );
}
