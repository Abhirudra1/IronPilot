import { NavLink } from 'react-router-dom';
import { Dumbbell, CalendarDays, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/plans', label: 'My plans', icon: Dumbbell },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/week', label: "Coach's week", icon: Sparkles },
];

/** Shared segmented navigation for the three planning views so users always know where they are. */
export default function PlanNav() {
  return (
    <nav className="mb-4 grid grid-cols-3 rounded-xl bg-zinc-100 p-1 dark:bg-white/5" aria-label="Planning">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => cn('flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition sm:text-sm', isActive ? 'bg-white text-zinc-900 shadow-card dark:bg-surface-600 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white')}>
          <t.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
