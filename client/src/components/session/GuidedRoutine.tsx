import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import type { RoutineStep, SessionRoutine } from '@/types';
import { useCountdown } from '@/hooks/useTimer';
import { beep } from '@/lib/sound';
import { cn } from '@/lib/utils';
import RoutineAnimation from '@/components/session/RoutineAnimation';
import StepGuidance from '@/components/session/StepGuidance';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const detail = (s: RoutineStep) => (s.durationSeconds ? `${s.sets > 1 ? `${s.sets} × ` : ''}${s.durationSeconds}s` : `${s.sets} × ${s.reps}`);

/**
 * One step at a time, with the movement animated. Warm-ups and cool-downs are the part people
 * skip or do wrong, so this walks through them rather than handing over a checklist.
 */
export default function GuidedRoutine({ routine, phase, onToggle, onDone, doneLabel, busy }: {
  routine: SessionRoutine;
  phase: 'warmup' | 'cooldown';
  onToggle: (stepId: string, done: boolean) => void;
  onDone: () => void;
  doneLabel: string;
  busy: boolean;
}) {
  const steps = routine.steps;
  const firstUndone = Math.max(0, steps.findIndex((s) => !s.done));
  const [i, setI] = useState(firstUndone === -1 ? 0 : firstUndone);
  const [setsDone, setSetsDone] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const totalSets = Math.max(1, step?.sets || 1);

  const timer = useCountdown(() => {
    beep(2, 880);
    const n = setsDone + 1;
    setSetsDone(n);
    if (n >= totalSets) finishStep();
  });

  const cardRef = useRef<HTMLDivElement>(null);
  // Reset per-step timer state whenever the step changes, and bring the new step into view -
  // otherwise advancing from a tall step leaves the phone showing empty space below it.
  useEffect(() => {
    setSetsDone(0);
    timer.stop();
    const top = cardRef.current?.getBoundingClientRect().top;
    if (top !== undefined && (top < 120 || top > window.innerHeight * 0.5)) {
      window.scrollBy({ top: top - 140, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?._id]);

  if (!step) return null;

  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;
  const isTimed = step.durationSeconds > 0;

  function finishStep() {
    if (!step.done) onToggle(step._id, true);
    const next = steps.findIndex((s, j) => j > i && !s.done);
    if (next >= 0) setI(next);
    else if (i < steps.length - 1) setI(i + 1);
  }

  return (
    <div className="space-y-4">
      {/* Progress across the whole routine */}
      <div className="flex items-center gap-2">
        {steps.map((s, j) => (
          <button
            key={s._id} onClick={() => setI(j)} aria-label={`Go to step ${j + 1}: ${s.name}`} aria-current={j === i}
            className={cn('h-2 flex-1 rounded-full transition-colors', s.done ? 'bg-emerald-500' : j === i ? (phase === 'warmup' ? 'bg-amber-500' : 'bg-sky-500') : 'bg-zinc-200 dark:bg-white/10')}
          />
        ))}
        <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">{done}/{steps.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div ref={cardRef} key={step._id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} className="card overflow-hidden p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Step {i + 1} of {steps.length} · {phase === 'warmup' ? 'Warm-up' : 'Cool-down'}
          </p>
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <h2 className={cn('text-2xl font-extrabold leading-tight', step.done && 'text-zinc-400 line-through')}>{step.name}</h2>
            {step.done && <span className="chip shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> done</span>}
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-500">{detail(step)}{totalSets > 1 && isTimed ? ` · set ${Math.min(setsDone + 1, totalSets)} of ${totalSets}` : ''}</p>

          {/* The movement itself */}
          <RoutineAnimation name={step.name} className="mt-4" />

          <div className="mt-4"><StepGuidance step={step} /></div>

          {/* Action: hold the clock, or tick the reps off */}
          {isTimed ? (
            <div className="mt-5">
              {timer.running ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-mono text-5xl font-extrabold tabular-nums">{mmss(timer.remaining)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                      <div className={cn('h-full rounded-full', phase === 'warmup' ? 'bg-amber-500' : 'bg-sky-500')} style={{ width: `${timer.total ? (timer.remaining / timer.total) * 100 : 0}%`, transition: 'width 0.25s linear' }} />
                    </div>
                  </div>
                  <button onClick={timer.stop} className="btn-secondary h-14 px-4" aria-label="Pause hold"><Pause className="h-5 w-5" /></button>
                </div>
              ) : (
                <button
                  onClick={() => timer.start(step.durationSeconds)}
                  className={cn('w-full rounded-2xl py-5 text-lg font-extrabold text-white active:scale-[0.98]', phase === 'warmup' ? 'bg-amber-500' : 'bg-sky-500')}
                >
                  <Play className="mr-2 inline h-6 w-6" fill="currentColor" />
                  {setsDone > 0 ? `Start set ${setsDone + 1} of ${totalSets}` : `Start ${step.durationSeconds}s`}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={finishStep}
              disabled={busy}
              className="mt-5 w-full rounded-2xl bg-brand-500 py-5 text-lg font-extrabold text-white active:scale-[0.98] disabled:opacity-50 dark:bg-brand-400 dark:text-zinc-950"
            >
              <Check className="mr-2 inline h-6 w-6" strokeWidth={3} /> Done — next step
            </button>
          )}

          {/* Step-to-step navigation */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button className="btn-ghost h-11" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><ChevronLeft className="h-4 w-4" /> Back</button>
            {step.done
              ? <button className="btn-ghost h-11 text-zinc-500" onClick={() => onToggle(step._id, false)}><RotateCcw className="h-4 w-4" /> Undo</button>
              : <button className="btn-ghost h-11 text-amber-600" onClick={() => { const n = steps.findIndex((s, j) => j > i && !s.done); setI(n >= 0 ? n : Math.min(i + 1, steps.length - 1)); }}><SkipForward className="h-4 w-4" /> Skip this</button>}
            <button className="btn-ghost h-11" onClick={() => setI(Math.min(steps.length - 1, i + 1))} disabled={i >= steps.length - 1}>Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </motion.div>
      </AnimatePresence>

      <button className={cn('w-full py-4 text-base', allDone ? 'btn-primary' : 'btn-secondary')} onClick={onDone}>
        {allDone ? <Check className="h-5 w-5" /> : <Timer className="h-5 w-5" />} {doneLabel}
      </button>
    </div>
  );
}
