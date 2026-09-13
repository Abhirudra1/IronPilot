import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Timer, Droplets, Scale, Target, Zap, Play, Utensils, ClipboardList, Trophy, ChevronRight, Sparkles, Trash2, Bot, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { DashboardData, WaterLog } from '@/types';
import { Stat, ProgressRing, Modal, Input, FadeIn, Bar } from '@/components/ui';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import AICoachWidget from '@/components/AICoachWidget';
import QuickLog from '@/components/QuickLog';
import MealForm from '@/components/MealForm';
import { label, todayISO } from '@/lib/utils';

/**
 * Home. Mobile flow, top to bottom: greeting -> ONE clear "today" card with a single Start button ->
 * four logging shortcuts -> today's numbers -> coach note -> hydration/goal rings.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState<'weight' | 'water' | 'meal' | 'log' | null>(null);
  const [weight, setWeight] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get('/users/dashboard')).data as DashboardData, refetchInterval: 60_000 });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['water'] }); qc.invalidateQueries({ queryKey: ['meals'] }); qc.invalidateQueries({ queryKey: ['weight'] }); };

  const waterLogs = useQuery({ queryKey: ['water', 'today'], queryFn: async () => (await api.get('/tracking/water')).data as { logs: WaterLog[]; totalMl: number; goalMl: number }, enabled: modal === 'water' });
  const delWater = useMutation({ mutationFn: (id: string) => api.delete(`/tracking/water/${id}`), onSuccess: () => { toast.success('Water entry removed'); invalidate(); }, onError: (e) => toast.error(errMsg(e)) });
  const addWater = useMutation({
    mutationFn: (ml: number) => api.post('/tracking/water', { amountMl: ml }),
    onSuccess: (r) => {
      const id = r.data.item._id as string;
      toast((tt) => <span className="flex items-center gap-3">+{r.data.item.amountMl} ml · {r.data.remainingMl} ml to go<button className="font-bold text-brand-600 underline dark:text-brand-400" onClick={() => { delWater.mutate(id); toast.dismiss(tt.id); }}>Undo</button></span>, { icon: '💧', duration: 5000 });
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const addWeight = useMutation({ mutationFn: () => api.post('/tracking/weight', { weight: Number(weight) }), onSuccess: (r) => { toast.success('Weight logged'); setModal(null); setWeight(''); invalidate(); if (r.data.newAchievements?.length) toast(`🏅 ${r.data.newAchievements[0].title}`); }, onError: (e) => toast.error(errMsg(e)) });

  if (isLoading || !data) return <DashboardSkeleton />;
  const t = data.today;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const waterPct = Math.min(100, Math.round((t.waterMl / t.waterGoalMl) * 100));
  const scheduled = t.plans[0];
  const pick = data.suggestion?.plan;
  const todayPlan = scheduled ? { id: scheduled._id, title: scheduled.focus || scheduled.name, meta: `${scheduled.exerciseCount} exercises · ~${scheduled.estimatedMinutes || 45} min`, why: `Scheduled for ${label(t.day)}.`, kind: 'scheduled' as const }
    : pick ? { id: pick._id, title: pick.focus || pick.name, meta: `${pick.exerciseCount} exercises · ~${pick.estimatedMinutes || 45} min${pick.isOwn ? '' : ' · template'}`, why: data.suggestion!.reason, kind: 'pick' as const }
      : null;

  const shortcuts = [
    { label: 'Meal', sub: 'log food', icon: Utensils, onClick: () => setModal('meal') },
    { label: 'Water', sub: `${waterPct}%`, icon: Droplets, onClick: () => setModal('water') },
    { label: 'Weight', sub: `${t.currentWeight} kg`, icon: Scale, onClick: () => setModal('weight') },
    { label: 'Exercise', sub: 'quick log', icon: ClipboardList, onClick: () => setModal('log') },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{greeting}, {user?.fullName.split(' ')[0]} 👋</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">Today</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm">
            <span className="chip bg-orange-500/10 text-orange-600 dark:text-orange-400"><Flame className="h-3.5 w-3.5" /> {t.streak}d</span>
            <span className="chip bg-violet-500/10 text-violet-600 dark:text-violet-400"><Trophy className="h-3.5 w-3.5" /> L{t.level} · {t.points}</span>
          </div>
        </div>
      </FadeIn>

      {/* 1. Today's workout: exactly one primary action */}
      <FadeIn delay={0.03}>
        {data.activeSession ? (
          <button onClick={() => nav('/session')} className="card flex w-full items-center gap-3 border-accent-500/40 bg-accent-500/10 p-4 text-left">
            <span className="relative flex h-3 w-3 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-accent-500" /></span>
            <span className="min-w-0 flex-1"><span className="block font-extrabold">Workout in progress</span><span className="block truncate text-sm text-zinc-600 dark:text-zinc-300">{data.activeSession.focus || data.activeSession.planName} · tap to resume</span></span>
            <ChevronRight className="h-5 w-5 shrink-0 text-accent-600" />
          </button>
        ) : (
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 text-white dark:from-brand-400 dark:to-brand-500 dark:text-zinc-950 sm:p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide opacity-80">{todayPlan?.kind === 'pick' ? <><Bot className="h-3.5 w-3.5" /> Coach pick for {label(t.day)}</> : <><CalendarDays className="h-3.5 w-3.5" /> Today · {label(t.day)}</>}</p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight">{todayPlan ? todayPlan.title : 'Rest day'}</h2>
              <p className="mt-0.5 text-sm opacity-90">{todayPlan ? todayPlan.meta : 'Nothing scheduled - a free session or a walk both count.'}</p>
            </div>
            <div className="p-3 sm:p-4">
              {todayPlan && <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">{todayPlan.why}</p>}
              <div className="flex items-center gap-2">
                <button onClick={() => nav('/session', todayPlan ? { state: { planId: todayPlan.id } } : undefined)} className="btn-primary flex-1 py-3 text-base"><Play className="h-5 w-5" fill="currentColor" /> {todayPlan ? 'Start workout' : 'Start free session'}</button>
                <Link to="/session" className="btn-secondary px-3" aria-label="Choose a different plan">Change</Link>
              </div>
              <div className="mt-2.5 flex gap-3 text-xs"><Link to="/week" className="font-bold text-brand-600 dark:text-brand-400">This week's plan →</Link><Link to="/schedule" className="font-bold text-zinc-500">Edit schedule</Link></div>
            </div>
          </div>
        )}
      </FadeIn>

      {/* 2. Logging shortcuts */}
      <FadeIn delay={0.06}>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick log">
          {shortcuts.map((a) => (
            <button key={a.label} onClick={a.onClick} className="flex min-h-11 flex-col items-center gap-1 rounded-2xl border border-zinc-200 bg-white px-1 py-2.5 text-center transition active:scale-[0.97] dark:border-white/[0.07] dark:bg-surface-800">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400"><a.icon className="h-4 w-4" /></span>
              <span className="text-xs font-bold leading-tight">{a.label}</span>
              <span className="text-[10px] leading-none text-zinc-500">{a.sub}</span>
            </button>
          ))}
        </div>
      </FadeIn>

      {/* 3. Today's numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Calories burned" value={`${t.caloriesBurned}`} sub="kcal today" icon={<Flame className="h-5 w-5" />} accent="orange" />
        <Stat label="Workout time" value={`${t.workoutMinutes} min`} sub={`${t.workouts} session${t.workouts === 1 ? '' : 's'}`} icon={<Timer className="h-5 w-5" />} accent="brand" />
        <Stat label="Water" value={`${(t.waterMl / 1000).toFixed(1)} L`} sub={`${t.waterRemainingMl} ml to go`} icon={<Droplets className="h-5 w-5" />} accent="sky" />
        <Stat label="Weight" value={`${t.currentWeight} kg`} sub={t.bmi ? `BMI ${t.bmi} · ${label(t.bmiCategory)}` : undefined} icon={<Scale className="h-5 w-5" />} accent="violet" />
        <Stat label="Goal progress" value={`${t.goalProgress}%`} sub={t.targetWeight ? `Target ${t.targetWeight} kg` : 'Set a target'} icon={<Target className="h-5 w-5" />} accent="emerald" />
        <Stat label="Streak" value={`${t.streak} 🔥`} sub={`Best ${t.longestStreak} days`} icon={<Zap className="h-5 w-5" />} accent="rose" />
      </div>

      {/* 4. Coach note + rings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.09} className="lg:col-span-2"><AICoachWidget /></FadeIn>
        <FadeIn delay={0.12}>
          <div className="card grid h-full grid-cols-2 gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <ProgressRing value={waterPct} color="#38bdf8" size={84}><div><p className="text-base font-extrabold">{waterPct}%</p><p className="text-[10px] text-zinc-500">water</p></div></ProgressRing>
              <div className="flex flex-col gap-1">{[250, 500].map((ml) => <button key={ml} onClick={() => addWater.mutate(ml)} className="btn-secondary min-h-9 px-2.5 py-1 text-xs" disabled={addWater.isPending}>+{ml} ml</button>)}</div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing value={t.goalProgress} color="#5a9e0c" size={84}><div><p className="text-base font-extrabold">{t.goalProgress}%</p><p className="text-[10px] text-zinc-500">goal</p></div></ProgressRing>
              <div className="text-xs text-zinc-500"><p className="font-bold text-zinc-900 dark:text-zinc-100">{t.startWeight} → {t.targetWeight || '?'} kg</p><Link to="/progress" className="mt-1 inline-flex items-center gap-1 font-bold text-brand-600 dark:text-brand-400">Progress <Sparkles className="h-3 w-3" /></Link></div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Modals */}
      <Modal open={modal === 'weight'} onClose={() => setModal(null)} title="Log weight" size="sm">
        <Input label="Weight (kg)" type="number" step="0.1" min={20} max={400} value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
        <button className="btn-primary mt-4 w-full" disabled={!weight || addWeight.isPending} onClick={() => addWeight.mutate()}>Save</button>
      </Modal>
      <Modal open={modal === 'water'} onClose={() => setModal(null)} title="Add water" size="sm">
        <p className="text-sm text-zinc-500">{t.waterMl} / {t.waterGoalMl} ml today</p>
        <Bar value={t.waterMl} max={t.waterGoalMl} color="bg-sky-400" className="my-3" />
        <div className="grid grid-cols-4 gap-2">{[150, 250, 500, 750].map((ml) => <button key={ml} className="btn-secondary" onClick={() => addWater.mutate(ml)} disabled={addWater.isPending}>{ml} ml</button>)}</div>
        <p className="label mt-4">Today's entries</p>
        <ul className="max-h-48 divide-y divide-zinc-100 overflow-y-auto text-sm dark:divide-white/5">
          {waterLogs.data?.logs.length ? waterLogs.data.logs.map((l) => <li key={l._id} className="flex items-center justify-between py-1.5"><span>{new Date(l.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · <strong>{l.amountMl} ml</strong></span><button className="btn-ghost h-9 w-9 p-0 text-rose-500" onClick={() => delWater.mutate(l._id)} aria-label="Remove entry"><Trash2 className="h-4 w-4" /></button></li>) : <li className="py-2 text-zinc-500">Nothing logged yet today.</li>}
        </ul>
      </Modal>
      <Modal open={modal === 'meal'} onClose={() => setModal(null)} title="Add meal"><MealForm showType onSaved={() => { setModal(null); invalidate(); }} /></Modal>
      <Modal open={modal === 'log'} onClose={() => setModal(null)} title="Log exercise"><QuickLog onDone={() => { setModal(null); invalidate(); }} defaultDate={todayISO()} /></Modal>
    </div>
  );
}
