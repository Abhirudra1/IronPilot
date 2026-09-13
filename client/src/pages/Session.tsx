import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Pause, Play, Plus, SkipForward, Flame, Timer, BookOpen, ListChecks, X, Trash2, Undo2, Sparkles, Eye, Snowflake } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutSession, Exercise, Equipment } from '@/types';
import { Modal, Select, Confirm, Badge } from '@/components/ui';
import { SessionPageSkeleton } from '@/components/ui/Skeleton';
import { useStopwatch } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { unlockAudio } from '@/lib/sound';
import { fmtDuration, label, cn } from '@/lib/utils';
import StartScreen from '@/components/session/StartScreen';
import StrengthPanel from '@/components/session/StrengthPanel';
import CardioPanel from '@/components/session/CardioPanel';
import GuidedMode from '@/components/session/GuidedMode';
import RoutinePhase from '@/components/session/RoutinePhase';
import RestOverlay from '@/components/session/RestOverlay';
import { useAuth } from '@/context/AuthContext';

type Phase = 'warmup' | 'main' | 'cooldown';

export default function Session() {
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const planId = (loc.state as { planId?: string } | null)?.planId;

  const active = useQuery({ queryKey: ['session', 'active'], queryFn: async () => (await api.get('/sessions/active')).data.item as WorkoutSession | null });
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('main');
  const [rest, setRest] = useState<{ seconds: number; nextUp: string } | null>(null);
  const [guided, setGuided] = useState(user?.experienceLevel === 'beginner');
  const [showList, setShowList] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addId, setAddId] = useState('');
  const [finishOpen, setFinishOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [rating, setRating] = useState(0);

  const session = active.data;
  const paused = session?.status === 'paused';
  const watch = useStopwatch(!!session && !paused, session?.startedAt);
  // Keep the screen on for the whole session, not just while a timer runs: the phone is on a bench
  // and every lock costs an unlock mid-set. Released automatically when paused or the page unmounts.
  const wake = useWakeLock(!!session && !paused);

  useEffect(() => {
    if (session && !paused) watch.start(); else watch.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id, paused]);
  useEffect(() => {
    if (!session) return;
    setIdx(Math.min(session.currentExerciseIndex, Math.max(0, session.exercises.length - 1)));
    const w = session.warmup;
    setPhase(w && w.steps.length && !w.skipped && !w.completedAt ? 'warmup' : 'main');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id]);

  const setSession = (s: WorkoutSession) => qc.setQueryData(['session', 'active'], s);
  const invalidateAll = () => { qc.invalidateQueries({ queryKey: ['session'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['history'] }); qc.invalidateQueries({ queryKey: ['ai-rec'] }); };

  const start = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/sessions/start', body),
    onSuccess: (r) => { unlockAudio(); setSession(r.data.item); if (r.data.resumed) toast('Resumed your active session', { icon: '▶️' }); else toast.success('Session started. Warm up first 🔥'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const status = useMutation({ mutationFn: (s: 'active' | 'paused' | 'abandoned') => api.patch(`/sessions/${session!._id}/status`, { status: s }), onSuccess: (r, s) => { if (s === 'abandoned') { qc.setQueryData(['session', 'active'], null); invalidateAll(); nav('/'); } else setSession(r.data.item); }, onError: (e) => toast.error(errMsg(e)) });
  const complete = useMutation({ mutationFn: ({ exerciseId, skip }: { exerciseId: string; skip?: boolean }) => api.post(`/sessions/${session!._id}/exercises/${exerciseId}/complete`, { skip }), onSuccess: (r) => { setSession(r.data.item); goNext(); }, onError: (e) => toast.error(errMsg(e)) });
  const discard = useMutation({ mutationFn: () => api.delete(`/sessions/${session!._id}`), onSuccess: () => { qc.setQueryData(['session', 'active'], null); invalidateAll(); toast.success('Session discarded'); nav('/'); }, onError: (e) => toast.error(errMsg(e)) });
  const removeExercise = useMutation({ mutationFn: (exerciseId: string) => api.delete(`/sessions/${session!._id}/exercises/${exerciseId}`), onSuccess: (r) => { setSession(r.data.item); setIdx((i) => Math.min(i, Math.max(0, r.data.item.exercises.length - 1))); toast.success('Exercise removed'); }, onError: (e) => toast.error(errMsg(e)) });
  const undoSet = useMutation({ mutationFn: (exerciseId: string) => api.delete(`/sessions/${session!._id}/exercises/${exerciseId}/sets/last`), onSuccess: (r) => { setSession(r.data.item); toast.success('Last set removed'); }, onError: (e) => toast.error(errMsg(e)) });
  const addExercise = useMutation({ mutationFn: () => api.post(`/sessions/${session!._id}/exercises`, { exerciseId: addId }), onSuccess: (r) => { setSession(r.data.item); setAddOpen(false); toast.success('Exercise added'); }, onError: (e) => toast.error(errMsg(e)) });
  const finish = useMutation({ mutationFn: (withSummary: boolean) => api.post(`/sessions/${session!._id}/finish`, { rating: rating || undefined, durationSeconds: watch.elapsed, withSummary }), onSuccess: (r) => { qc.setQueryData(['session', 'active'], null); invalidateAll(); nav(`/session/${r.data.item._id}/summary`, { state: { newAchievements: r.data.newAchievements } }); }, onError: (e) => toast.error(errMsg(e)) });

  const exercises = useQuery({ queryKey: ['exercises'], queryFn: async () => (await api.get('/library/exercises')).data.items as Exercise[], staleTime: 10 * 60_000, enabled: !!session });
  const equipmentList = useQuery({ queryKey: ['equipment'], queryFn: async () => (await api.get('/library/equipment')).data.items as Equipment[], staleTime: 10 * 60_000, enabled: !!session });

  const current = session?.exercises[idx];
  const currentEquipment = useMemo(() => equipmentList.data?.find((e) => e._id === current?.equipment), [equipmentList.data, current?.equipment]);
  const currentExercise = useMemo(() => exercises.data?.find((e) => e._id === current?.exercise), [exercises.data, current?.exercise]);
  const doneCount = session?.exercises.filter((e) => e.status === 'completed' || e.status === 'skipped').length || 0;
  const goNext = () => setIdx((i) => { const next = session ? session.exercises.findIndex((e, j) => j > i && e.status !== 'completed' && e.status !== 'skipped') : -1; return next >= 0 ? next : Math.min(i + 1, (session?.exercises.length || 1) - 1); });

  if (active.isLoading) return <SessionPageSkeleton />;
  if (!session) return <StartScreen planId={planId} onStart={(body) => start.mutate(body)} starting={start.isPending} />;

  const total = session.exercises.length;
  const pct = (doneCount / Math.max(1, total)) * 100;
  const allExercisesDone = total > 0 && doneCount >= total;
  const PHASES: { id: Phase; label: string; icon: typeof Flame }[] = [
    { id: 'warmup', label: 'Warm-up', icon: Flame },
    { id: 'main', label: 'Workout', icon: Timer },
    { id: 'cooldown', label: 'Cool-down', icon: Snowflake },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* Sticky status bar: focus, clock, progress - everything you need at a glance mid-set */}
      <div className="card sticky top-[4.5rem] z-20 mb-3 p-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{session.focus || session.planName}</p>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Flame className="h-3.5 w-3.5 text-orange-500" />{session.totalCalories} kcal
              {wake.held && <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400"><Eye className="h-3.5 w-3.5" /> screen stays on</span>}
            </p>
          </div>
          <p className="font-mono text-2xl font-extrabold tabular-nums">{fmtDuration(watch.elapsed)}</p>
          <button onClick={() => status.mutate(paused ? 'active' : 'paused')} className="btn-secondary h-11 w-11 shrink-0 p-0" aria-label={paused ? 'Resume session' : 'Pause session'}>
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
            <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">{doneCount}/{total}</span>
        </div>
      </div>

      {/* Phase rail */}
      <div className="mb-4 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Session phase">
        {PHASES.map((p) => {
          const disabled = (p.id === 'warmup' && !session.warmup?.steps.length) || (p.id === 'cooldown' && !session.cooldown?.steps.length);
          const done = p.id === 'warmup' ? !!session.warmup?.completedAt || !!session.warmup?.skipped : p.id === 'cooldown' ? !!session.cooldown?.completedAt : allExercisesDone;
          return (
            <button
              key={p.id} role="tab" aria-selected={phase === p.id} disabled={disabled} onClick={() => setPhase(p.id)}
              className={cn('flex min-h-11 items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition disabled:opacity-40 sm:gap-1.5 sm:px-2 sm:text-sm',
                phase === p.id ? 'bg-zinc-900 text-white dark:bg-brand-400 dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300')}
            >
              <p.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{p.label}</span>
              {done && phase !== p.id && <span className="text-emerald-500">✓</span>}
            </button>
          );
        })}
      </div>

      {paused && <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-center text-sm font-semibold text-amber-600">Session paused — the timer is stopped and the screen can sleep. Tap play to resume.</div>}

      {phase === 'warmup' && session.warmup && (
        <RoutinePhase session={session} phase="warmup" routine={session.warmup} onUpdate={setSession} onDone={() => setPhase('main')} doneLabel="Start the workout" />
      )}

      {phase === 'cooldown' && session.cooldown && (
        <RoutinePhase session={session} phase="cooldown" routine={session.cooldown} onUpdate={setSession} onDone={() => setFinishOpen(true)} doneLabel="Finish session" />
      )}

      {phase === 'main' && (!current ? (
        <div className="card p-8 text-center">
          <p className="text-lg font-bold">No exercises in this session</p>
          <p className="mt-1 text-sm text-zinc-500">Add exercises from the library to get going, or finish the session.</p>
          <button className="btn-primary mt-4" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add exercise</button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={current._id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="card p-5">
              {/* The one thing you look at between sets */}
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Exercise {idx + 1} of {total}</p>
              <h2 className="mt-0.5 text-3xl font-extrabold leading-tight">{current.exerciseName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {current.equipmentName && <Badge color="slate">{current.equipmentName}</Badge>}
                {current.muscleGroup && <Badge color="brand">{label(current.muscleGroup)}</Badge>}
                <span className="text-sm text-zinc-500">
                  target {current.type === 'cardio' ? `${current.targetDuration} min` : `${current.targetSets}×${current.targetReps}${current.targetWeight ? ` @ ${current.targetWeight} kg` : ''}`} · rest {current.restSeconds}s
                </span>
              </div>

              <div className="mt-5">
                {current.type === 'cardio' ? (
                  <CardioPanel session={session} exercise={current} onUpdate={setSession} onDone={goNext} paused={paused} />
                ) : (
                  <StrengthPanel
                    session={session} exercise={current} onUpdate={setSession} paused={paused}
                    onDone={() => complete.mutate({ exerciseId: current._id })}
                    onSetLogged={(n) => setRest({ seconds: current.restSeconds, nextUp: `${current.exerciseName} · set ${n}` })}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button className="btn-secondary h-12" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} aria-label="Previous exercise"><ChevronLeft className="h-5 w-5" /> Prev</button>
              <div className="flex gap-1">
                {current.type !== 'cardio' && current.sets.length > 0 && <button className="btn-ghost h-12" onClick={() => undoSet.mutate(current._id)} disabled={undoSet.isPending}><Undo2 className="h-4 w-4" /> Undo</button>}
                <button className="btn-ghost h-12 text-amber-600" onClick={() => complete.mutate({ exerciseId: current._id, skip: true })} disabled={current.status === 'completed'}><SkipForward className="h-4 w-4" /> Skip</button>
              </div>
              <button className="btn-secondary h-12" onClick={() => setIdx(Math.min(total - 1, idx + 1))} disabled={idx >= total - 1} aria-label="Next exercise">Next <ChevronRight className="h-5 w-5" /></button>
            </div>

            {allExercisesDone && session.cooldown?.steps.length ? (
              <button className="btn-primary w-full py-4 text-base" onClick={() => setPhase('cooldown')}>
                <Snowflake className="h-5 w-5" /> All done — cool down now
              </button>
            ) : null}

            <button onClick={() => setGuided((g) => !g)} aria-pressed={guided} className={cn('btn-secondary w-full', guided && 'border-brand-500 text-brand-500')}>
              <BookOpen className="h-4 w-4" /> {guided ? 'Hide' : 'Show'} form guidance
            </button>
            {guided && <GuidedMode equipment={currentEquipment} exercise={currentExercise} />}
          </motion.div>
        </AnimatePresence>
      ))}

      {/* Compact action bar - secondary controls stay out of the way until needed */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-white/[0.06] dark:bg-surface-800/95 lg:bottom-0" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-2xl gap-2">
          <button onClick={() => setShowList(true)} className="btn-ghost flex-1"><ListChecks className="h-4 w-4" /> List</button>
          <button onClick={() => setAddOpen(true)} className="btn-ghost flex-1"><Plus className="h-4 w-4" /> Add</button>
          <button onClick={() => (session.cooldown?.steps.length && phase !== 'cooldown' ? setPhase('cooldown') : setFinishOpen(true))} className="btn-accent flex-1"><Flag className="h-4 w-4" /> Finish</button>
        </div>
      </div>

      <AnimatePresence>
        {rest && <RestOverlay seconds={rest.seconds} nextUp={rest.nextUp} onDone={() => setRest(null)} />}
      </AnimatePresence>

      {/* Exercise list drawer */}
      <Modal open={showList} onClose={() => setShowList(false)} title="Session exercises">
        <ul className="space-y-1">
          {session.exercises.map((e, i) => (
            <li key={e._id} className="flex items-center gap-1">
              <button onClick={() => { setIdx(i); setPhase('main'); setShowList(false); }} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-white/5', i === idx && 'bg-brand-500/10')}>
                <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', e.status === 'completed' ? 'bg-emerald-500 text-white' : e.status === 'skipped' ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-white/10')}>{e.status === 'completed' ? '✓' : i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{e.exerciseName}</p><p className="text-xs text-zinc-500">{e.type === 'cardio' ? `${e.targetDuration} min` : `${e.sets.filter((s) => s.completed).length}/${e.targetSets} sets`}</p></div>
              </button>
              <button className="btn-ghost h-9 w-9 shrink-0 p-0 text-rose-500" onClick={() => removeExercise.mutate(e._id)} aria-label={`Remove ${e.exerciseName}`} disabled={removeExercise.isPending}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2"><button className="btn-secondary" onClick={() => { setShowList(false); setAbandonOpen(true); }}><X className="h-4 w-4" /> Abandon (keep)</button><button className="btn-danger" onClick={() => { setShowList(false); setDiscardOpen(true); }}><Trash2 className="h-4 w-4" /> Delete session</button></div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add exercise to session" size="sm">
        <Select label="Exercise" options={[{ value: '', label: 'Choose…' }, ...(exercises.data || []).map((e) => ({ value: e._id, label: `${e.name} (${label(e.primaryMuscle)})` }))]} value={addId} onChange={(e) => setAddId(e.target.value)} />
        <button className="btn-primary mt-4 w-full" disabled={!addId || addExercise.isPending} onClick={() => addExercise.mutate()}>Add</button>
      </Modal>

      <Confirm open={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={() => discard.mutate()} title="Delete this session?" message="Everything logged in it is removed and nothing is saved to your history." danger />
      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish session?" size="sm">
        <p className="text-sm text-zinc-500">{doneCount} of {total} exercises done · {fmtDuration(watch.elapsed)} · {session.totalCalories} kcal</p>
        {session.cooldown?.steps.length && !session.cooldown.completedAt && !session.cooldown.skipped && (
          <button className="mt-3 flex w-full items-center gap-2 rounded-xl bg-sky-500/10 p-3 text-left text-sm font-semibold text-sky-700 dark:text-sky-300" onClick={() => { setFinishOpen(false); setPhase('cooldown'); }}>
            <Snowflake className="h-4 w-4 shrink-0" /> You have not cooled down yet — 5 minutes now saves you tomorrow.
          </button>
        )}
        <p className="label mt-4">How did it feel?</p>
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} className={cn('text-2xl', n <= rating ? 'opacity-100' : 'opacity-30')} aria-label={`${n} stars`}>⭐</button>)}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-secondary" disabled={finish.isPending} onClick={() => finish.mutate(false)}><Flag className="h-4 w-4" /> Finish</button>
          <button className="btn-accent" disabled={finish.isPending} onClick={() => finish.mutate(true)}><Sparkles className="h-4 w-4" /> {finish.isPending ? 'Finishing…' : 'Finish + AI summary'}</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-500">The AI summary reads this session and your recent history to suggest one improvement for next time.</p>
      </Modal>
      <Confirm open={abandonOpen} onClose={() => setAbandonOpen(false)} onConfirm={() => status.mutate('abandoned')} title="Abandon session?" message="Progress in this session will not count toward your stats." danger />
    </div>
  );
}
