import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Heart, ExternalLink, Dumbbell } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import type { Exercise, Equipment } from '@/types';
import { PageHeader, Select, Badge, Modal, Empty } from '@/components/ui';
import { ExerciseGridSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { label, MUSCLES, MUSCLE_COLORS, cn } from '@/lib/utils';

export default function Exercises() {
  const { user, setUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Exercise | null>(null);
  const muscle = params.get('muscle') || '';
  const equipment = params.get('equipment') || '';
  const onlyFav = params.get('favorites') === 'true';

  const exercises = useQuery({ queryKey: ['exercises'], queryFn: async () => (await api.get('/library/exercises')).data.items as Exercise[], staleTime: 10 * 60_000 });
  const equipmentList = useQuery({ queryKey: ['equipment'], queryFn: async () => (await api.get('/library/equipment')).data.items as Equipment[], staleTime: 10 * 60_000 });
  const fav = useMutation({ mutationFn: (id: string) => api.post(`/users/favorites/${id}`), onSuccess: (r) => { if (user) setUser({ ...user, favoriteExercises: r.data.favorites }); }, onError: (e) => toast.error(errMsg(e)) });

  const favSet = new Set(user?.favoriteExercises || []);
  const list = useMemo(() => (exercises.data || []).filter((e) => (!muscle || e.primaryMuscle === muscle) && (!equipment || e.equipmentSlug === equipment) && (!onlyFav || favSet.has(e._id)) && (!q || e.name.toLowerCase().includes(q.toLowerCase()))), [exercises.data, muscle, equipment, onlyFav, q, favSet]);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  return (
    <div>
      <PageHeader title="Exercise Library" subtitle="Filter by muscle group or equipment, favourite the ones you love." icon={<Dumbbell className="h-6 w-6" />} />
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" /></div>
        <Select options={[{ value: '', label: 'All muscles' }, ...MUSCLES.map((m) => ({ value: m, label: label(m) }))]} value={muscle} onChange={(e) => set('muscle', e.target.value)} />
        <Select options={[{ value: '', label: 'All equipment' }, ...(equipmentList.data || []).map((e) => ({ value: e.slug, label: e.name }))]} value={equipment} onChange={(e) => set('equipment', e.target.value)} />
      </div>
      <button onClick={() => set('favorites', onlyFav ? '' : 'true')} className={cn('chip mb-4 border', onlyFav ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 dark:border-white/10')}><Heart className="h-3.5 w-3.5" /> Favourites ({favSet.size})</button>

      {exercises.isLoading ? <ExerciseGridSkeleton /> : !list.length ? <Empty title="No exercises match" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <div key={e._id} className={cn('card flex items-start gap-3 p-4', params.get('highlight') === e.slug && 'ring-2 ring-brand-500')}>
              <div className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: MUSCLE_COLORS[e.primaryMuscle] || '#0ea5e9' }} />
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(e)}>
                <p className="font-bold">{e.name}</p>
                <p className="text-xs text-slate-500">{e.equipment?.name || 'Bodyweight'} · {e.difficulty}</p>
                <div className="mt-1.5 flex flex-wrap gap-1"><Badge color="brand">{label(e.primaryMuscle)}</Badge>{e.secondaryMuscles.slice(0, 2).map((m) => <Badge key={m} color="slate">{label(m)}</Badge>)}</div>
              </button>
              <button onClick={() => fav.mutate(e._id)} className="btn-ghost p-1.5" aria-label={favSet.has(e._id) ? 'Remove favourite' : 'Add favourite'} aria-pressed={favSet.has(e._id)}><Heart className={cn('h-5 w-5', favSet.has(e._id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400')} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open && (
          <div className="space-y-3 text-sm">
            <ExerciseAnimation exercise={open} />
            <div className="flex flex-wrap gap-1.5"><Badge color="brand">{label(open.primaryMuscle)}</Badge><Badge color="slate">{open.equipment?.name || 'Bodyweight'}</Badge><Badge color="amber">{open.difficulty}</Badge><Badge color="violet">{open.type === 'cardio' ? `${open.defaultDuration} min` : `${open.defaultSets} × ${open.defaultReps}`}</Badge></div>
            <div><p className="label">Instructions</p><ol className="list-decimal space-y-1 pl-5">{open.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
            {open.tips.length > 0 && <div><p className="label">Tips</p><ul className="space-y-1">{open.tips.map((s, i) => <li key={i}>💡 {s}</li>)}</ul></div>}
            {open.videoUrl && <a href={open.videoUrl} target="_blank" rel="noreferrer" className="btn-secondary"><ExternalLink className="h-4 w-4" /> Video demonstration</a>}
          </div>
        )}
      </Modal>
    </div>
  );
}
