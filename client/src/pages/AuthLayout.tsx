import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Timer, Sparkles, Salad, TrendingUp } from 'lucide-react';

const FEATURES = [
  { icon: Timer, title: 'Guided sessions', text: 'Press Start at the gym; rest and cardio timers guide every set.' },
  { icon: Sparkles, title: 'AI co-pilot', text: 'Daily, weekly and monthly coaching from your real data.' },
  { icon: Salad, title: 'Diet planner', text: 'Macros and meal ideas that match your goal.' },
  { icon: TrendingUp, title: 'Progress', text: 'Weight, BMI, photos, volume and streaks.' },
];

export function Brand({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/login" className={`flex items-center gap-2 ${className}`}>
      <img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : ''}`}>Iron<span className={light ? 'text-brand-400' : 'text-brand-500 dark:text-brand-400'}>Pilot</span></span>
    </Link>
  );
}

/** Mobile-first auth frame: stacked on phones, split "bento" panel on large screens. */
export default function AuthLayout({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left panel: graphite bento (desktop only) */}
      <div className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col lg:justify-between dark:bg-surface-800">
        <div className="blob -left-24 top-10 h-96 w-96 bg-brand-500/25" />
        <div className="blob -bottom-24 right-0 h-80 w-80 bg-violet-500/20" />
        <Brand light className="relative" />
        <div className="relative">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-zinc-300"><span className="h-2 w-2 rounded-full bg-brand-400" /> Trainer-free gym tracking</p>
          <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tight">Your AI gym<br /><span className="text-brand-400">co-pilot.</span></h2>
          <p className="mt-5 max-w-md text-lg text-zinc-400">Walk in without a trainer, walk out with a completed plan, logged sets and a coach that learns from every workout.</p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
                <f.icon className="mb-3 h-5 w-5 text-brand-400" />
                <p className="font-bold">{f.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative flex gap-8 text-sm text-zinc-400">
          <span><strong className="block text-2xl font-extrabold text-white">20+</strong>equipment guides</span>
          <span><strong className="block text-2xl font-extrabold text-white">46</strong>exercises</span>
          <span><strong className="block text-2xl font-extrabold text-white">3</strong>AI coaching scopes</span>
        </div>
      </div>

      {/* Form column */}
      <div className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:justify-center lg:py-12">
        <div className="mb-6 flex items-center justify-between lg:hidden"><Brand /><span className="chip bg-brand-500/10 text-brand-700 dark:text-brand-400">AI gym co-pilot</span></div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`mx-auto w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
          <div className="card mt-6 p-5 sm:p-7">{children}</div>
        </motion.div>
        <div className="mx-auto mt-8 flex w-full max-w-md gap-2 overflow-x-auto scrollbar-none lg:hidden">
          {FEATURES.map((f) => <span key={f.title} className="chip shrink-0 border border-zinc-200 bg-white text-zinc-600 dark:border-white/10 dark:bg-surface-800 dark:text-zinc-300"><f.icon className="h-3.5 w-3.5 text-brand-500" /> {f.title}</span>)}
        </div>
      </div>
    </div>
  );
}
