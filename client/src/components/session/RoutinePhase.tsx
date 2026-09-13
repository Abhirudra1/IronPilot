import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronDown, Info, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { RoutinePhase as Phase, RoutineStep, SessionRoutine, WorkoutSession } from '@/types';
import { useCountdown } from '@/hooks/useTimer';
import { beep } from '@/lib/sound';
import { cn } from '@/lib/utils';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const detail = (s: RoutineStep) => (s.durationSeconds ? `${s.sets > 1 ? `${s.sets} × ` : ''}${s.durationSeconds}s` : `${s.sets} × ${s.reps}`);

/** A single step: tick it off, or run its clock if it is a timed hold. */
function Step({ step, onToggle, busy }: { step: RoutineStep; onToggle: (done: boolean) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const timer = useCountdown(() => { beep(2, 880); toast.success(`${step.name} done`); onToggle(true); });

  return (
    <li className={cn('rounded-2xl border transition', step.done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-surface-800')}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => onToggle(!step.done)}
          disabled={busy}
          aria-pressed={step.done}
          aria-label={step.done ? `Mark ${step.name} not done` : `Mark ${step.name} done`}
          className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition active:scale-95',
            step.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 text-transparent hover:border-brand-500 dark:border-white/20')}
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </button>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <p className={cn('truncate font-bold', step.done && 'text-zinc-400 line-through')}>{step.name}</p>
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            {detail(step)} {step.how && <><span aria-hidden>·</span> <Info className="h-3 w-3" /> how &amp; why</>}
          </p>
        </button>
        {step.durationSeconds > 0 && !step.done && (
          timer.running
            ? <button onClick={timer.stop} className="btn-secondary h-11 shrink-0 px-3 font-mono tabular-nums" aria-label="Stop timer"><Timer className="h-4 w-4 text-brand-500" /> {mmss(timer.remaining)}</button>
            : <button onClick={() => timer.start(step.durationSeconds)} className="btn-secondary h-11 w-11 shrink-0 p-0" aria-label={`Start ${step.durationSeconds} second timer`}><Play className="h-4 w-4" /></button>
        )}
        <button onClick={() => setOpen((o) => !o)} className="btn-ghost h-11 w-9 shrink-0 p-0" aria-label={open ? 'Hide guidance' : 'Show guidance'}>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (step.how || step.why) && (
        <div className="space-y-1.5 border-t border-zinc-100 px-3 py-2.5 text-sm dark:border-white/[0.06]">
          {step.how && <p><span className="font-bold text-brand-600 dark:text-brand-400">How:</span> {step.how}</p>}
          {step.why && <p className="text-zinc-600 dark:text-zinc-300"><span className="font-bold">Why:</span> {step.why}</p>}
        </div>
      )}
    </li>
  );
}

export default function RoutinePhase({ session, phase, routine, onUpdate, onDone, doneLabel }: {
  session: WorkoutSession; phase: Phase; routine: SessionRoutine; onUpdate: (s: WorkoutSession) => void; onDone: () => void; doneLabel: string;
}) {
  const toggle = useMutation({
    mutationFn: ({ stepId, done }: { stepId: string; done: boolean }) => api.patch(`/sessions/${session._id}/routine/${phase}/steps/${stepId}`, { done }),
    onSuccess: (r) => onUpdate(r.data.item),
    onError: (e) => toast.error(errMsg(e)),
  });
  const skip = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/routine/${phase}/skip`, { skipped: true }),
    onSuccess: (r) => { onUpdate(r.data.item); onDone(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const done = routine.steps.filter((s) => s.done).length;
  const all = done === routine.steps.length;
  const mins = Math.max(1, Math.round(routine.totalSeconds / 60));

  return (
    <div className="space-y-4">
      <div className={cn('card p-4 sm:p-5', phase === 'warmup' ? 'border-amber-500/30 bg-amber-500/5' : 'border-sky-500/30 bg-sky-500/5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold">{routine.title}</h2>
            <p className="text-sm text-zinc-500">about {mins} min · {done}/{routine.steps.length} done</p>
          </div>
          <span className={cn('chip shrink-0', phase === 'warmup' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-sky-500/15 text-sky-700 dark:text-sky-300')}>
            {phase === 'warmup' ? 'Before you lift' : 'After you lift'}
          </span>
        </div>
        {routine.when && <p className="mt-3 flex gap-2 text-sm"><Timer className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" /> {routine.when}</p>}
        {routine.why && <p className="mt-1.5 flex gap-2 text-sm text-zinc-600 dark:text-zinc-300"><Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" /> {routine.why}</p>}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
          <div className={cn('h-full rounded-full transition-all', phase === 'warmup' ? 'bg-amber-500' : 'bg-sky-500')} style={{ width: `${(done / Math.max(1, routine.steps.length)) * 100}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {routine.steps.map((s) => (
          <Step key={s._id} step={s} busy={toggle.isPending} onToggle={(d) => toggle.mutate({ stepId: s._id, done: d })} />
        ))}
      </ul>

      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => skip.mutate()} disabled={skip.isPending}>
          <SkipForward className="h-4 w-4" /> Skip {phase === 'warmup' ? 'warm-up' : 'cool-down'}
        </button>
        <button className={cn('flex-1 py-4 text-base', all ? 'btn-primary' : 'btn-secondary')} onClick={onDone}>
          {all ? <Check className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />} {doneLabel}
        </button>
      </div>
    </div>
  );
}
