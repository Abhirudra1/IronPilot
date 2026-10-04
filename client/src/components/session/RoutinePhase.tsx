import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronDown, Info, ListChecks, Play, RotateCcw, SkipForward, Timer, Footprints } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { RoutinePhase as Phase, RoutineStep, SessionRoutine, WorkoutSession } from '@/types';
import { useCountdown } from '@/hooks/useTimer';
import { beep } from '@/lib/sound';
import { cn } from '@/lib/utils';
import GuidedRoutine from '@/components/session/GuidedRoutine';
import RoutineAnimation from '@/components/session/RoutineAnimation';
import StepGuidance from '@/components/session/StepGuidance';

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
            {detail(step)} <span aria-hidden>·</span> <Info className="h-3 w-3" /> {open ? 'hide' : 'show'} form guide
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
      {open && (
        <div className="space-y-3 border-t border-zinc-100 px-3 py-3 dark:border-white/[0.06]">
          <RoutineAnimation name={step.name} />
          <StepGuidance step={step} />
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
  const [view, setView] = useState<'guided' | 'list'>('guided');

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
      </div>

      {/* Guided is the default: these are the movements people most often do wrong. */}
      <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Routine view">
        {([['guided', 'Step by step', Footprints], ['list', 'Overview', ListChecks]] as const).map(([id, text, Icon]) => (
          <button
            key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
            className={cn('flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition',
              view === id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300')}
          >
            <Icon className="h-4 w-4" /> {text}
          </button>
        ))}
      </div>

      {view === 'guided' ? (
        <GuidedRoutine
          routine={routine} phase={phase} busy={toggle.isPending} doneLabel={doneLabel} onDone={onDone}
          onToggle={(stepId, d) => toggle.mutate({ stepId, done: d })}
        />
      ) : (
        <>
          <ul className="space-y-2">
            {routine.steps.map((s) => (
              <Step key={s._id} step={s} busy={toggle.isPending} onToggle={(d) => toggle.mutate({ stepId: s._id, done: d })} />
            ))}
          </ul>
          <button className={cn('w-full py-4 text-base', all ? 'btn-primary' : 'btn-secondary')} onClick={onDone}>
            {all ? <Check className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />} {doneLabel}
          </button>
        </>
      )}

      <button className="btn-ghost w-full" onClick={() => skip.mutate()} disabled={skip.isPending}>
        <SkipForward className="h-4 w-4" /> Skip {phase === 'warmup' ? 'warm-up' : 'cool-down'}
      </button>
    </div>
  );
}
