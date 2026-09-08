import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus, Sparkles, Play, Copy, Trash2, Pencil, Clock, CalendarDays } from 'lucide-react';
import PlanNav from '@/components/PlanNav';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutPlan } from '@/types';
import { PageHeader, Empty, PageLoader, Modal, Select, Input, Badge, Confirm, Tabs, FadeIn } from '@/components/ui';
import { label, DAYS } from '@/lib/utils';

const FOCUS = ['full_body', 'chest', 'back', 'legs', 'shoulders', 'core', 'cardio'];

export default function Plans() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'mine' | 'templates'>('mine');
  const [gen, setGen] = useState<{ open: boolean; focus: string; minutes: string; days: string[] }>({ open: false, focus: 'full_body', minutes: '60', days: [] });
  const [del, setDel] = useState<string | null>(null);

  const mine = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/plans')).data.items as WorkoutPlan[] });
  const templates = useQuery({ queryKey: ['plans', 'templates'], queryFn: async () => (await api.get('/plans?templates=true')).data.items as WorkoutPlan[] });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['plans'] }); qc.invalidateQueries({ queryKey: ['schedule'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const generate = useMutation({
    mutationFn: () => api.post('/plans/generate', { focus: gen.focus, minutes: Number(gen.minutes), save: true, scheduledDays: gen.days }),
    onSuccess: (r) => { toast.success(r.data.item.generatedByAI ? 'AI plan generated' : 'Plan generated (rule-based)'); setGen({ ...gen, open: false }); invalidate(); nav(`/plans/${r.data.item._id}`); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const duplicate = useMutation({ mutationFn: (id: string) => api.post(`/plans/${id}/duplicate`), onSuccess: (r) => { toast.success('Copied to your plans'); invalidate(); setTab('mine'); nav(`/plans/${r.data.item._id}`); }, onError: (e) => toast.error(errMsg(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/plans/${id}`), onSuccess: () => { toast.success('Plan deleted'); invalidate(); }, onError: (e) => toast.error(errMsg(e)) });

  const list = tab === 'mine' ? mine.data : templates.data;
  const loading = tab === 'mine' ? mine.isLoading : templates.isLoading;

  return (
    <div>
      <PageHeader title="Workout Planner" subtitle="Build your own plans, use templates, or let the AI coach generate one." icon={<Dumbbell className="h-6 w-6" />}
        actions={<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto"><button className="btn-secondary" onClick={() => setGen({ ...gen, open: true })}><Sparkles className="h-4 w-4 shrink-0 text-brand-500" /> AI generate</button><Link to="/plans/new" className="btn-primary"><Plus className="h-4 w-4 shrink-0" /> New plan</Link></div>} />
      <PlanNav />
      <Tabs className="mb-4" tabs={[{ value: 'mine', label: `My plans (${mine.data?.length ?? 0})` }, { value: 'templates', label: 'Templates' }]} value={tab} onChange={setTab} />

      {loading ? <PageLoader /> : !list?.length ? (
        <Empty icon={<Dumbbell className="h-10 w-10" />} title={tab === 'mine' ? 'No plans yet' : 'No templates'} hint="Generate a plan with AI or copy a template to get started."
          action={<button className="btn-primary" onClick={() => setGen({ ...gen, open: true })}><Sparkles className="h-4 w-4" /> Generate with AI</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => (
            <FadeIn key={p._id} delay={i * 0.04}>
              <div className="card flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{p.name}</h3>
                    <p className="text-sm text-slate-500">{p.focus || label(p.muscleGroups[0])}</p>
                  </div>
                  {p.generatedByAI && <Badge color="violet"><Sparkles className="h-3 w-3" /> AI</Badge>}
                  {p.isPublic && <Badge color="slate">Template</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.muscleGroups.slice(0, 4).map((m) => <Badge key={m} color="brand">{label(m)}</Badge>)}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {p.exercises.slice(0, 4).map((e) => <li key={e._id || e.exerciseName} className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">{e.exerciseName}</span><span className="shrink-0 text-slate-400">{e.type === 'cardio' ? `${e.duration} min` : `${e.sets}×${e.reps}`}</span></li>)}
                  {p.exercises.length > 4 && <li className="text-xs text-slate-400">+{p.exercises.length - 4} more</li>}
                </ul>
                <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{p.estimatedMinutes || 45} min</span>
                  {p.scheduledDays.length > 0 && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {p.scheduledDays.map((d) => d.slice(0, 3)).join(', ')}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary flex-1" onClick={() => nav('/session', { state: { planId: p._id } })}><Play className="h-4 w-4" /> Start</button>
                  {tab === 'mine' ? (
                    <>
                      <Link to={`/plans/${p._id}`} className="btn-secondary px-3" aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
                      <button className="btn-secondary px-3" onClick={() => duplicate.mutate(p._id)} aria-label="Duplicate"><Copy className="h-4 w-4" /></button>
                      <button className="btn-secondary px-3 text-rose-500" onClick={() => setDel(p._id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </>
                  ) : <button className="btn-secondary" onClick={() => duplicate.mutate(p._id)}><Copy className="h-4 w-4" /> Use</button>}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      <Modal open={gen.open} onClose={() => setGen({ ...gen, open: false })} title="Generate a workout plan">
        <p className="mb-4 text-sm text-slate-500">The coach builds a plan from your profile, experience level and training history using the equipment library.</p>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Focus" options={FOCUS.map((f) => ({ value: f, label: label(f) }))} value={gen.focus} onChange={(e) => setGen({ ...gen, focus: e.target.value })} />
          <Input label="Duration (min)" type="number" min={15} max={180} value={gen.minutes} onChange={(e) => setGen({ ...gen, minutes: e.target.value })} />
        </div>
        <p className="label mt-4">Schedule on</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => <button key={d} type="button" onClick={() => setGen({ ...gen, days: gen.days.includes(d) ? gen.days.filter((x) => x !== d) : [...gen.days, d] })} className={`chip border ${gen.days.includes(d) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-white/10'}`}>{d.slice(0, 3)}</button>)}
        </div>
        <button className="btn-primary mt-5 w-full" disabled={generate.isPending} onClick={() => generate.mutate()}><Sparkles className="h-4 w-4" /> {generate.isPending ? 'Generating…' : 'Generate plan'}</button>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} title="Delete this plan?" message="It will be removed from your schedule too." danger />
    </div>
  );
}
