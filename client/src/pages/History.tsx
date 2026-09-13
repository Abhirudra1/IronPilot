import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History as HistoryIcon, Search, Flame, Timer, Trash2, Dumbbell, ChevronLeft, ChevronRight, Pencil, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { WorkoutSession, WorkoutLog } from '@/types';
import { PageHeader, Empty, Tabs, Input, Select, Badge, Modal, Confirm, Textarea } from '@/components/ui';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { fmtDuration, fmtDateTime, label, MUSCLES, cn } from '@/lib/utils';

export default function History() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'sessions' | 'logs'>('sessions');
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<WorkoutSession | null>(null);
  const [editForm, setEditForm] = useState({ planName: '', focus: '', notes: '', rating: 0 });
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const params = { search: search || undefined, muscle: muscle || undefined, from: from || undefined, to: to || undefined, page, limit: 20 };
  const sessions = useQuery({ queryKey: ['history', 'sessions', params], queryFn: async () => (await api.get('/sessions/history', { params })).data as { items: WorkoutSession[]; total: number; pages: number }, enabled: tab === 'sessions' });
  const logs = useQuery({ queryKey: ['history', 'logs', params], queryFn: async () => (await api.get('/tracking/logs', { params })).data as { items: WorkoutLog[]; total: number; pages: number }, enabled: tab === 'logs' });
  const inv = () => { qc.invalidateQueries({ queryKey: ['history'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); };
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/tracking/logs/${id}`), onSuccess: () => { toast.success('Log deleted'); inv(); }, onError: (e) => toast.error(errMsg(e)) });
  const delSession = useMutation({ mutationFn: (id: string) => api.delete(`/sessions/${id}`), onSuccess: () => { toast.success('Session deleted'); inv(); }, onError: (e) => toast.error(errMsg(e)) });
  const saveSession = useMutation({ mutationFn: () => api.patch(`/sessions/${edit!._id}`, { planName: editForm.planName || undefined, focus: editForm.focus || undefined, notes: editForm.notes, rating: editForm.rating || undefined }), onSuccess: () => { toast.success('Session updated'); setEdit(null); inv(); }, onError: (e) => toast.error(errMsg(e)) });

  const openEdit = (s: WorkoutSession) => { setEdit(s); setEditForm({ planName: s.planName, focus: s.focus || '', notes: s.notes || '', rating: s.rating || 0 }); };
  const data = tab === 'sessions' ? sessions.data : logs.data;
  const loading = tab === 'sessions' ? sessions.isLoading : logs.isLoading;

  return (
    <div>
      <PageHeader title="Workout History" subtitle="Search, edit or delete every session and exercise you've logged." icon={<HistoryIcon className="h-6 w-6" />} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        <Tabs tabs={[{ value: 'sessions', label: 'Sessions' }, { value: 'logs', label: 'Exercise logs' }]} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input className="input pl-9" placeholder="Search exercise, equipment, notes…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search history" /></div>
        {tab === 'logs' && <Select options={[{ value: '', label: 'All muscles' }, ...MUSCLES.map((m) => ({ value: m, label: label(m) }))]} value={muscle} onChange={(e) => setMuscle(e.target.value)} className="md:w-40" />}
        <div className="grid grid-cols-2 gap-2 md:contents">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="md:w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="md:w-40" />
        </div>
      </div>

      {loading ? <ListSkeleton /> : !data?.items.length ? (
        <Empty icon={<Dumbbell className="h-10 w-10" />} title="Nothing here yet" hint="Complete a session or log an exercise from the dashboard." action={<Link to="/session" className="btn-primary">Start a session</Link>} />
      ) : tab === 'sessions' ? (
        <div className="space-y-2">
          {(data.items as WorkoutSession[]).map((s) => (
            <div key={s._id} className="card flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <Link to={`/session/${s._id}/summary`} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400" aria-label="Open summary"><Dumbbell className="h-6 w-6" /></Link>
              <Link to={`/session/${s._id}/summary`} className="min-w-0 flex-1">
                <p className="truncate font-bold">{s.focus || s.planName}</p>
                <p className="text-xs text-zinc-500">{fmtDateTime(s.startedAt)} · {s.exercises.filter((e) => e.status === 'completed').length}/{s.exercises.length} exercises{s.rating ? ` · ${'★'.repeat(s.rating)}` : ''}</p>
                <div className="mt-1 flex flex-wrap gap-1">{s.muscleGroups.slice(0, 4).map((m) => <Badge key={m} color="slate">{label(m)}</Badge>)}{s.status === 'abandoned' && <Badge color="rose">Abandoned</Badge>}</div>
              </Link>
              <div className="hidden shrink-0 text-right text-sm sm:block">
                <p className="flex items-center justify-end gap-1 font-semibold"><Timer className="h-3.5 w-3.5 text-brand-500" /> {fmtDuration(s.durationSeconds)}</p>
                <p className="flex items-center justify-end gap-1 text-orange-500"><Flame className="h-3.5 w-3.5" /> {s.totalCalories} kcal</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button className="btn-ghost h-9 w-9 p-0" onClick={() => openEdit(s)} aria-label="Edit session"><Pencil className="h-4 w-4" /></button>
                <button className="btn-ghost h-9 w-9 p-0 text-rose-500" onClick={() => setConfirmDel(s._id)} aria-label="Delete session"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-white/5"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Exercise</th><th className="px-4 py-2">Equipment</th><th className="px-4 py-2">Muscle</th><th className="px-4 py-2">Details</th><th className="px-4 py-2">kcal</th><th className="px-4 py-2" /></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {(data.items as WorkoutLog[]).map((l) => (
                <tr key={l._id}>
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-500">{fmtDateTime(l.performedAt)}</td>
                  <td className="px-4 py-2 font-semibold">{l.exerciseName}{l.source !== 'session' && <Badge color="slate" className="ml-1">{l.source}</Badge>}</td>
                  <td className="px-4 py-2">{l.equipmentName || '-'}</td>
                  <td className="px-4 py-2">{label(l.muscleGroup) || '-'}</td>
                  <td className="px-4 py-2">{l.type === 'cardio' ? `${fmtDuration(l.durationSeconds || 0)}${l.distanceKm ? ` · ${l.distanceKm} km` : ''}${l.speedKmh ? ` · ${l.speedKmh} km/h` : ''}` : `${l.sets}×${l.reps ? Math.round((l.reps || 0) / (l.sets || 1)) : 0} @ ${l.weight} kg · ${Math.round(l.volume || 0)} kg vol`}{l.notes ? ` · ${l.notes}` : ''}</td>
                  <td className="px-4 py-2 text-orange-500">{l.caloriesBurned}</td>
                  <td className="px-2 py-2"><button className="btn-ghost h-9 w-9 p-0 text-rose-500" onClick={() => del.mutate(l._id)} aria-label="Delete log"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} of {data.pages} · {data.total} items</span>
          <button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit session" size="sm">
        <div className="space-y-3">
          <Input label="Name" value={editForm.planName} onChange={(e) => setEditForm({ ...editForm, planName: e.target.value })} />
          <Input label="Focus" value={editForm.focus} onChange={(e) => setEditForm({ ...editForm, focus: e.target.value })} placeholder="e.g. Chest & Triceps" />
          <div><p className="label">Rating</p><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setEditForm({ ...editForm, rating: n })} className="p-1" aria-label={`${n} stars`}><Star className={cn('h-6 w-6', n <= editForm.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300')} /></button>)}</div></div>
          <Textarea label="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <button className="btn-primary w-full" disabled={saveSession.isPending} onClick={() => saveSession.mutate()}>Save changes</button>
        </div>
      </Modal>
      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => confirmDel && delSession.mutate(confirmDel)} title="Delete this session?" message="Its exercise logs and calories are removed from your history and stats. This cannot be undone." danger />
    </div>
  );
}
