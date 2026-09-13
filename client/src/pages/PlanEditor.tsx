import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { Exercise, Equipment, PlanExercise, WorkoutPlan } from '@/types';
import { PageHeader, Input, Select, Modal, Badge, Textarea } from '@/components/ui';
import { FormPageSkeleton } from '@/components/ui/Skeleton';
import { label, DAYS, MUSCLES } from '@/lib/utils';

type Row = PlanExercise & { key: string };
const newKey = () => Math.random().toString(36).slice(2);

export default function PlanEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === 'new';
  const [f, setF] = useState({ name: '', focus: '', description: '', scheduledDays: [] as string[], isTemplate: false });
  const [rows, setRows] = useState<Row[]>([]);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');

  const plan = useQuery({ queryKey: ['plan', id], queryFn: async () => (await api.get(`/plans/${id}`)).data.item as WorkoutPlan, enabled: !isNew });
  const exercises = useQuery({ queryKey: ['exercises'], queryFn: async () => (await api.get('/library/exercises')).data.items as Exercise[], staleTime: 10 * 60_000 });
  const equipment = useQuery({ queryKey: ['equipment'], queryFn: async () => (await api.get('/library/equipment')).data.items as Equipment[], staleTime: 10 * 60_000 });

  useEffect(() => {
    if (plan.data) {
      setF({ name: plan.data.name, focus: plan.data.focus || '', description: plan.data.description || '', scheduledDays: plan.data.scheduledDays, isTemplate: plan.data.isTemplate });
      setRows(plan.data.exercises.map((e) => ({ ...e, key: e._id || newKey() })));
    }
  }, [plan.data]);

  const filtered = useMemo(() => (exercises.data || []).filter((e) => (!search || e.name.toLowerCase().includes(search.toLowerCase())) && (!muscle || e.primaryMuscle === muscle) && (!equipmentFilter || e.equipmentSlug === equipmentFilter)), [exercises.data, search, muscle, equipmentFilter]);

  const add = (e: Exercise) => {
    setRows([...rows, { key: newKey(), exercise: e._id, exerciseName: e.name, equipment: e.equipment?._id || null, equipmentName: e.equipment?.name, muscleGroup: e.primaryMuscle, type: e.type, sets: e.type === 'cardio' ? 1 : e.defaultSets, reps: e.type === 'cardio' ? 0 : e.defaultReps, weight: 0, duration: e.type === 'cardio' ? e.defaultDuration || 15 : 0, restSeconds: 60 }]);
    toast.success(`${e.name} added`);
  };
  const update = (key: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const save = useMutation({
    mutationFn: () => {
      const muscleGroups = [...new Set(rows.map((r) => r.muscleGroup).filter(Boolean))] as string[];
      const body = { ...f, muscleGroups, exercises: rows.map(({ key: _key, _id, ...r }, i) => ({ ...r, order: i })) };
      return isNew ? api.post('/plans', body) : api.patch(`/plans/${id}`, body);
    },
    onSuccess: () => { toast.success('Plan saved'); nav('/plans'); }, onError: (e) => toast.error(errMsg(e)),
  });

  if (!isNew && plan.isLoading) return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader title={isNew ? 'New workout plan' : 'Edit plan'} subtitle="Pick equipment and exercises, then set sets, reps, weight or duration."
        actions={<><button className="btn-secondary" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /> Back</button><button className="btn-primary" disabled={!f.name || !rows.length || save.isPending} onClick={() => save.mutate()}><Save className="h-4 w-4" /> Save plan</button></>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5 lg:col-span-1">
          <Input label="Plan name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Chest & Triceps" required />
          <Input label="Focus" value={f.focus} onChange={(e) => setF({ ...f, focus: e.target.value })} placeholder="e.g. Chest & Triceps" />
          <Textarea label="Notes" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional description" />
          <div>
            <p className="label">Schedule on</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => <button key={d} type="button" onClick={() => setF({ ...f, scheduledDays: f.scheduledDays.includes(d) ? f.scheduledDays.filter((x) => x !== d) : [...f.scheduledDays, d] })} className={`chip border ${f.scheduledDays.includes(d) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-white/10'}`}>{d.slice(0, 3)}</button>)}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isTemplate} onChange={(e) => setF({ ...f, isTemplate: e.target.checked })} className="h-4 w-4 rounded" /> Save as a reusable template</label>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Exercises ({rows.length})</h2>
            <button className="btn-primary" onClick={() => setPicker(true)}><Plus className="h-4 w-4" /> Add exercise</button>
          </div>
          {rows.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">No exercises yet. Add cardio and strength exercises to build your session.</div>}
          <Reorder.Group axis="y" values={rows} onReorder={setRows} className="space-y-2">
            {rows.map((r, i) => (
              <Reorder.Item key={r.key} value={r} className="card p-3">
                <div className="flex items-start gap-2">
                  <button className="mt-1 cursor-grab text-slate-400 active:cursor-grabbing" aria-label="Drag to reorder"><GripVertical className="h-5 w-5" /></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                      <p className="font-semibold">{r.exerciseName}</p>
                      {r.equipmentName && <Badge color="slate">{r.equipmentName}</Badge>}
                      {r.muscleGroup && <Badge color="brand">{label(r.muscleGroup)}</Badge>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {r.type === 'cardio' ? (
                        <Input label="Minutes" type="number" min={1} value={r.duration} onChange={(e) => update(r.key, { duration: Number(e.target.value) })} />
                      ) : (
                        <>
                          <Input label="Sets" type="number" min={1} value={r.sets} onChange={(e) => update(r.key, { sets: Number(e.target.value) })} />
                          <Input label="Reps" type="number" min={1} value={r.reps} onChange={(e) => update(r.key, { reps: Number(e.target.value) })} />
                          <Input label="Weight (kg)" type="number" min={0} step="0.5" value={r.weight} onChange={(e) => update(r.key, { weight: Number(e.target.value) })} />
                          <Input label="Rest (s)" type="number" min={0} step={15} value={r.restSeconds} onChange={(e) => update(r.key, { restSeconds: Number(e.target.value) })} />
                        </>
                      )}
                      <Input label="Notes" value={r.notes || ''} onChange={(e) => update(r.key, { notes: e.target.value })} className={r.type === 'cardio' ? 'col-span-2 sm:col-span-3' : ''} />
                    </div>
                  </div>
                  <button className="btn-ghost px-2 text-rose-500" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>

      <Modal open={picker} onClose={() => setPicker(false)} title="Add exercise" size="lg">
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search exercises" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select options={[{ value: '', label: 'All equipment' }, ...(equipment.data || []).map((e) => ({ value: e.slug, label: e.name }))]} value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} />
          <Select options={[{ value: '', label: 'All muscles' }, ...MUSCLES.map((m) => ({ value: m, label: label(m) }))]} value={muscle} onChange={(e) => setMuscle(e.target.value)} />
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {filtered.map((e) => (
            <button key={e._id} onClick={() => add(e)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5">
              <div><p className="text-sm font-semibold">{e.name}</p><p className="text-xs text-slate-500">{e.equipment?.name || 'Bodyweight'} · {label(e.primaryMuscle)} · {e.difficulty}</p></div>
              <Plus className="h-4 w-4 text-brand-500" />
            </button>
          ))}
          {!filtered.length && <p className="p-4 text-center text-sm text-slate-500">No exercises match.</p>}
        </div>
      </Modal>
    </div>
  );
}
