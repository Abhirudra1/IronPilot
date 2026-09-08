import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Utensils, Droplets, Plus, Trash2, Sparkles, CheckCircle2, RefreshCw, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import MealForm from '@/components/MealForm';
import type { Meal, WaterLog, DietPlan, MealSuggestions } from '@/types';
import { PageHeader, PageLoader, Tabs, Modal, Input, Select, Bar, ProgressRing, Badge, FadeIn, Textarea } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { label, fmtDate, todayISO } from '@/lib/utils';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const PLAN_TYPES = ['muscle_gain', 'weight_loss', 'fat_loss', 'vegetarian', 'high_protein', 'indian', 'keto', 'body_recomposition'];

export default function Nutrition() {
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<'meals' | 'water' | 'diet'>('meals');
  const [date, setDate] = useState(todayISO());
  const [mealOpen, setMealOpen] = useState<string | null>(null);
  const [gen, setGen] = useState<{ open: boolean; planType: string; notes: string }>({ open: false, planType: user?.fitnessGoal || 'general_fitness', notes: '' });

  const meals = useQuery({ queryKey: ['meals', date], queryFn: async () => (await api.get('/tracking/meals', { params: { date } })).data as { items: Meal[]; byType: Record<string, Meal[]>; totals: Record<string, number>; targets: Record<string, number>; remaining: Record<string, number> } });
  const water = useQuery({ queryKey: ['water', date], queryFn: async () => (await api.get('/tracking/water', { params: { date } })).data as { logs: WaterLog[]; totalMl: number; goalMl: number; remainingMl: number; week: { date: string; ml: number }[] } });
  const diet = useQuery({ queryKey: ['diet'], queryFn: async () => (await api.get('/tracking/diet')).data as { items: DietPlan[]; templates: DietPlan[]; active: DietPlan | null }, enabled: tab === 'diet' });
  const inv = () => { qc.invalidateQueries({ queryKey: ['meals'] }); qc.invalidateQueries({ queryKey: ['water'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };
  const delMeal = useMutation({ mutationFn: (id: string) => api.delete(`/tracking/meals/${id}`), onSuccess: inv, onError: (e) => toast.error(errMsg(e)) });
  const addWater = useMutation({ mutationFn: (ml: number) => api.post('/tracking/water', { amountMl: ml, date: date === todayISO() ? undefined : new Date(`${date}T12:00:00`).toISOString() }), onSuccess: (r) => { const id = r.data.item._id as string; toast((tt) => <span className="flex items-center gap-3">{r.data.remainingMl} ml remaining<button className="font-bold text-brand-600 underline dark:text-brand-400" onClick={() => { delWater.mutate(id); toast.dismiss(tt.id); }}>Undo</button></span>, { icon: '💧', duration: 6000 }); inv(); }, onError: (e) => toast.error(errMsg(e)) });
  const delWater = useMutation({ mutationFn: (id: string) => api.delete(`/tracking/water/${id}`), onSuccess: () => { toast.success('Water entry removed'); inv(); }, onError: (e) => toast.error(errMsg(e)) });
  const sugg = useQuery({ queryKey: ['meal-suggestions', date], queryFn: async () => (await api.get('/ai/meal-suggestions', { params: { date } })).data as MealSuggestions, enabled: tab === 'meals', staleTime: 5 * 60_000 });
  const logSuggestion = useMutation({ mutationFn: (x: { name: string; calories: number; protein: number; carbs: number; fat: number; items: string[] }) => api.post('/tracking/meals', { type: sugg.data?.nextMeal || 'snack', name: x.name, quantity: x.items.join(', ').slice(0, 60) || undefined, calories: x.calories, protein: x.protein, carbs: x.carbs, fat: x.fat, date: date === todayISO() ? undefined : new Date(`${date}T12:00:00`).toISOString() }), onSuccess: () => { toast.success('Logged from suggestion'); inv(); qc.invalidateQueries({ queryKey: ['meal-suggestions'] }); }, onError: (e) => toast.error(errMsg(e)) });
  const genDiet = useMutation({ mutationFn: () => api.post('/tracking/diet/generate', { planType: gen.planType, notes: gen.notes, save: true }), onSuccess: (r) => { toast.success(r.data.item.generatedByAI ? 'AI diet plan ready' : 'Diet plan created (rule-based)'); setGen({ ...gen, open: false }); qc.invalidateQueries({ queryKey: ['diet'] }); }, onError: (e) => toast.error(errMsg(e)) });
  const activate = useMutation({ mutationFn: (id: string) => api.post(`/tracking/diet/${id}/activate`), onSuccess: () => { toast.success('Plan activated and targets updated'); qc.invalidateQueries({ queryKey: ['diet'] }); inv(); void refresh(); }, onError: (e) => toast.error(errMsg(e)) });

  const m = meals.data; const w = water.data;
  const macro = (k: string, color: string) => m && (
    <div><div className="flex justify-between text-xs"><span className="font-semibold">{label(k)}</span><span className="text-slate-500">{Math.round(m.totals[k])} / {m.targets[k]}{k === 'calories' ? ' kcal' : ' g'} · {Math.round(m.remaining[k])} left</span></div><Bar value={m.totals[k]} max={m.targets[k]} color={color} className="mt-1" /></div>
  );

  return (
    <div>
      <PageHeader title="Nutrition" subtitle="Meals, macros, hydration and your AI diet plan." icon={<Utensils className="h-6 w-6" />} actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />} />
      <Tabs className="mb-4" tabs={[{ value: 'meals', label: 'Meals' }, { value: 'water', label: 'Water' }, { value: 'diet', label: 'AI Diet Planner' }]} value={tab} onChange={setTab} />

      {tab === 'meals' && (meals.isLoading || !m ? <PageLoader /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
          <FadeIn>
            <div className="card p-5">
              <div className="flex items-center gap-4">
                <ProgressRing value={(m.totals.calories / m.targets.calories) * 100} size={110} color="#f97316"><div><p className="text-lg font-bold">{Math.round(m.totals.calories)}</p><p className="text-[10px] text-slate-500">/ {m.targets.calories} kcal</p></div></ProgressRing>
                <div><p className="text-sm font-semibold">Remaining today</p><p className="text-2xl font-extrabold text-orange-500">{Math.round(m.remaining.calories)} kcal</p></div>
              </div>
              <div className="mt-4 space-y-3">{macro('protein', 'bg-rose-500')}{macro('carbs', 'bg-amber-500')}{macro('fat', 'bg-violet-500')}</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400"><Bot className="h-3.5 w-3.5" /> What to eat next{sugg.data ? ` · ${label(sugg.data.nextMeal)}` : ''}</p>
                <button className="btn-ghost h-8 w-8 p-0" onClick={() => qc.invalidateQueries({ queryKey: ['meal-suggestions'] })} aria-label="Refresh suggestions"><RefreshCw className={`h-4 w-4 ${sugg.isFetching ? 'animate-spin' : ''}`} /></button>
              </div>
              {sugg.isLoading ? <p className="mt-3 text-sm text-slate-500">Thinking about your remaining targets…</p> : sugg.data ? (
                <>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{sugg.data.note}{sugg.data.planName ? ` Following your plan: ${sugg.data.planName}.` : ''}</p>
                  {sugg.data.planMeal && <p className="mt-1 text-xs text-slate-500">Plan suggests: <strong>{sugg.data.planMeal.name}</strong> ({sugg.data.planMeal.calories} kcal · {sugg.data.planMeal.protein} g protein)</p>}
                  <ul className="mt-3 space-y-2">
                    {sugg.data.suggestions.map((x, i) => (
                      <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                        <div className="flex items-start justify-between gap-2"><p className="font-bold">{x.name}</p><button className="btn-secondary min-h-8 shrink-0 px-2.5 py-1 text-xs" onClick={() => logSuggestion.mutate(x)} disabled={logSuggestion.isPending}><Plus className="h-3.5 w-3.5" /> Log</button></div>
                        {x.description && <p className="mt-0.5 text-xs text-slate-500">{x.description}</p>}
                        {x.items.length > 0 && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{x.items.join(' · ')}</p>}
                        <p className="mt-1 text-xs font-semibold text-orange-500">{x.calories} kcal <span className="text-rose-500">· P {x.protein} g</span> <span className="text-amber-500">· C {x.carbs} g</span> <span className="text-violet-500">· F {x.fat} g</span></p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-400">{sugg.data.source === 'gemini' ? "Personalised by IronPilot AI from today's intake, your goal and diet preference." : 'Built from the food library for your remaining targets.'}</p>
                </>
              ) : null}
            </div>
          </FadeIn>
          </div>
          <div className="space-y-3 lg:col-span-2">
            {MEAL_TYPES.map((t, i) => (
              <FadeIn key={t} delay={i * 0.05}>
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{label(t)} <span className="text-xs font-normal text-slate-500">{Math.round(m.byType[t].reduce((a, x) => a + x.calories, 0))} kcal</span></p>
                    <button className="btn-secondary px-3 py-1.5" onClick={() => setMealOpen(t)}><Plus className="h-4 w-4" /> Add</button>
                  </div>
                  {m.byType[t].length > 0 && <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-white/5">{m.byType[t].map((x) => <li key={x._id} className="flex items-center justify-between py-1.5"><div><p className="font-medium">{x.name}{x.quantity ? <span className="text-slate-500"> · {x.quantity}</span> : ''}</p><p className="text-xs text-slate-500">{x.calories} kcal · P {x.protein}g · C {x.carbs}g · F {x.fat}g</p></div><button className="btn-ghost p-1 text-rose-500" onClick={() => delMeal.mutate(x._id)} aria-label="Delete meal"><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      ))}

      {tab === 'water' && (water.isLoading || !w ? <PageLoader /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <FadeIn>
            <div className="card flex flex-col items-center p-6 text-center">
              <ProgressRing value={(w.totalMl / w.goalMl) * 100} size={170} stroke={14} color="#38bdf8"><div><Droplets className="mx-auto h-6 w-6 text-sky-400" /><p className="text-3xl font-extrabold">{(w.totalMl / 1000).toFixed(2)} L</p><p className="text-xs text-slate-500">of {(w.goalMl / 1000).toFixed(1)} L</p></div></ProgressRing>
              <p className="mt-3 font-semibold">{w.remainingMl > 0 ? `${w.remainingMl} ml remaining` : '🎉 Daily goal reached!'}</p>
              <div className="mt-4 grid grid-cols-4 gap-2">{[150, 250, 500, 750].map((ml) => <button key={ml} className="btn-secondary" onClick={() => addWater.mutate(ml)}>+{ml}</button>)}</div>
              <p className="mt-3 text-xs text-slate-500">Reminders every {user?.preferences.reminderTimes.water} min are enabled in Settings.</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="card p-5">
              <h2 className="mb-3 font-bold">Last 7 days</h2>
              <div className="h-44"><ResponsiveContainer><BarChart data={w.week}><XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, { weekday: 'short' })} tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis hide /><Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: '#111a2e', color: '#fff' }} /><ReferenceLine y={w.goalMl} stroke="#84cc16" strokeDasharray="4 4" /><RBar dataKey="ml" fill="#38bdf8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <ul className="mt-3 max-h-40 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-white/5">{w.logs.map((l) => <li key={l._id} className="flex items-center justify-between py-1.5"><span>{new Date(l.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {l.amountMl} ml</span><button className="btn-ghost p-1 text-rose-500" onClick={() => delWater.mutate(l._id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
            </div>
          </FadeIn>
        </div>
      ))}

      {tab === 'diet' && (diet.isLoading || !diet.data ? <PageLoader /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">Plans are personalised using your goal, weight, height, age, activity, calories burned, workout intensity and dietary preference.</p>
            <button className="btn-primary" onClick={() => setGen({ ...gen, open: true })}><Sparkles className="h-4 w-4" /> Generate with AI</button>
          </div>
          {diet.data.active ? <DietCard plan={diet.data.active} active /> : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">No active diet plan. Generate one or activate a template.</div>}
          <h2 className="font-bold">Templates</h2>
          <div className="grid gap-3 md:grid-cols-2">{diet.data.templates.map((t) => <DietCard key={t._id} plan={t} onActivate={() => activate.mutate(t._id)} compact />)}</div>
          {diet.data.items.filter((d) => !d.isActive).length > 0 && <><h2 className="font-bold">Previous plans</h2><div className="grid gap-3 md:grid-cols-2">{diet.data.items.filter((d) => !d.isActive).map((t) => <DietCard key={t._id} plan={t} onActivate={() => activate.mutate(t._id)} compact />)}</div></>}
        </div>
      ))}

      <Modal open={!!mealOpen} onClose={() => setMealOpen(null)} title={`Add ${label(mealOpen || '')}`}>{mealOpen && <MealForm type={mealOpen} date={date} onSaved={() => { setMealOpen(null); inv(); }} />}</Modal>
      <Modal open={gen.open} onClose={() => setGen({ ...gen, open: false })} title="Generate diet plan">
        <Select label="Plan type" options={PLAN_TYPES.map((p) => ({ value: p, label: label(p) }))} value={gen.planType} onChange={(e) => setGen({ ...gen, planType: e.target.value })} />
        <Textarea className="mt-3" label="Notes for the coach" placeholder="e.g. no dairy, budget-friendly, I train in the evening" value={gen.notes} onChange={(e) => setGen({ ...gen, notes: e.target.value })} />
        <button className="btn-primary mt-4 w-full" disabled={genDiet.isPending} onClick={() => genDiet.mutate()}><Sparkles className="h-4 w-4" /> {genDiet.isPending ? 'Generating…' : 'Generate'}</button>
      </Modal>
    </div>
  );
}

function DietCard({ plan, active, compact, onActivate }: { plan: DietPlan; active?: boolean; compact?: boolean; onActivate?: () => void }) {
  const [open, setOpen] = useState(!compact);
  return (
    <div className={`card p-5 ${active ? 'ring-2 ring-accent-500' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="font-bold">{plan.name}</h3><p className="text-xs text-slate-500">{label(plan.planType)}{plan.generatedByAI ? ' · AI generated' : plan.isTemplate ? ' · template' : ''} · {fmtDate(plan.createdAt)}</p></div>
        {active ? <Badge color="green"><CheckCircle2 className="h-3 w-3" /> Active</Badge> : onActivate && <button className="btn-secondary px-3 py-1.5" onClick={onActivate}>Activate</button>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-lg bg-orange-500/10 p-2"><p className="text-lg font-bold text-orange-500">{plan.dailyCalories}</p>kcal</div>
        <div className="rounded-lg bg-rose-500/10 p-2"><p className="text-lg font-bold text-rose-500">{plan.proteinTarget}g</p>protein</div>
        <div className="rounded-lg bg-amber-500/10 p-2"><p className="text-lg font-bold text-amber-500">{plan.carbTarget}g</p>carbs</div>
        <div className="rounded-lg bg-violet-500/10 p-2"><p className="text-lg font-bold text-violet-500">{plan.fatTarget}g</p>fat</div>
      </div>
      {compact && <button className="mt-2 text-xs font-semibold text-brand-500" onClick={() => setOpen(!open)}>{open ? 'Hide meals' : 'Show meals'}</button>}
      {open && (
        <div className="mt-3 space-y-2">
          {plan.meals.map((m, i) => <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5"><div className="flex justify-between"><p className="font-semibold">{label(m.type)}: {m.name}</p><span className="text-xs text-slate-500">{m.calories} kcal · P{m.protein} C{m.carbs} F{m.fat}</span></div>{m.description && <p className="text-xs text-slate-500">{m.description}</p>}{m.items?.length > 0 && <p className="mt-1 text-xs">{m.items.join(' · ')}</p>}</div>)}
          {plan.tips?.length > 0 && <ul className="text-xs text-slate-600 dark:text-slate-300">{plan.tips.map((t, i) => <li key={i}>💡 {t}</li>)}</ul>}
          {plan.rationale && <p className="text-xs italic text-slate-500">{plan.rationale}</p>}
        </div>
      )}
    </div>
  );
}
