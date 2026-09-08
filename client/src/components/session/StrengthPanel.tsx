import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutSession, SessionExercise } from '@/types';
import RestTimer from '@/components/RestTimer';
import { cn } from '@/lib/utils';

export default function StrengthPanel({ session, exercise, onUpdate, onDone, paused }: { session: WorkoutSession; exercise: SessionExercise; onUpdate: (s: WorkoutSession) => void; onDone: () => void; paused: boolean }) {
  const target = exercise.targetSets || 3;
  const completed = exercise.sets.filter((s) => s.completed).length;
  const nextSet = Math.min(completed + 1, target + 5);
  const last = exercise.sets[exercise.sets.length - 1];
  const [reps, setReps] = useState(String(last?.reps ?? exercise.targetReps ?? 10));
  const [weight, setWeight] = useState(String(last?.weight ?? exercise.targetWeight ?? 0));
  const [restKey, setRestKey] = useState(0);
  useEffect(() => { setReps(String(last?.reps ?? exercise.targetReps ?? 10)); setWeight(String(last?.weight ?? exercise.targetWeight ?? 0));   }, [exercise._id]);

  const logSet = useMutation({
    mutationFn: (setNumber: number) => api.post(`/sessions/${session._id}/exercises/${exercise._id}/sets`, { setNumber, reps: Number(reps), weight: Number(weight) }),
    onSuccess: (r, setNumber) => { onUpdate(r.data.item); toast.success(`Set ${setNumber} complete ✅`); if (setNumber < target) setRestKey((k) => k + 1); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const allDone = completed >= target;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sets</p>
          <p className="text-sm font-bold">{completed}/{target} completed</p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: Math.max(target, completed) }).map((_, i) => <div key={i} className={cn('h-2 flex-1 rounded-full', i < completed ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10')} />)}
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {exercise.sets.filter((s) => s.completed).map((s) => <li key={s.setNumber} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-white/5"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Set {s.setNumber}</span><span className="font-mono">{s.reps} reps × {s.weight} kg</span></li>)}
        </ul>
        {!allDone && (
          <div className="mt-4 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
            <p className="text-sm font-bold">Current set: {nextSet}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><label className="label" htmlFor="reps">Reps</label><div className="flex"><button className="btn-secondary rounded-r-none px-3" onClick={() => setReps(String(Math.max(0, Number(reps) - 1)))} aria-label="Fewer reps">−</button><input id="reps" type="number" className="input rounded-none text-center" value={reps} onChange={(e) => setReps(e.target.value)} /><button className="btn-secondary rounded-l-none px-3" onClick={() => setReps(String(Number(reps) + 1))} aria-label="More reps">+</button></div></div>
              <div><label className="label" htmlFor="weight">Weight (kg)</label><div className="flex"><button className="btn-secondary rounded-r-none px-3" onClick={() => setWeight(String(Math.max(0, Number(weight) - 2.5)))} aria-label="Less weight">−</button><input id="weight" type="number" step="0.5" className="input rounded-none text-center" value={weight} onChange={(e) => setWeight(e.target.value)} /><button className="btn-secondary rounded-l-none px-3" onClick={() => setWeight(String(Number(weight) + 2.5))} aria-label="More weight">+</button></div></div>
            </div>
            <button className="btn-primary mt-3 w-full py-3" disabled={paused || logSet.isPending} onClick={() => logSet.mutate(nextSet)}><Check className="h-5 w-5" /> Complete set {nextSet}</button>
          </div>
        )}
        {allDone && exercise.status !== 'completed' && <button className="btn-accent mt-4 w-full py-3" onClick={onDone}><CheckCircle2 className="h-5 w-5" /> All sets done - next exercise</button>}
        {allDone && exercise.status === 'completed' && <button className="btn-secondary mt-4 w-full" onClick={() => logSet.mutate(nextSet)}>Add extra set</button>}
        {exercise.status === 'completed' && <p className="mt-2 text-center text-xs text-emerald-500">Exercise completed · {exercise.caloriesBurned} kcal</p>}
      </div>
      <RestTimer defaultSeconds={exercise.restSeconds} autoStartKey={restKey} compact />
    </div>
  );
}
