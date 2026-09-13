import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Bell, Moon, Zap, ChevronRight, Check, Sparkles, Play, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlanNav from '@/components/PlanNav';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutPlan } from '@/types';
import { PageHeader, Modal, Badge, FadeIn } from '@/components/ui';
import { ListPageSkeleton } from '@/components/ui/Skeleton';
import { DAYS, label, cn, MUSCLE_COLORS } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

type ScheduleMap = Record<string, WorkoutPlan | null>;
const SHORT: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

/**
 * Weekly schedule: a 7-day strip (snap-scroll on phones, grid on desktop). Tap a day to pick a plan or
 * rest in a bottom sheet; changes save immediately. A summary compares training days with the target.
 */
export default function Schedule() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { user } = useAuth();
  const [picking, setPicking] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['schedule'], queryFn: async () => (await api.get('/plans/schedule')).data as { schedule: ScheduleMap; plans: WorkoutPlan[] } });
  const templates = useQuery({ queryKey: ['plans', 'templates'], queryFn: async () => (await api.get('/plans?templates=true')).data.items as WorkoutPlan[], enabled: !!picking, staleTime: 10 * 60_000 });
  // Picking a template copies it into the user's plans first, then schedules the copy
  const useTemplate = useMutation({
    mutationFn: async ({ day, id }: { day: string; id: string }) => ({ day, plan: (await api.post(`/plans/${id}/duplicate`)).data.item as WorkoutPlan }),
    onSuccess: ({ day, plan }) => { qc.invalidateQueries({ queryKey: ['plans'] }); assign(day, plan._id, plan); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const save = useMutation({
    mutationFn: (schedule: Record<string, string | null>) => api.put('/plans/schedule', { schedule }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); qc.invalidateQueries({ queryKey: ['plans'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['today-plan'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const assign = (day: string, planId: string | null, planDoc?: WorkoutPlan) => {
    if (!data) return;
    const next = Object.fromEntries(DAYS.map((d) => [d, d === day ? planId : data.schedule[d]?._id || null]));
    const planObj = planId ? planDoc || data.plans.find((p) => p._id === planId) || null : null;
    qc.setQueryData(['schedule'], { ...data, plans: planDoc && !data.plans.some((p) => p._id === planDoc._id) ? [...data.plans, planDoc] : data.plans, schedule: { ...data.schedule, [day]: planObj } });
    save.mutate(next, { onSuccess: () => toast.success(planId ? `${label(day)} set` : `${label(day)} is a rest day`) });
    setPicking(null);
  };

  const askPermission = async () => {
    if (!('Notification' in window)) return toast.error('Notifications are not supported in this browser');
    const p = await Notification.requestPermission();
    if (p === 'granted') { new Notification('IronPilot', { body: 'Workout reminders enabled 💪', icon: '/icons/icon-192.png' }); toast.success('Reminders enabled'); } else toast.error('Permission denied');
  };

  if (isLoading || !data) return <ListPageSkeleton filters={false} />;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const trainingDays = DAYS.filter((d) => data.schedule[d]).length;
  const target = user?.workoutDaysPerWeek || 3;
  const muscles = [...new Set(DAYS.flatMap((d) => data.schedule[d]?.muscleGroups || []))];
  const minutes = DAYS.reduce((a, d) => a + (data.schedule[d]?.estimatedMinutes || (data.schedule[d] ? 45 : 0)), 0);
  const restStreak = DAYS.map((d) => !data.schedule[d]);
  const longestRest = restStreak.reduce((best, r) => { best.cur = r ? best.cur + 1 : 0; best.max = Math.max(best.max, best.cur); return best; }, { cur: 0, max: 0 }).max;
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - todayIdx);
  const dateOf = (i: number) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; };
  const bars = (p: WorkoutPlan) => (p.muscleGroups || []).slice(0, 3).map((m) => <span key={m} className="h-1.5 w-5 rounded-full" style={{ background: MUSCLE_COLORS[m] || '#5a9e0c' }} title={label(m)} />);
  // Spread the user's plans evenly across the target number of days (rest days in between), e.g. 4 days -> Mon Tue Thu Fri
  const autoFill = () => {
    if (!data.plans.length) return toast.error('Create or copy a plan first');
    const spread: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
    const days = spread[Math.min(7, Math.max(1, target))];
    const next = Object.fromEntries(DAYS.map((d, i) => { const k = days.indexOf(i); return [d, k >= 0 ? data.plans[k % data.plans.length]._id : null]; }));
    const schedule = Object.fromEntries(DAYS.map((d) => [d, next[d] ? data.plans.find((p) => p._id === next[d]) || null : null]));
    qc.setQueryData(['schedule'], { ...data, schedule });
    save.mutate(next, { onSuccess: () => toast.success(`Week planned: ${days.length} training days`) });
  };

  return (
    <div>
      <PageHeader title="Weekly Schedule" subtitle="Tap a day to assign a plan. The dashboard, the Start screen and reminders follow this." icon={<CalendarDays className="h-6 w-6" />}
        actions={<button className="btn-secondary" onClick={askPermission}><Bell className="h-4 w-4" /> Enable reminders</button>} />

      <PlanNav />
      {/* Week at a glance */}
      <FadeIn>
        <div className="card mb-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-extrabold leading-none">{trainingDays}<span className="text-base font-semibold text-zinc-400"> / {target} days</span></p>
              <p className="mt-1 text-xs text-zinc-500">{Math.round(minutes / 60 * 10) / 10} h planned · {7 - trainingDays} rest day{7 - trainingDays === 1 ? '' : 's'}</p>
            </div>
            <button className="btn-secondary shrink-0" onClick={autoFill} disabled={save.isPending}><Wand2 className="h-4 w-4" /> Auto-fill</button>
          </div>
          <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Week overview">
            {DAYS.map((d, i) => {
              const on = !!data.schedule[d]; const isToday = i === todayIdx;
              return (
                <li key={d} className="flex flex-col items-center gap-1">
                  <span className={cn('text-[10px] font-bold uppercase', isToday ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400')}>{SHORT[d][0]}</span>
                  <button onClick={() => setPicking(d)} aria-label={`${label(d)}: ${on ? 'training' : 'rest'}`} className={cn('grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition', on ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950' : 'bg-zinc-100 text-zinc-500 dark:bg-white/5', isToday && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-surface-800')}>{dateOf(i).getDate()}</button>
                </li>
              );
            })}
          </ol>
          {trainingDays < target && <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"><Sparkles className="h-3.5 w-3.5 shrink-0" /> {target - trainingDays} more day{target - trainingDays > 1 ? 's' : ''} to reach your weekly goal - tap a day or use Auto-fill.</p>}
          {longestRest >= 4 && trainingDays > 0 && <p className="mt-2 flex items-center gap-2 rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300"><Moon className="h-3.5 w-3.5 shrink-0" /> {longestRest} rest days in a row - spreading sessions out keeps the streak alive.</p>}
        </div>
      </FadeIn>

      {/* Agenda (phones & tablets) */}
      <ol className="space-y-2 lg:hidden" aria-label="Weekly agenda">
        {DAYS.map((d, i) => {
          const plan = data.schedule[d]; const isToday = i === todayIdx; const past = i < todayIdx;
          return (
            <FadeIn key={d} delay={i * 0.03}>
              <li className={cn('card flex items-stretch overflow-hidden', isToday && 'ring-2 ring-brand-500 dark:ring-brand-400', past && !plan && 'opacity-60')}>
                <button onClick={() => setPicking(d)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left" aria-label={`${label(d)}: ${plan ? plan.name : 'rest day'}. Tap to change`}>
                  <div className={cn('flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5', isToday ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300')}>
                    <span className="text-[10px] font-bold uppercase leading-none">{SHORT[d]}</span>
                    <span className="mt-0.5 text-lg font-extrabold leading-none">{dateOf(i).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {plan ? (
                      <>
                        <p className="truncate font-bold">{plan.focus || plan.name}</p>
                        <p className="text-xs text-zinc-500">{plan.exercises.length} exercises · ~{plan.estimatedMinutes || 45} min</p>
                        <div className="mt-1.5 flex gap-1">{bars(plan)}</div>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-zinc-500">Rest day</p>
                        <p className="text-xs text-zinc-400">Tap to assign a plan</p>
                      </>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                </button>
                {isToday && plan && <button className="flex shrink-0 items-center gap-1 border-l border-zinc-200 px-3 text-xs font-bold text-brand-600 dark:border-white/10 dark:text-brand-400" onClick={() => nav('/session', { state: { planId: plan._id } })} aria-label="Start today's plan"><Play className="h-4 w-4" fill="currentColor" /> Start</button>}
              </li>
            </FadeIn>
          );
        })}
      </ol>

      {/* Desktop grid */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-7">
        {DAYS.map((d, i) => {
          const plan = data.schedule[d]; const isToday = i === todayIdx;
          return (
            <FadeIn key={d} delay={i * 0.04}>
              <button onClick={() => setPicking(d)} className={cn('card flex h-full w-full flex-col p-4 text-left transition hover:border-brand-500/60', isToday && 'ring-2 ring-brand-500 dark:ring-brand-400', !plan && 'border-dashed')} aria-label={`${label(d)}: ${plan ? plan.name : 'rest day'}. Tap to change`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{SHORT[d]} <span className="text-zinc-400">{dateOf(i).getDate()}</span></p>
                  {isToday ? <Badge color="brand">Today</Badge> : <ChevronRight className="h-4 w-4 text-zinc-300" />}
                </div>
                {plan ? (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950"><Zap className="h-4 w-4" /></span>
                      <p className="line-clamp-2 text-sm font-extrabold leading-tight">{plan.focus || plan.name}</p>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500">{plan.exercises.length} exercises · ~{plan.estimatedMinutes || 45} min</p>
                    <div className="mt-2 flex flex-wrap gap-1">{bars(plan)}</div>
                  </>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-zinc-500"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 dark:bg-white/5"><Moon className="h-4 w-4" /></span><p className="text-sm font-semibold">Rest day</p></div>
                )}
                {isToday && plan && <span className="btn-primary mt-auto pt-2" onClick={(e) => { e.stopPropagation(); nav('/session', { state: { planId: plan._id } }); }} role="link"><Play className="h-4 w-4" /> Start now</span>}
              </button>
            </FadeIn>
          );
        })}
      </div>

      {/* Muscle coverage */}
      <FadeIn delay={0.3}>
        <div className="card mt-4 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Muscle groups covered this week</p>
          {muscles.length ? <div className="mt-2 flex flex-wrap gap-1.5">{muscles.map((m) => <span key={m} className="chip text-white" style={{ background: MUSCLE_COLORS[m] || '#5a9e0c' }}>{label(m)}</span>)}</div> : <p className="mt-2 text-sm text-zinc-500">Assign plans to see what your week trains.</p>}
          <p className="mt-3 text-xs text-zinc-500">Reminder at {user?.preferences?.reminderTimes?.workout || '18:00'} on training days (change it in Settings). In-app reminders show in the bell; browser notifications need permission.</p>
        </div>
      </FadeIn>

      {/* Plan picker */}
      <Modal open={!!picking} onClose={() => setPicking(null)} title={picking ? `${label(picking)} - choose a plan` : ''}>
        <ul className="space-y-1.5">
          <li>
            <button onClick={() => picking && assign(picking, null)} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left', picking && !data.schedule[picking] ? 'border-brand-500 bg-brand-500/5' : 'border-zinc-200 dark:border-white/10')}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 dark:bg-white/5"><Moon className="h-5 w-5" /></span>
              <span className="flex-1"><span className="block font-bold">Rest day</span><span className="block text-xs text-zinc-500">Recovery, sleep, light walking</span></span>
              {picking && !data.schedule[picking] && <Check className="h-5 w-5 text-brand-500" />}
            </button>
          </li>
          {data.plans.map((p) => {
            const active = picking ? data.schedule[picking]?._id === p._id : false;
            return (
              <li key={p._id}>
                <button onClick={() => picking && assign(picking, p._id)} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left', active ? 'border-brand-500 bg-brand-500/5' : 'border-zinc-200 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5')}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400"><Zap className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span><span className="block text-xs text-zinc-500">{p.focus ? `${p.focus} · ` : ''}{p.exercises.length} exercises · ~{p.estimatedMinutes || 45} min</span></span>
                  {active && <Check className="h-5 w-5 shrink-0 text-brand-500" />}
                </button>
              </li>
            );
          })}
          {(templates.data?.filter((t) => !data.plans.some((p) => p._id === t._id)).length ?? 0) > 0 && (
            <li className="pt-2"><p className="label">Templates <span className="font-normal normal-case text-zinc-400">(copied to your plans when picked)</span></p></li>
          )}
          {templates.data?.filter((t) => !data.plans.some((p) => p._id === t._id)).map((p) => (
            <li key={p._id}>
              <button onClick={() => picking && useTemplate.mutate({ day: picking, id: p._id })} disabled={useTemplate.isPending} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-3 text-left hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400"><Sparkles className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span><span className="block text-xs text-zinc-500">{p.focus ? `${p.focus} · ` : ''}{p.exercises.length} exercises · ~{p.estimatedMinutes || 45} min</span></span>
              </button>
            </li>
          ))}
          {!data.plans.length && !templates.data?.length && <li className="py-3 text-center text-sm text-zinc-500">No plans yet - create one in the Planner.</li>}
        </ul>
      </Modal>
    </div>
  );
}
