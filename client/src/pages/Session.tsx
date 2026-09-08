import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Pause, Play, Plus, SkipForward, Flame, Timer, BookOpen, ListChecks, X, Trash2, Undo2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutSession, Exercise, Equipment } from '@/types';
import { PageLoader, Modal, Select, Confirm, Badge } from '@/components/ui';
import { useStopwatch } from '@/hooks/useTimer';
import { unlockAudio } from '@/lib/sound';
import { fmtDuration, label, cn } from '@/lib/utils';
import StartScreen from '@/components/session/StartScreen';
import StrengthPanel from '@/components/session/StrengthPanel';
import CardioPanel from '@/components/session/CardioPanel';
import GuidedMode from '@/components/session/GuidedMode';
import { useAuth } from '@/context/AuthContext';

export default function Session() {
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const planId = (loc.state as { planId?: string } | null)?.planId;

  const active = useQuery({ queryKey: ['session', 'active'], queryFn: async () => (await api.get('/sessions/active')).data.item as WorkoutSession | null });
  const [idx, setIdx] = useState(0);
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
  useEffect(() => { if (session && !paused) watch.start(); else watch.pause(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session?._id, paused]);
  useEffect(() => { if (session) setIdx(Math.min(session.currentExerciseIndex, Math.max(0, session.exercises.length - 1)));   }, [session?._id]);

  const setSession = (s: WorkoutSession) => qc.setQueryData(['session', 'active'], s);
  const invalidateAll = () => { qc.invalidateQueries({ queryKey: ['session'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['history'] }); qc.invalidateQueries({ queryKey: ['ai-rec'] }); };

  const start = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/sessions/start', body),
    onSuccess: (r) => { unlockAudio(); setSession(r.data.item); if (r.data.resumed) toast('Resumed your active session', { icon: '▶️' }); else toast.success('Session started. Let’s go! 💪'); },
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

  if (active.isLoading) return <PageLoader />;
  if (!session) return <StartScreen planId={planId} onStart={(body) => start.mutate(body)} starting={start.isPending} />;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sticky header */}
      <div className="card sticky top-[4.5rem] z-20 mb-4 flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{session.focus || session.planName}</p>
          <p className="text-xs text-slate-500">Exercise {Math.min(idx + 1, session.exercises.length)} of {session.exercises.length} · {doneCount} done</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${(doneCount / Math.max(1, session.exercises.length)) * 100}%` }} /></div>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 font-mono text-lg font-bold tabular-nums"><Timer className="h-4 w-4 text-brand-500" /> {fmtDuration(watch.elapsed)}</p>
          <p className="flex items-center justify-end gap-1 text-xs text-orange-500"><Flame className="h-3.5 w-3.5" /> {session.totalCalories} kcal</p>
        </div>
        <button onClick={() => status.mutate(paused ? 'active' : 'paused')} className="btn-secondary h-10 w-10 p-0" aria-label={paused ? 'Resume' : 'Pause'}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
      </div>

      {paused && <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-center text-sm font-semibold text-amber-600">Session paused - the timer is stopped. Tap play to resume.</div>}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setGuided((g) => !g)} aria-pressed={guided} className={cn('btn-secondary', guided && 'border-brand-500 text-brand-500')}><BookOpen className="h-4 w-4" /> Guided mode</button>
        <button onClick={() => setShowList(true)} className="btn-secondary"><ListChecks className="h-4 w-4" /> Exercise list</button>
        <button onClick={() => setAddOpen(true)} className="btn-secondary"><Plus className="h-4 w-4" /> Add</button>
        <button onClick={() => setFinishOpen(true)} className="btn-accent ml-auto"><Flag className="h-4 w-4" /> Finish session</button>
      </div>

      {!current ? (
        <div className="card p-8 text-center">
          <p className="text-lg font-bold">No exercises in this session</p>
          <p className="mt-1 text-sm text-slate-500">Add exercises from the library to get going, or finish the session.</p>
          <button className="btn-primary mt-4" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add exercise</button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={current._id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Current exercise</p>
                  <h2 className="text-2xl font-extrabold">{current.exerciseName}</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {current.equipmentName && <Badge color="slate">{current.equipmentName}</Badge>}
                    {current.muscleGroup && <Badge color="brand">{label(current.muscleGroup)}</Badge>}
                    <Badge color={current.status === 'completed' ? 'green' : current.status === 'skipped' ? 'amber' : 'violet'}>{label(current.status)}</Badge>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  {current.type === 'cardio' ? <p>Target <span className="font-bold text-slate-900 dark:text-white">{current.targetDuration} min</span></p> : <p>Target <span className="font-bold text-slate-900 dark:text-white">{current.targetSets} × {current.targetReps}</span>{current.targetWeight ? ` @ ${current.targetWeight} kg` : ''}</p>}
                  <p>Rest {current.restSeconds}s</p>
                </div>
              </div>
            </div>

            {guided && <GuidedMode equipment={currentEquipment} exercise={currentExercise} />}

            {current.type === 'cardio' ? (
              <CardioPanel session={session} exercise={current} onUpdate={setSession} onDone={goNext} paused={paused} />
            ) : (
              <StrengthPanel session={session} exercise={current} onUpdate={setSession} onDone={() => complete.mutate({ exerciseId: current._id })} paused={paused} />
            )}

            <div className="flex items-center justify-between gap-2">
              <button className="btn-secondary" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft className="h-4 w-4" /> Prev</button>
              <div className="flex gap-1">{current.type !== 'cardio' && current.sets.length > 0 && <button className="btn-ghost" onClick={() => undoSet.mutate(current._id)} disabled={undoSet.isPending}><Undo2 className="h-4 w-4" /> Undo set</button>}<button className="btn-ghost text-amber-600" onClick={() => complete.mutate({ exerciseId: current._id, skip: true })} disabled={current.status === 'completed'}><SkipForward className="h-4 w-4" /> Skip</button></div>
              <button className="btn-secondary" onClick={() => setIdx(Math.min(session.exercises.length - 1, idx + 1))} disabled={idx >= session.exercises.length - 1}>Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Exercise list drawer */}
      <Modal open={showList} onClose={() => setShowList(false)} title="Session exercises">
        <ul className="space-y-1">
          {session.exercises.map((e, i) => (
            <li key={e._id} className="flex items-center gap-1">
              <button onClick={() => { setIdx(i); setShowList(false); }} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5', i === idx && 'bg-brand-500/10')}>
                <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', e.status === 'completed' ? 'bg-emerald-500 text-white' : e.status === 'skipped' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-white/10')}>{e.status === 'completed' ? '✓' : i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{e.exerciseName}</p><p className="text-xs text-slate-500">{e.type === 'cardio' ? `${e.targetDuration} min` : `${e.sets.filter((s) => s.completed).length}/${e.targetSets} sets`}</p></div>
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
        <p className="text-sm text-slate-500">{doneCount} of {session.exercises.length} exercises done · {fmtDuration(watch.elapsed)} · {session.totalCalories} kcal</p>
        <p className="label mt-4">How did it feel?</p>
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} className={cn('text-2xl', n <= rating ? 'opacity-100' : 'opacity-30')} aria-label={`${n} stars`}>⭐</button>)}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-secondary" disabled={finish.isPending} onClick={() => finish.mutate(false)}><Flag className="h-4 w-4" /> Finish</button>
          <button className="btn-accent" disabled={finish.isPending} onClick={() => finish.mutate(true)}><Sparkles className="h-4 w-4" /> {finish.isPending ? 'Finishing…' : 'Finish + AI summary'}</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">The AI summary reads this session and your recent history to suggest one improvement for next time.</p>
      </Modal>
      <Confirm open={abandonOpen} onClose={() => setAbandonOpen(false)} onConfirm={() => status.mutate('abandoned')} title="Abandon session?" message="Progress in this session will not count toward your stats." danger />
    </div>
  );
}
