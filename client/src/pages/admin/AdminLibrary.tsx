import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { Equipment, Exercise } from '@/types';
import { PageLoader, Modal, Input, Select, Textarea, Badge, Confirm } from '@/components/ui';
import { label, MUSCLES, LEVELS } from '@/lib/utils';

type Kind = 'equipment' | 'exercises';
type Form = Record<string, string>;
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

const EQ_FIELDS: { k: string; l: string; t?: 'text' | 'area' | 'select'; opts?: string[] }[] = [
  { k: 'name', l: 'Name' }, { k: 'category', l: 'Category', t: 'select', opts: ['cardio', 'strength_machine', 'free_weight', 'bodyweight', 'other'] }, { k: 'difficulty', l: 'Difficulty', t: 'select', opts: LEVELS },
  { k: 'imageUrl', l: 'Image URL' }, { k: 'videoUrl', l: 'Video URL' }, { k: 'description', l: 'Description', t: 'area' }, { k: 'purpose', l: 'Purpose' }, { k: 'targetMuscles', l: 'Target muscles (comma separated)' },
  { k: 'howToUse', l: 'How to use (one per line)', t: 'area' }, { k: 'beginnerTips', l: 'Beginner tips (one per line)', t: 'area' }, { k: 'safetyTips', l: 'Safety tips (one per line)', t: 'area' },
  { k: 'recommendedUsage', l: 'Recommended usage' }, { k: 'recommendedDuration', l: 'Recommended duration' }, { k: 'recommendedWeight', l: 'Recommended weight' }, { k: 'suggestedSpeed', l: 'Suggested speed' }, { k: 'metActivity', l: 'MET activity key (treadmill, cycling, strength…)' },
];
const EX_FIELDS: typeof EQ_FIELDS = [
  { k: 'name', l: 'Name' }, { k: 'type', l: 'Type', t: 'select', opts: ['strength', 'cardio', 'flexibility'] }, { k: 'primaryMuscle', l: 'Primary muscle', t: 'select', opts: MUSCLES }, { k: 'difficulty', l: 'Difficulty', t: 'select', opts: LEVELS },
  { k: 'equipment', l: 'Equipment', t: 'select', opts: [] }, { k: 'secondaryMuscles', l: 'Secondary muscles (comma separated)' }, { k: 'instructions', l: 'Instructions (one per line)', t: 'area' }, { k: 'tips', l: 'Tips (one per line)', t: 'area' },
  { k: 'videoUrl', l: 'Video URL' }, { k: 'defaultSets', l: 'Default sets' }, { k: 'defaultReps', l: 'Default reps' }, { k: 'defaultDuration', l: 'Default duration (min, cardio)' },
];

export default function AdminLibrary({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const items = useQuery({ queryKey: [kind], queryFn: async () => (await api.get(`/library/${kind}`)).data.items as (Equipment | Exercise)[] });
  const equipment = useQuery({ queryKey: ['equipment'], queryFn: async () => (await api.get('/library/equipment')).data.items as Equipment[] });
  const fields = (kind === 'equipment' ? EQ_FIELDS : EX_FIELDS).map((f) => (f.k === 'equipment' ? { ...f, opts: ['', ...(equipment.data || []).map((e) => e._id)] } : f));
  const inv = () => { qc.invalidateQueries({ queryKey: [kind] }); qc.invalidateQueries({ queryKey: ['exercises'] }); qc.invalidateQueries({ queryKey: ['equipment'] }); };

  const toForm = (it: Equipment | Exercise): Form => {
    const f: Form = {};
    for (const { k } of fields) { const v = (it as unknown as Record<string, unknown>)[k]; f[k] = Array.isArray(v) ? (['howToUse', 'beginnerTips', 'safetyTips', 'instructions', 'tips'].includes(k) ? v.join('\n') : v.join(', ')) : v && typeof v === 'object' ? (v as { _id: string })._id : v == null ? '' : String(v); }
    f._id = it._id; return f;
  };
  const toBody = (f: Form) => {
    const b: Record<string, unknown> = {};
    for (const { k } of fields) {
      const v = f[k] ?? '';
      if (['howToUse', 'beginnerTips', 'safetyTips', 'instructions', 'tips'].includes(k)) b[k] = lines(v);
      else if (['targetMuscles', 'secondaryMuscles'].includes(k)) b[k] = v.split(',').map((x) => x.trim()).filter(Boolean);
      else if (['defaultSets', 'defaultReps', 'defaultDuration'].includes(k)) { if (v) b[k] = Number(v); }
      else if (k === 'equipment') b[k] = v || null;
      else if (v) b[k] = v;
    }
    return b;
  };
  const save = useMutation({ mutationFn: (f: Form) => (f._id ? api.patch(`/library/${kind}/${f._id}`, toBody(f)) : api.post(`/library/${kind}`, toBody(f))), onSuccess: () => { toast.success('Saved'); setEdit(null); inv(); }, onError: (e) => toast.error(errMsg(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/library/${kind}/${id}`), onSuccess: () => { toast.success('Removed'); inv(); }, onError: (e) => toast.error(errMsg(e)) });

  const blank: Form = Object.fromEntries(fields.map((f) => [f.k, f.t === 'select' ? f.opts?.[0] || '' : '']));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><p className="text-sm text-slate-500">{items.data?.length ?? 0} {kind}</p><button className="btn-primary" onClick={() => setEdit(blank)}><Plus className="h-4 w-4" /> Add {kind === 'equipment' ? 'equipment' : 'exercise'}</button></div>
      {items.isLoading ? <PageLoader /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">{kind === 'equipment' ? 'Category' : 'Muscle'}</th><th className="px-4 py-2">{kind === 'equipment' ? 'Muscles' : 'Equipment'}</th><th className="px-4 py-2">Level</th><th className="px-4 py-2" /></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {items.data?.map((it) => (
                <tr key={it._id}>
                  <td className="px-4 py-2 font-semibold">{it.name}</td>
                  <td className="px-4 py-2">{label('category' in it ? it.category : (it as Exercise).primaryMuscle)}</td>
                  <td className="px-4 py-2">{'targetMuscles' in it ? it.targetMuscles.map((m) => <Badge key={m} color="brand" className="mr-1">{label(m)}</Badge>) : (it as Exercise).equipment?.name || '-'}</td>
                  <td className="px-4 py-2">{it.difficulty}</td>
                  <td className="px-2 py-2"><div className="flex gap-1"><button className="btn-ghost p-1.5" onClick={() => setEdit(toForm(it))} aria-label="Edit"><Pencil className="h-4 w-4" /></button><button className="btn-ghost p-1.5 text-rose-500" onClick={() => setDel(it._id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit' : 'Create'} size="lg">
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => f.t === 'area' ? <Textarea key={f.k} label={f.l} className="sm:col-span-2" value={edit[f.k] || ''} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} />
              : f.t === 'select' ? <Select key={f.k} label={f.l} options={(f.opts || []).map((o) => ({ value: o, label: f.k === 'equipment' ? (equipment.data?.find((e) => e._id === o)?.name || 'None') : label(o) }))} value={edit[f.k] || ''} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} />
              : <Input key={f.k} label={f.l} value={edit[f.k] || ''} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} />)}
            <button className="btn-primary sm:col-span-2" disabled={save.isPending} onClick={() => save.mutate(edit)}>Save</button>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} title="Deactivate this item?" message="It will be hidden from users but existing logs keep their history." danger />
    </div>
  );
}
