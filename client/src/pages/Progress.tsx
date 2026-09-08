import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { TrendingUp, Plus, Trash2, Scale, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WeightEntry } from '@/types';
import { PageHeader, PageLoader, Tabs, Modal, Input, Stat, Empty, FadeIn } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { fmtDate, bmiCategory, todayISO } from '@/lib/utils';

type Range = 'daily' | 'weekly' | 'monthly';
interface Resp { items: WeightEntry[]; series: { date: string; weight: number; bmi: number }[]; startWeight: number; targetWeight?: number; currentWeight: number; height: number }
const MEASURES = ['waist', 'chest', 'hips', 'arms', 'thighs'] as const;

export default function Progress() {
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  const [range, setRange] = useState<Range>('daily');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ weight: '', bodyFat: '', date: todayISO(), chest: '', waist: '', hips: '', arms: '', thighs: '', notes: '' });

  const { data, isLoading } = useQuery({ queryKey: ['weight', range], queryFn: async () => (await api.get('/tracking/weight', { params: { range } })).data as Resp });
  const inv = () => { qc.invalidateQueries({ queryKey: ['weight'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); void refresh(); };
  const add = useMutation({
    mutationFn: () => api.post('/tracking/weight', { weight: Number(f.weight), bodyFat: f.bodyFat ? Number(f.bodyFat) : undefined, date: new Date(`${f.date}T08:00:00`).toISOString(), notes: f.notes || undefined,
      measurements: Object.fromEntries(MEASURES.filter((k) => f[k]).map((k) => [k, Number(f[k])])) }),
    onSuccess: (r) => {
      const id = r.data.item?._id as string | undefined;
      toast((t) => <span className="flex items-center gap-3">Weight logged{id && <button className="font-bold text-brand-600 underline" onClick={() => { del.mutate(id); toast.dismiss(t.id); }}>Undo</button>}</span>, { icon: '⚖️', duration: 6000 });
      setOpen(false); setF({ ...f, weight: '', notes: '' }); inv(); if (r.data.newAchievements?.length) toast(`🏅 ${r.data.newAchievements[0].title}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/tracking/weight/${id}`), onSuccess: () => { toast.success('Entry removed'); inv(); }, onError: (e) => toast.error(errMsg(e)) });

  if (isLoading || !data) return <PageLoader />;
  const change = data.items.length > 1 ? Math.round((data.items[data.items.length - 1].weight - data.items[0].weight) * 10) / 10 : 0;
  const bmi = data.height ? Math.round((data.currentWeight / ((data.height / 100) ** 2)) * 10) / 10 : null;
  const latestMeasure = [...data.items].reverse().find((w) => w.measurements && Object.keys(w.measurements).length);
  const firstMeasure = data.items.find((w) => w.measurements && Object.keys(w.measurements).length);

  return (
    <div>
      <PageHeader title="Progress" subtitle="Weight trend, BMI and body measurements." icon={<TrendingUp className="h-6 w-6" />} actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Log weight</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Current" value={`${data.currentWeight} kg`} icon={<Scale className="h-5 w-5" />} />
        <Stat label="Target" value={data.targetWeight ? `${data.targetWeight} kg` : '-'} sub={data.targetWeight ? `${Math.abs(Math.round((data.currentWeight - data.targetWeight) * 10) / 10)} kg to go` : 'Set in profile'} accent="emerald" />
        <Stat label="Change (range)" value={`${change > 0 ? '+' : ''}${change} kg`} accent={change <= 0 ? 'emerald' : 'rose'} />
        <Stat label="BMI" value={bmi ?? '-'} sub={bmiCategory(bmi)} accent="violet" />
      </div>

      <FadeIn>
        <div className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Weight trend</h2><Tabs tabs={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} value={range} onChange={setRange} /></div>
          {data.series.length < 2 ? <Empty title="Log at least two weigh-ins to see a trend" /> : (
            <div className="h-64">
              <ResponsiveContainer><LineChart data={data.series} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-white/10" />
                <XAxis dataKey="date" tickFormatter={(d) => (range === 'monthly' ? d : fmtDate(d))} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: '#111a2e', color: '#fff' }} />
                {data.targetWeight && <ReferenceLine y={data.targetWeight} stroke="#9ad82f" strokeDasharray="4 4" label={{ value: 'Target', fill: '#9ad82f', fontSize: 11 }} />}
                <Line type="monotone" dataKey="weight" stroke="#5a9e0c" strokeWidth={3} dot={{ r: 3 }} name="Weight (kg)" />
                <Line type="monotone" dataKey="bmi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="BMI" yAxisId={0} hide={range === 'daily' && data.series.length > 40} />
              </LineChart></ResponsiveContainer>
            </div>
          )}
        </div>
      </FadeIn>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.05}>
          <div className="card p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Ruler className="h-4 w-4 text-brand-500" /> Measurements</h2>
            {latestMeasure ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEASURES.filter((k) => latestMeasure.measurements?.[k]).map((k) => {
                  const now = latestMeasure.measurements![k]; const first = firstMeasure?.measurements?.[k]; const diff = first !== undefined && firstMeasure !== latestMeasure ? Math.round((now - first) * 10) / 10 : null;
                  return <div key={k} className="rounded-xl bg-zinc-50 p-3 dark:bg-white/5"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{k}</p><p className="text-lg font-extrabold">{now} cm</p>{diff !== null && <p className={`text-xs ${diff <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{diff > 0 ? '+' : ''}{diff} cm since {fmtDate(firstMeasure!.date)}</p>}</div>;
                })}
              </div>
            ) : <Empty title="No measurements yet" hint="Add waist, chest, hips, arms or thighs when you log your weight." />}
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="card p-4 sm:p-5">
            <h2 className="mb-3 font-bold">Recent entries</h2>
            <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto text-sm dark:divide-white/5">
              {[...data.items].reverse().map((w) => (
                <li key={w._id} className="flex items-center justify-between py-2">
                  <div><p className="font-semibold">{w.weight} kg{w.bodyFat ? ` · ${w.bodyFat}% BF` : ''}</p><p className="text-xs text-zinc-500">{fmtDate(w.date, { day: 'numeric', month: 'short', year: 'numeric' })}{w.measurements?.waist ? ` · waist ${w.measurements.waist} cm` : ''}{w.notes ? ` · ${w.notes}` : ''}</p></div>
                  <button className="btn-ghost h-9 w-9 p-0 text-rose-500" onClick={() => del.mutate(w._id)} aria-label="Delete entry"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
              {!data.items.length && <li className="py-4 text-center text-zinc-500">No entries in this range.</li>}
            </ul>
          </div>
        </FadeIn>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Log weight & measurements">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Weight (kg)" type="number" step="0.1" required value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} autoFocus />
          <Input label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <Input label="Body fat %" type="number" step="0.1" value={f.bodyFat} onChange={(e) => setF({ ...f, bodyFat: e.target.value })} hint="Optional" />
          <Input label="Waist (cm)" type="number" value={f.waist} onChange={(e) => setF({ ...f, waist: e.target.value })} />
          <Input label="Chest (cm)" type="number" value={f.chest} onChange={(e) => setF({ ...f, chest: e.target.value })} />
          <Input label="Hips (cm)" type="number" value={f.hips} onChange={(e) => setF({ ...f, hips: e.target.value })} />
          <Input label="Arms (cm)" type="number" value={f.arms} onChange={(e) => setF({ ...f, arms: e.target.value })} />
          <Input label="Thighs (cm)" type="number" value={f.thighs} onChange={(e) => setF({ ...f, thighs: e.target.value })} />
          <Input className="col-span-2" label="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" />
        </div>
        <button className="btn-primary mt-4 w-full" disabled={!f.weight || add.isPending} onClick={() => add.mutate()}>Save entry</button>
      </Modal>
      <p className="mt-4 text-xs text-zinc-500">Starting weight {user?.weight} kg · height {user?.height} cm.</p>
    </div>
  );
}
