import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Pause, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutSession, SessionExercise } from '@/types';
import { ProgressRing, Input } from '@/components/ui';
import { useStopwatch } from '@/hooks/useTimer';
import { beep } from '@/lib/sound';
import { fmtDuration } from '@/lib/utils';

export default function CardioPanel({ session, exercise, onUpdate, onDone, paused }: { session: WorkoutSession; exercise: SessionExercise; onUpdate: (s: WorkoutSession) => void; onDone: () => void; paused: boolean }) {
  const targetSec = (exercise.targetDuration || 15) * 60;
  const watch = useStopwatch(false);
  const [km, setKm] = useState('');
  const [alerted, setAlerted] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  useEffect(() => { if (paused) watch.pause();   }, [paused]);
  useEffect(() => { if (watch.elapsed >= targetSec && !alerted && watch.running) { beep(3, 988); setAlerted(true); toast.success('Target duration reached! 🎉'); } }, [watch.elapsed, targetSec, alerted, watch.running]);
  useEffect(() => { watch.reset(); setAlerted(false); setStartedAt(null);   }, [exercise._id]);

  const remaining = Math.max(0, targetSec - watch.elapsed);
  const pct = Math.min(100, (watch.elapsed / targetSec) * 100);
  const speed = km && watch.elapsed > 0 ? (Number(km) / (watch.elapsed / 3600)).toFixed(1) : null;

  const finish = useMutation({
    mutationFn: () => api.post(`/sessions/${session._id}/exercises/${exercise._id}/cardio`, { durationSeconds: Math.max(1, watch.elapsed), distanceKm: km ? Number(km) : undefined, speedKmh: speed ? Number(speed) : undefined }),
    onSuccess: (r) => { onUpdate(r.data.item); watch.pause(); toast.success(`Cardio logged · ${r.data.exercise.caloriesBurned} kcal`); onDone(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="card p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col items-center">
          <ProgressRing value={pct} size={190} stroke={12} color={watch.elapsed >= targetSec ? '#84cc16' : '#0ea5e9'}>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Elapsed</p>
              <p className="font-mono text-4xl font-extrabold tabular-nums">{fmtDuration(watch.elapsed)}</p>
              <p className="text-xs text-slate-500">Remaining {fmtDuration(remaining)}</p>
            </div>
          </ProgressRing>
          <div className="mt-4 flex gap-2">
            {!watch.running ? <button className="btn-primary" disabled={paused} onClick={() => { if (!startedAt) setStartedAt(new Date()); watch.start(); }}><Play className="h-4 w-4" /> {watch.elapsed ? 'Resume' : 'Start cardio timer'}</button> : <button className="btn-secondary" onClick={watch.pause}><Pause className="h-4 w-4" /> Pause</button>}
            <button className="btn-ghost" onClick={() => { watch.pause(); watch.reset(); setAlerted(false); setStartedAt(null); }} aria-label="Reset"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-xs text-slate-500">Start time</p><p className="font-semibold">{startedAt ? startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p></div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-xs text-slate-500">Target</p><p className="font-semibold">{exercise.targetDuration} min</p></div>
          </div>
          <Input label="Distance (km, optional)" type="number" step="0.1" min={0} value={km} onChange={(e) => setKm(e.target.value)} />
          {speed && <p className="text-sm text-slate-500">Average speed ≈ <span className="font-semibold">{speed} km/h</span></p>}
          <button className="btn-accent w-full py-3" disabled={watch.elapsed < 5 || finish.isPending} onClick={() => finish.mutate()}><CheckCircle2 className="h-5 w-5" /> Finish cardio & log</button>
          {exercise.status === 'completed' && <p className="text-center text-xs text-emerald-500">Logged {fmtDuration(exercise.durationSeconds || 0)} · {exercise.caloriesBurned} kcal{exercise.distanceKm ? ` · ${exercise.distanceKm} km` : ''}</p>}
        </div>
      </div>
    </div>
  );
}
