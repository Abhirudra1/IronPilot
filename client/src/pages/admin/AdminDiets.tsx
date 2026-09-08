import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { DietPlan } from '@/types';
import { PageLoader, Modal, Input, Textarea, Confirm } from '@/components/ui';
import { label } from '@/lib/utils';

interface Form { _id?: string; name: string; planType: string; dailyCalories: string; proteinTarget: string; carbTarget: string; fatTarget: string; waterMl: string; tips: string; rationale: string; meals: string }
const blank: Form = { name: '', planType: '', dailyCalories: '', proteinTarget: '', carbTarget: '', fatTarget: '', waterMl: '', tips: '', rationale: '', meals: '' };

/** Meals are edited as lines: type | name | calories | protein | carbs | fat | items (comma separated) */
const mealsToText = (m: DietPlan['meals']) => m.map((x) => `${x.type} | ${x.name} | ${x.calories} | ${x.protein} | ${x.carbs} | ${x.fat} | ${(x.items || []).join(', ')}`).join('\n');
const textToMeals = (t: string) => t.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p[0] && p[1]).map((p) => ({ type: p[0], name: p[1], calories: Number(p[2]) || 0, protein: Number(p[3]) || 0, carbs: Number(p[4]) || 0, fat: Number(p[5]) || 0, items: (p[6] || '').split(',').map((s) => s.trim()).filter(Boolean) }));

export default function AdminDiets() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'diets'], queryFn: async () => (await api.get('/admin/diet-templates')).data.items as DietPlan[] });
  const toBody = (f: Form) => ({ name: f.name, planType: f.planType, dailyCalories: Number(f.dailyCalories) || 0, proteinTarget: Number(f.proteinTarget) || 0, carbTarget: Number(f.carbTarget) || 0, fatTarget: Number(f.fatTarget) || 0, waterMl: Number(f.waterMl) || undefined, tips: f.tips.split('\n').map((s) => s.trim()).filter(Boolean), rationale: f.rationale, meals: textToMeals(f.meals) });
  const save = useMutation({ mutationFn: (f: Form) => (f._id ? api.patch(`/admin/diet-templates/${f._id}`, toBody(f)) : api.post('/admin/diet-templates', toBody(f))), onSuccess: () => { toast.success('Template saved'); setEdit(null); qc.invalidateQueries({ queryKey: ['admin', 'diets'] }); qc.invalidateQueries({ queryKey: ['diet'] }); }, onError: (e) => toast.error(errMsg(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/diet-templates/${id}`), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin', 'diets'] }); }, onError: (e) => toast.error(errMsg(e)) });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><p className="text-sm text-slate-500">{data?.length ?? 0} templates</p><button className="btn-primary" onClick={() => setEdit(blank)}><Plus className="h-4 w-4" /> New template</button></div>
      {isLoading ? <PageLoader /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((d) => (
            <div key={d._id} className="card p-4">
              <div className="flex items-start justify-between"><div><p className="font-bold">{d.name}</p><p className="text-xs text-slate-500">{label(d.planType)} · {d.dailyCalories} kcal · P{d.proteinTarget} C{d.carbTarget} F{d.fatTarget} · {d.meals.length} meals</p></div><div className="flex gap-1"><button className="btn-ghost p-1.5" onClick={() => setEdit({ _id: d._id, name: d.name, planType: d.planType || '', dailyCalories: String(d.dailyCalories), proteinTarget: String(d.proteinTarget), carbTarget: String(d.carbTarget), fatTarget: String(d.fatTarget), waterMl: String(d.waterMl || ''), tips: d.tips.join('\n'), rationale: d.rationale || '', meals: mealsToText(d.meals) })} aria-label="Edit"><Pencil className="h-4 w-4" /></button><button className="btn-ghost p-1.5 text-rose-500" onClick={() => setDel(d._id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit template' : 'New template'} size="lg">
        {edit && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Name" className="sm:col-span-2" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Input label="Plan type" placeholder="muscle_gain" value={edit.planType} onChange={(e) => setEdit({ ...edit, planType: e.target.value })} />
            <Input label="Calories" type="number" value={edit.dailyCalories} onChange={(e) => setEdit({ ...edit, dailyCalories: e.target.value })} />
            <Input label="Protein (g)" type="number" value={edit.proteinTarget} onChange={(e) => setEdit({ ...edit, proteinTarget: e.target.value })} />
            <Input label="Carbs (g)" type="number" value={edit.carbTarget} onChange={(e) => setEdit({ ...edit, carbTarget: e.target.value })} />
            <Input label="Fat (g)" type="number" value={edit.fatTarget} onChange={(e) => setEdit({ ...edit, fatTarget: e.target.value })} />
            <Input label="Water (ml)" type="number" value={edit.waterMl} onChange={(e) => setEdit({ ...edit, waterMl: e.target.value })} />
            <Textarea label="Meals (type | name | kcal | protein | carbs | fat | items)" className="sm:col-span-3" value={edit.meals} onChange={(e) => setEdit({ ...edit, meals: e.target.value })} placeholder="breakfast | Oats & eggs | 500 | 30 | 60 | 15 | 80g oats, 3 eggs" />
            <Textarea label="Tips (one per line)" className="sm:col-span-3" value={edit.tips} onChange={(e) => setEdit({ ...edit, tips: e.target.value })} />
            <Textarea label="Rationale" className="sm:col-span-3" value={edit.rationale} onChange={(e) => setEdit({ ...edit, rationale: e.target.value })} />
            <button className="btn-primary sm:col-span-3" disabled={!edit.name || save.isPending} onClick={() => save.mutate(edit)}>Save template</button>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} title="Delete template?" danger />
    </div>
  );
}
