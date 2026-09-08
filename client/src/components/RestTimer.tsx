import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, SkipForward, TimerReset } from 'lucide-react';
import { useCountdown } from '@/hooks/useTimer';
import { beep } from '@/lib/sound';
import { ProgressRing } from '@/components/ui';
import { cn } from '@/lib/utils';

const PRESETS = [30, 60, 90, 120];

/** Rest timer with presets, custom seconds, audio + visual alerts. */
export default function RestTimer({ defaultSeconds = 60, autoStartKey, onDone, compact = false }: { defaultSeconds?: number; autoStartKey?: number; onDone?: () => void; compact?: boolean }) {
  const [custom, setCustom] = useState(String(defaultSeconds));
  const [flash, setFlash] = useState(false);
  const timer = useCountdown(() => { beep(3, 988); setFlash(true); setTimeout(() => setFlash(false), 1800); onDone?.(); });

  // auto-start when a set is completed (parent bumps the key)
  useEffect(() => { if (autoStartKey) timer.start(defaultSeconds);   }, [autoStartKey]);
  useEffect(() => { if (timer.running && timer.remaining === 3) beep(1, 660); }, [timer.remaining, timer.running]);

  const pct = timer.total ? (timer.remaining / timer.total) * 100 : 0;
  return (
    <div className={cn('card relative overflow-hidden p-4 text-center', flash && 'ring-4 ring-accent-500')} aria-live="polite">
      <AnimatePresence>{flash && <motion.div className="absolute inset-0 bg-accent-500/20" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }} />}</AnimatePresence>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rest timer</p>
      <div className="my-3 flex justify-center">
        <ProgressRing value={pct} size={compact ? 110 : 150} stroke={10} color={timer.remaining <= 5 && timer.running ? '#f43f5e' : '#84cc16'}>
          <span className={cn('font-mono font-bold tabular-nums', compact ? 'text-2xl' : 'text-4xl')}>{timer.running ? `${Math.floor(timer.remaining / 60)}:${String(timer.remaining % 60).padStart(2, '0')}` : 'Ready'}</span>
        </ProgressRing>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map((s) => <button key={s} onClick={() => timer.start(s)} className={cn('btn-secondary px-3 py-1.5', timer.total === s && timer.running && 'border-brand-500 text-brand-500')}>{s}s</button>)}
        <div className="flex items-center gap-1">
          <input type="number" min={5} max={900} value={custom} onChange={(e) => setCustom(e.target.value)} className="input w-20 py-1.5 text-center" aria-label="Custom rest seconds" />
          <button onClick={() => timer.start(Math.max(5, Number(custom) || 60))} className="btn-primary px-3 py-1.5" aria-label="Start custom timer"><TimerReset className="h-4 w-4" /></button>
        </div>
      </div>
      {timer.running && (
        <div className="mt-3 flex justify-center gap-2">
          <button onClick={() => timer.add(15)} className="btn-ghost px-3 py-1.5"><Plus className="h-4 w-4" /> 15s</button>
          <button onClick={() => { timer.stop(); onDone?.(); }} className="btn-ghost px-3 py-1.5"><SkipForward className="h-4 w-4" /> Skip</button>
        </div>
      )}
    </div>
  );
}
