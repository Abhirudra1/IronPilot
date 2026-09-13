import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { BarChart3, Download, Flame, Timer, Droplets, Footprints, Trophy, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PageHeader, Stat, Tabs, FadeIn, Bar, Empty } from '@/components/ui';
import { AnalyticsPageSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { label, fmtDate, MUSCLE_COLORS } from '@/lib/utils';

interface Overview {
  daily: { workouts: number; workoutMinutes: number; caloriesBurned: number; waterMl: number; waterGoalMl: number; steps: number; intake: Record<string, number> };
  weekly: { days: { date: string; day: string; workouts: number; minutes: number; calories: number; volume: number }[]; activeDays: number; targetDays: number; totalMinutes: number; totalCalories: number; totalVolume: number; consistencyScore: number; muscleGroups: { name: string; count: number }[] };
  monthly: { workouts: number; plannedWorkouts: number; completionRate: number; weightChange: number; goalProgress: number; strengthChange: number; progressScore: number; weeks: { label: string; workouts: number; minutes: number; calories: number }[]; weightSeries: { date: string; weight: number }[] };
  equipment: { mostUsed: { name: string; count: number }[]; leastUsed: { name: string; count: number }[]; favoriteExercise: { name: string; count: number } | null; topExercises: { name: string; count: number }[]; avgWorkoutMinutes: number; totalLogs: number };
}
const tip = { contentStyle: { borderRadius: 12, border: 'none', background: '#111a2e', color: '#fff' } };

export default function Analytics() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly' | 'equipment'>('weekly');
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: async () => (await api.get('/analytics/overview')).data as Overview });

  const exportPdf = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const line = (t: string, y: number, size = 11) => { doc.setFontSize(size); doc.text(t, 14, y); };
    line('IronPilot - Progress Report', 18, 18);
    line(`${user?.fullName} · ${new Date().toLocaleDateString()}`, 26);
    line('Weekly', 40, 14);
    line(`Active days: ${data.weekly.activeDays}/${data.weekly.targetDays} · Consistency: ${data.weekly.consistencyScore}%`, 48);
    line(`Total time: ${data.weekly.totalMinutes} min · Calories: ${data.weekly.totalCalories} kcal · Volume: ${data.weekly.totalVolume} kg`, 55);
    line(`Muscles trained: ${data.weekly.muscleGroups.map((m) => `${label(m.name)} (${m.count})`).join(', ') || 'none'}`, 62);
    line('Monthly', 76, 14);
    line(`Workouts: ${data.monthly.workouts}/${data.monthly.plannedWorkouts} (${data.monthly.completionRate}%) · Progress score: ${data.monthly.progressScore}`, 84);
    line(`Weight change: ${data.monthly.weightChange} kg · Goal progress: ${data.monthly.goalProgress}% · Strength change: ${data.monthly.strengthChange}%`, 91);
    line('Equipment', 105, 14);
    data.equipment.mostUsed.forEach((e, i) => line(`${i + 1}. ${e.name} - ${e.count} uses`, 113 + i * 7));
    line(`Favourite exercise: ${data.equipment.favoriteExercise?.name || '-'} · Avg workout: ${data.equipment.avgWorkoutMinutes} min`, 150);
    doc.save(`ironpilot-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    void api.post('/analytics/reports', { period: 'monthly' }).catch(() => undefined);
    toast.success('PDF exported');
  };

  if (isLoading || !data) return <AnalyticsPageSkeleton />;
  const { daily: d, weekly: w, monthly: m, equipment: e } = data;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Daily, weekly and monthly insights plus equipment usage." icon={<BarChart3 className="h-6 w-6" />} actions={<button className="btn-secondary" onClick={exportPdf}><Download className="h-4 w-4" /> Export PDF</button>} />
      <Tabs className="mb-4" tabs={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'equipment', label: 'Equipment' }]} value={tab} onChange={setTab} />

      {tab === 'daily' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Workout time" value={`${d.workoutMinutes} min`} sub={`${d.workouts} sessions`} icon={<Timer className="h-5 w-5" />} />
          <Stat label="Calories burned" value={d.caloriesBurned} sub="kcal" icon={<Flame className="h-5 w-5" />} accent="orange" />
          <Stat label="Water" value={`${d.waterMl} ml`} sub={`goal ${d.waterGoalMl}`} icon={<Droplets className="h-5 w-5" />} accent="sky" />
          <Stat label="Steps (est.)" value={d.steps} sub="from cardio distance" icon={<Footprints className="h-5 w-5" />} accent="emerald" />
          <div className="card col-span-2 p-5 md:col-span-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Intake vs targets</p><div className="grid gap-3 sm:grid-cols-2">{(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => { const target = k === 'calories' ? user?.calorieTarget : k === 'protein' ? user?.proteinTarget : k === 'carbs' ? user?.carbTarget : user?.fatTarget; return <div key={k}><div className="flex justify-between text-xs"><span>{label(k)}</span><span>{Math.round(d.intake[k])} / {target}</span></div><Bar value={d.intake[k]} max={target || 1} className="mt-1" color={k === 'calories' ? 'bg-orange-500' : k === 'protein' ? 'bg-rose-500' : k === 'carbs' ? 'bg-amber-500' : 'bg-violet-500'} /></div>; })}</div></div>
        </div>
      )}

      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total time" value={`${w.totalMinutes} min`} icon={<Timer className="h-5 w-5" />} />
            <Stat label="Consistency" value={`${w.consistencyScore}%`} sub={`${w.activeDays}/${w.targetDays} days`} icon={<Target className="h-5 w-5" />} accent="emerald" />
            <Stat label="Calories" value={w.totalCalories} sub="kcal burned" icon={<Flame className="h-5 w-5" />} accent="orange" />
            <Stat label="Volume" value={`${w.totalVolume} kg`} sub="lifted" icon={<Trophy className="h-5 w-5" />} accent="violet" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <FadeIn className="lg:col-span-2"><div className="card p-5"><h2 className="mb-3 font-bold">Workout minutes & calories</h2><div className="h-64"><ResponsiveContainer><BarChart data={w.days}><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/10" /><XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" /><Tooltip {...tip} /><Legend /><RBar dataKey="minutes" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Minutes" /><RBar dataKey="calories" fill="#f97316" radius={[6, 6, 0, 0]} name="kcal" /></BarChart></ResponsiveContainer></div></div></FadeIn>
            <FadeIn delay={0.05}><div className="card p-5"><h2 className="mb-3 font-bold">Muscle groups trained</h2>{w.muscleGroups.length ? <div className="h-64"><ResponsiveContainer><PieChart><Pie data={w.muscleGroups} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>{w.muscleGroups.map((g) => <Cell key={g.name} fill={MUSCLE_COLORS[g.name] || '#0ea5e9'} />)}</Pie><Tooltip {...tip} formatter={(v, n) => [v, label(String(n))]} /></PieChart></ResponsiveContainer></div> : <Empty title="No data yet" />}<div className="mt-2 flex flex-wrap gap-1.5">{w.muscleGroups.map((g) => <span key={g.name} className="chip text-white" style={{ background: MUSCLE_COLORS[g.name] || '#0ea5e9' }}>{label(g.name)} · {g.count}</span>)}</div></div></FadeIn>
          </div>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Weight change" value={`${m.weightChange > 0 ? '+' : ''}${m.weightChange} kg`} sub="last 30 days" accent={m.weightChange <= 0 ? 'emerald' : 'rose'} />
            <Stat label="Progress score" value={m.progressScore} sub="/ 100" icon={<Trophy className="h-5 w-5" />} accent="violet" />
            <Stat label="Goal completion" value={`${m.goalProgress}%`} icon={<Target className="h-5 w-5" />} accent="emerald" />
            <Stat label="Workout completion" value={`${m.completionRate}%`} sub={`${m.workouts}/${m.plannedWorkouts} planned`} icon={<Timer className="h-5 w-5" />} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn><div className="card p-5"><h2 className="mb-3 font-bold">Weekly workouts (last 4 weeks)</h2><div className="h-60"><ResponsiveContainer><BarChart data={m.weeks}><XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" /><Tooltip {...tip} /><Legend /><RBar dataKey="workouts" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Workouts" /><RBar dataKey="minutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Minutes" /></BarChart></ResponsiveContainer></div></div></FadeIn>
            <FadeIn delay={0.05}><div className="card p-5"><h2 className="mb-3 font-bold">Weight (30 days)</h2>{m.weightSeries.length > 1 ? <div className="h-60"><ResponsiveContainer><LineChart data={m.weightSeries}><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/10" /><XAxis dataKey="date" tickFormatter={(x) => fmtDate(x)} tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} stroke="#94a3b8" /><Tooltip {...tip} /><Line type="monotone" dataKey="weight" stroke="#84cc16" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <Empty title="Log weight to see the trend" />}<p className="mt-2 text-xs text-slate-500">Strength (avg volume per exercise) changed {m.strengthChange > 0 ? '+' : ''}{m.strengthChange}% vs the previous two weeks.</p></div></FadeIn>
          </div>
        </div>
      )}

      {tab === 'equipment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Favourite exercise" value={e.favoriteExercise?.name || '-'} sub={e.favoriteExercise ? `${e.favoriteExercise.count} times` : undefined} icon={<Trophy className="h-5 w-5" />} accent="violet" />
            <Stat label="Avg workout" value={`${e.avgWorkoutMinutes} min`} icon={<Timer className="h-5 w-5" />} />
            <Stat label="Exercises logged" value={e.totalLogs} icon={<BarChart3 className="h-5 w-5" />} accent="emerald" />
          </div>
          {!e.totalLogs ? <Empty title="No equipment data yet" hint="Complete a few sessions to see what you use most." /> : (
            <div className="grid gap-4 lg:grid-cols-3">
              <FadeIn className="lg:col-span-2"><div className="card p-5"><h2 className="mb-3 font-bold">Most used equipment</h2><div className="h-64"><ResponsiveContainer><BarChart data={e.mostUsed} layout="vertical" margin={{ left: 20 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="#94a3b8" /><Tooltip {...tip} /><RBar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]} name="Uses" /></BarChart></ResponsiveContainer></div></div></FadeIn>
              <FadeIn delay={0.05}><div className="card p-5"><h2 className="mb-3 font-bold">Top equipment</h2><ol className="space-y-2">{e.mostUsed.map((x, i) => <li key={x.name} className="flex items-center gap-3 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500/10 font-bold text-brand-500">{i + 1}</span><span className="flex-1 font-medium">{x.name}</span><span className="text-slate-500">{x.count}</span></li>)}</ol><h2 className="mb-2 mt-5 font-bold">Least used</h2><ul className="space-y-1 text-sm text-slate-500">{e.leastUsed.map((x) => <li key={x.name} className="flex justify-between"><span>{x.name}</span><span>{x.count}</span></li>)}</ul></div></FadeIn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
