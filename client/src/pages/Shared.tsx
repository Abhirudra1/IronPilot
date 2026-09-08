import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Timer, Dumbbell } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutSession } from '@/types';
import { PageLoader, Badge } from '@/components/ui';
import { fmtDuration, fmtDateTime, label } from '@/lib/utils';

export default function Shared() {
  const { code } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ['shared', code], queryFn: async () => (await api.get(`/sessions/shared/${code}`)).data.item as WorkoutSession });
  if (isLoading) return <PageLoader />;
  if (isError || !data) return <div className="p-10 text-center"><p className="font-semibold">This shared workout could not be found.</p><Link to="/" className="btn-primary mt-4">Go to IronPilot</Link></div>;
  const name = typeof data.user === 'object' ? data.user.fullName : 'An IronPilot user';
  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-4 flex items-center gap-2"><img src="/icons/icon.svg" alt="" className="h-8 w-8" /><span className="font-black">Iron<span className="text-brand-500">Pilot</span></span></div>
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-500 to-violet-600 p-6 text-white">
          <p className="text-sm text-white/80">{name} completed</p>
          <h1 className="text-2xl font-extrabold">{data.focus || data.planName}</h1>
          <p className="text-sm text-white/80">{fmtDateTime(data.startedAt)}</p>
          <div className="mt-4 flex gap-4 text-sm"><span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {fmtDuration(data.durationSeconds)}</span><span className="flex items-center gap-1"><Flame className="h-4 w-4" /> {data.totalCalories} kcal</span><span className="flex items-center gap-1"><Dumbbell className="h-4 w-4" /> {Math.round(data.totalVolume)} kg</span></div>
        </div>
        <ul className="divide-y divide-slate-100 p-5 text-sm dark:divide-white/5">
          {data.exercises.filter((e) => e.status === 'completed').map((e) => <li key={e._id} className="flex items-center justify-between py-2"><div><p className="font-semibold">{e.exerciseName}</p>{e.muscleGroup && <Badge color="brand">{label(e.muscleGroup)}</Badge>}</div><span className="text-slate-500">{e.type === 'cardio' ? fmtDuration(e.durationSeconds || 0) : e.sets.filter((s) => s.completed).map((s) => `${s.reps}×${s.weight}`).join(', ')}</span></li>)}
        </ul>
      </div>
      <Link to="/register" className="btn-primary mt-4 w-full">Start your own journey</Link>
    </div>
  );
}
