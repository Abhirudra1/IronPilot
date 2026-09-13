import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, SkipForward } from 'lucide-react';
import { useCountdown } from '@/hooks/useTimer';
import { beep } from '@/lib/sound';
import { cn } from '@/lib/utils';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Takes over the screen between sets. Full-bleed on purpose: this is the one moment in a session
 * where the phone is on a bench two feet away and the number has to be readable at a glance.
 */
export default function RestOverlay({ seconds, nextUp, onDone }: { seconds: number; nextUp: string; onDone: () => void }) {
  const timer = useCountdown(() => { beep(3, 988); onDone(); });

  useEffect(() => {
    timer.start(seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (timer.running && timer.remaining === 3) beep(1, 660); }, [timer.remaining, timer.running]);

  const pct = timer.total ? (timer.remaining / timer.total) * 100 : 0;
  const last5 = timer.remaining <= 5;

  return (
    // Opaque rather than blurred: a full-screen backdrop blur costs a GPU pass every frame on a
    // phone and, at this opacity, looks identical.
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 px-6"
      role="dialog" aria-label="Rest timer" aria-live="polite"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Rest</p>

      <div className="relative my-6 grid place-items-center">
        <svg width="260" height="260" className="-rotate-90" aria-hidden>
          <circle cx="130" cy="130" r="118" strokeWidth="10" fill="none" className="stroke-white/10" />
          <circle
            cx="130" cy="130" r="118" strokeWidth="10" fill="none" strokeLinecap="round"
            className={cn('transition-colors', last5 ? 'stroke-rose-500' : 'stroke-brand-400')}
            strokeDasharray={2 * Math.PI * 118}
            strokeDashoffset={2 * Math.PI * 118 * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 0.25s linear' }}
          />
        </svg>
        <span className={cn('absolute font-mono text-7xl font-extrabold tabular-nums text-white', last5 && 'text-rose-400')}>
          {mmss(timer.remaining)}
        </span>
      </div>

      <p className="text-center text-lg font-bold text-white">Next: {nextUp}</p>

      <div className="mt-8 flex w-full max-w-sm gap-3">
        <button onClick={() => timer.add(15)} className="flex-1 rounded-2xl border border-white/15 py-4 text-base font-bold text-white active:scale-[0.98]">
          <Plus className="mr-1 inline h-5 w-5" /> 15s
        </button>
        <button onClick={() => { timer.stop(); onDone(); }} className="flex-1 rounded-2xl bg-brand-500 py-4 text-base font-bold text-white active:scale-[0.98] dark:bg-brand-400 dark:text-zinc-950">
          Skip <SkipForward className="ml-1 inline h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}
