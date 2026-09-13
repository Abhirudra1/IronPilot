import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, CheckCircle2, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutSession, SessionExercise } from '@/types';
import { cn } from '@/lib/utils';

/** Big stepper: the number is the hit target, +/- are thumb-sized for mid-set use. */
function Stepper({ label, value, onChange, step, id }: { label: string; value: string; onChange: (v: string) => void; step: number; id: string }) {
  const bump = (d: number) => onChange(String(Math.max(0, Math.round((Number(value) + d) * 100) / 100)));
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</label>
      <div className="flex items-stretch gap-1.5">
        <button onClick={() => bump(-step)} className="grid w-12 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white active:scale-95 dark:border-white/10 dark:bg-surface-700" aria-label={`Decrease ${label}`}>
          <Minus className="h-5 w-5" />
        </button>
        <input
          id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white text-center font-mono text-3xl font-extrabold tabular-nums text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-white/10 dark:bg-surface-700 dark:text-white"
        />
        <button onClick={() => bump(step)} className="grid w-12 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white active:scale-95 dark:border-white/10 dark:bg-surface-700" aria-label={`Increase ${label}`}>
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function StrengthPanel({ session, exercise, onUpdate, onDone, onSetLogged, paused }: {
  session: WorkoutSession; exercise: SessionExercise; onUpdate: (s: WorkoutSession) => void; onDone: () => void; onSetLogged: (nextSetNumber: number) => void; paused: boolean;
}) {
  const target = exercise.targetSets || 3;
  const completed = exercise.sets.filter((s) => s.completed).length;
  const nextSet = Math.min(completed + 1, target + 5);
  const last = exercise.sets[exercise.sets.length - 1];
  const [reps, setReps] = useState(String(last?.reps ?? exercise.targetReps ?? 10));
  const [weight, setWeight] = useState(String(last?.weight ?? exercise.targetWeight ?? 0));
  useEffect(() => {
    setReps(String(last?.reps ?? exercise.targetReps ?? 10));
    setWeight(String(last?.weight ?? exercise.targetWeight ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise._id]);

  const logSet = useMutation({
    mutationFn: (setNumber: number) => api.post(`/sessions/${session._id}/exercises/${exercise._id}/sets`, { setNumber, reps: Number(reps), weight: Number(weight) }),
    onSuccess: (r, setNumber) => { onUpdate(r.data.item); if (setNumber < target) onSetLogged(setNumber + 1); else toast.success('Last set done 💪'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const allDone = completed >= target;
  return (
    <div className="space-y-4">
      {/* Set pips - the whole exercise at a glance */}
      <div className="flex items-center gap-2">
        {Array.from({ length: Math.max(target, completed) }).map((_, i) => (
          <div key={i} className={cn('h-2.5 flex-1 rounded-full transition-colors', i < completed ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-white/10')} />
        ))}
        <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-500">{completed}/{target}</span>
      </div>

      {!allDone ? (
        <>
          <p className="text-center text-lg font-bold">Set {nextSet} of {target}</p>
          <div className="flex gap-3">
            <Stepper id="reps" label="reps" value={reps} onChange={setReps} step={1} />
            <Stepper id="weight" label="kg" value={weight} onChange={setWeight} step={2.5} />
          </div>
          <button
            className="w-full rounded-2xl bg-brand-500 py-6 text-xl font-extrabold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-50 dark:bg-brand-400 dark:text-zinc-950"
            disabled={paused || logSet.isPending}
            onClick={() => logSet.mutate(nextSet)}
          >
            <Check className="mr-2 inline h-7 w-7" strokeWidth={3} /> {logSet.isPending ? 'Saving…' : `Complete set ${nextSet}`}
          </button>
        </>
      ) : (
        <>
          {exercise.status !== 'completed' ? (
            <button className="w-full rounded-2xl bg-zinc-900 py-6 text-xl font-extrabold text-white active:scale-[0.98] dark:bg-white dark:text-zinc-900" onClick={onDone}>
              <CheckCircle2 className="mr-2 inline h-7 w-7" /> Next exercise
            </button>
          ) : (
            <p className="rounded-2xl bg-emerald-500/10 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
              Exercise complete · {exercise.caloriesBurned} kcal
            </p>
          )}
          <button className="btn-secondary w-full" onClick={() => logSet.mutate(nextSet)} disabled={logSet.isPending}>
            <Plus className="h-4 w-4" /> Add an extra set
          </button>
        </>
      )}

      {completed > 0 && (
        <ul className="space-y-1 text-sm">
          {exercise.sets.filter((s) => s.completed).map((s) => (
            <li key={s.setNumber} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 dark:bg-white/5">
              <span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Set {s.setNumber}</span>
              <span className="font-mono tabular-nums">{s.reps} × {s.weight} kg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
