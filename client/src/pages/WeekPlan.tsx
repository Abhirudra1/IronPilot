import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, RefreshCw, Sparkles, Moon, Zap, Flame, Droplets, Beef, Check, Play, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WeeklyPlan } from '@/types';
import { PageHeader, Badge, FadeIn } from '@/components/ui';
import { WeekPageSkeleton } from '@/components/ui/Skeleton';
import { label, cn, MUSCLE_COLORS } from '@/lib/utils';
import PlanNav from '@/components/PlanNav';

const SHORT: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

/** The coach's programme for this week: sessions with starting loads + daily nutrition targets. */
export default function WeekPlan() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['weekly-plan'], queryFn: async () => (await api.get('/ai/weekly-plan')).data.item as WeeklyPlan, staleTime: 10 * 60_000 });
  const regen = useMutation({ mutationFn: () => api.post('/ai/weekly-plan', { force: true }), onSuccess: (r) => { qc.setQueryData(['weekly-plan'], r.data.item); toast.success('Week re-planned'); }, onError: (e) => toast.error(errMsg(e)) });
  const apply = useMutation({
    mutationFn: () => api.post('/ai/weekly-plan/apply'),
    onSuccess: (r) => { toast.success(`${r.data.plans} sessions added to your schedule`); ['schedule', 'plans', 'dashboard', 'today-plan'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); nav('/schedule'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading || !data) return <WeekPageSkeleton />;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const training = data.days.filter((d) => d.type === 'training').length;
  const monday = new Date(data.weekStart);
  const dateOf = (i: number) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d.getDate(); };
  const n = data.nutrition;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="This week's plan" subtitle={`Week of ${monday.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${training} training day${training === 1 ? '' : 's'}`} icon={<CalendarCheck className="h-6 w-6" />}
        actions={<><button className="btn-secondary" onClick={() => regen.mutate()} disabled={regen.isPending}><RefreshCw className={cn('h-4 w-4', regen.isPending && 'animate-spin')} /> Re-plan</button><button className="btn-primary" onClick={() => apply.mutate()} disabled={apply.isPending || !training}><Check className="h-4 w-4" /> Apply to schedule</button></>} />

      <PlanNav />
      {/* Coach summary */}
      <FadeIn>
        <div className="card mb-4 border-brand-500/30 bg-brand-500/5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400"><Bot className="h-3.5 w-3.5" /> Coach's read on your week</p>
            <Badge color={data.source === 'gemini' ? 'violet' : 'slate'}>{data.source === 'gemini' ? 'AI' : 'Basic'}</Badge>
          </div>
          <p className="mt-2 font-bold">{data.summary}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">{data.coachNotes.map((c, i) => <li key={i} className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {c}</li>)}</ul>
        </div>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Days */}
        <ol className="space-y-3 lg:col-span-2" aria-label="Weekly programme">
          {data.days.map((d, i) => {
            const isToday = i === todayIdx;
            return (
              <FadeIn key={d.day} delay={i * 0.04}>
                <li className={cn('card overflow-hidden', isToday && 'ring-2 ring-brand-500 dark:ring-brand-400')}>
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <div className={cn('flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5', isToday ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950' : d.type === 'training' ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'bg-zinc-100 text-zinc-500 dark:bg-white/5')}>
                      <span className="text-[10px] font-bold uppercase leading-none">{SHORT[d.day]}</span>
                      <span className="mt-0.5 text-lg font-extrabold leading-none">{dateOf(i)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-bold">{d.type === 'training' ? <Zap className="h-4 w-4 shrink-0 text-brand-500" /> : <Moon className="h-4 w-4 shrink-0 text-zinc-400" />} {d.focus}</p>
                      {d.type === 'training' ? <div className="mt-1 flex flex-wrap gap-1">{d.muscleGroups.slice(0, 4).map((m) => <span key={m} className="chip text-white" style={{ background: MUSCLE_COLORS[m] || '#5a9e0c' }}>{label(m)}</span>)}</div> : <p className="text-xs text-zinc-500">{d.notes}</p>}
                    </div>
                    {isToday && d.type === 'training' && <button className="btn-primary shrink-0 px-3" onClick={() => nav('/session', d.planId ? { state: { planId: d.planId } } : undefined)}><Play className="h-4 w-4" /> <span className="hidden sm:inline">Start</span></button>}
                  </div>
                  {d.type === 'training' && (
                    <div className="border-t border-zinc-100 px-3 pb-3 dark:border-white/[0.06] sm:px-4">
                      {d.warmup && <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200"><span className="font-bold">Warm-up first ·</span> {d.warmup}</p>}
                      <ul className="mt-2 divide-y divide-zinc-100 text-sm dark:divide-white/5">
                        {d.exercises.map((e, j) => (
                          <li key={j} className="flex items-start justify-between gap-3 py-1.5">
                            <div className="min-w-0"><p className="font-semibold">{e.name}</p>{e.note && <p className="text-xs text-zinc-500">{e.note}</p>}</div>
                            <p className="shrink-0 text-right font-mono text-sm font-bold tabular-nums">{e.durationMin > 0 ? `${e.durationMin} min` : `${e.sets}×${e.reps}${e.weightKg > 0 ? ` @ ${e.weightKg} kg` : ''}`}</p>
                          </li>
                        ))}
                      </ul>
                      {d.cooldown && <p className="mt-2 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-800 dark:text-sky-200"><span className="font-bold">Cool-down after ·</span> {d.cooldown}</p>}
                      {d.notes && <p className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">{d.notes}</p>}
                    </div>
                  )}
                </li>
              </FadeIn>
            );
          })}
        </ol>

        {/* Nutrition */}
        <FadeIn delay={0.1}>
          <div className="card sticky top-20 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Daily nutrition this week</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-orange-500/10 p-2.5"><Flame className="mx-auto h-4 w-4 text-orange-500" /><p className="text-lg font-extrabold">{n.trainingDayCalories}</p><p className="text-[10px] text-zinc-500">kcal · training day</p></div>
              <div className="rounded-xl bg-zinc-100 p-2.5 dark:bg-white/5"><Moon className="mx-auto h-4 w-4 text-zinc-500" /><p className="text-lg font-extrabold">{n.restDayCalories}</p><p className="text-[10px] text-zinc-500">kcal · rest day</p></div>
              <div className="rounded-xl bg-rose-500/10 p-2.5"><Beef className="mx-auto h-4 w-4 text-rose-500" /><p className="text-lg font-extrabold">{n.protein} g</p><p className="text-[10px] text-zinc-500">protein / day</p></div>
              <div className="rounded-xl bg-sky-500/10 p-2.5"><Droplets className="mx-auto h-4 w-4 text-sky-500" /><p className="text-lg font-extrabold">{(n.waterMl / 1000).toFixed(1)} L</p><p className="text-[10px] text-zinc-500">water / day</p></div>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500">Carbs {n.carbs} g · Fat {n.fat} g</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500">Protein across the day</p>
            <ul className="mt-2 space-y-1.5">{n.mealStructure.map((m, i) => <li key={i} className="flex items-start justify-between gap-2 text-sm"><span className="min-w-0"><span className="font-semibold capitalize">{m.meal}</span><span className="block text-xs text-zinc-500">{m.idea}</span></span><span className="shrink-0 font-bold text-rose-500">{m.protein} g</span></li>)}</ul>
            {n.tips.length > 0 && <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">{n.tips.map((t, i) => <li key={i}>💡 {t}</li>)}</ul>}
            <Link to="/nutrition" className="btn-secondary mt-4 w-full">Log today's meals</Link>
          </div>
        </FadeIn>
      </div>
      <p className="mt-4 text-center text-[11px] text-zinc-400">Loads are suggestions from your logged lifts and level - stop 1-2 reps short of failure and adjust if form breaks. Re-plan any time; the plan is refreshed weekly.</p>
    </div>
  );
}
