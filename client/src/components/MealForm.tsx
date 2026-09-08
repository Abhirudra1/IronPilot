import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, X, Sparkles, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import { Input, Select, Spinner } from '@/components/ui';
import type { Food } from '@/types';
import { label } from '@/lib/utils';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Shared "add meal" form. Pick a food from the library, choose a serving and quantity and the
 * macros fill in automatically (still editable); or type a custom food with manual macros.
 */
export default function MealForm({ type, showType = false, date, onSaved }: { type?: string; showType?: boolean; date?: string; onSaved: () => void }) {
  const [mealType, setMealType] = useState(type || 'lunch');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [serving, setServing] = useState(0); // index into servings; -1 = grams
  const [qty, setQty] = useState('1');
  const [f, setF] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', quantity: '', notes: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => { const id = setTimeout(() => setDebounced(query.trim()), 250); return () => clearTimeout(id); }, [query]);
  const results = useQuery({ queryKey: ['foods', debounced], queryFn: async () => (await api.get('/library/foods', { params: { search: debounced } })).data.items as Food[], enabled: debounced.length >= 2, staleTime: 5 * 60_000 });

  const servings = useMemo(() => (food ? [...food.servings, { label: 'grams', grams: 1 }] : []), [food]);
  const grams = food ? (servings[serving]?.grams ?? 1) * (Number(qty) || 0) : 0;

  // Recompute macros whenever the food, serving or quantity changes
  useEffect(() => {
    if (!food) return;
    const k = grams / 100; const m = food.per100g;
    const unit = servings[serving]; const q = Number(qty) || 0;
    setF((cur) => ({ ...cur, name: food.name, calories: String(Math.round(m.calories * k)), protein: String(r1(m.protein * k)), carbs: String(r1(m.carbs * k)), fat: String(r1(m.fat * k)), quantity: unit?.label === 'grams' ? `${q} g` : `${q} × ${unit?.label}${q !== 1 && unit && !unit.label.endsWith('s') ? '' : ''} (${Math.round(grams)} g)` }));
  }, [food, serving, qty, grams, servings]);

  const pick = (item: Food) => { setFood(item); setServing(0); setQty('1'); setQuery(''); setOpen(false); };
  const clearFood = () => { setFood(null); setF({ name: '', calories: '', protein: '', carbs: '', fat: '', quantity: '', notes: '' }); };

  const save = useMutation({
    mutationFn: () => api.post('/tracking/meals', {
      type: mealType, name: f.name.trim(), quantity: f.quantity || undefined, notes: f.notes || undefined,
      calories: Number(f.calories) || 0, protein: Number(f.protein) || 0, carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0,
      date: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
    }),
    onSuccess: () => { toast.success('Meal logged'); onSaved(); }, onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-3">
      {showType && <Select label="Meal" options={MEAL_TYPES.map((m) => ({ value: m, label: label(m) }))} value={mealType} onChange={(e) => setMealType(e.target.value)} />}

      {/* Food search */}
      {!food ? (
        <div className="relative">
          <label className="label" htmlFor="food-search">Search food</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input id="food-search" className="input pl-9" placeholder="e.g. roti, chicken breast, oats, dal…" value={query} autoFocus autoComplete="off" onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} role="combobox" aria-expanded={open && (results.data?.length || 0) > 0} aria-controls="food-results" />
            {results.isFetching && <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />}
          </div>
          {open && debounced.length >= 2 && (
            <ul id="food-results" role="listbox" className="card absolute z-20 mt-1 max-h-60 w-full overflow-y-auto p-1 shadow-card-lg">
              {results.data?.length ? results.data.map((item) => (
                <li key={item._id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => pick(item)} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-white/5">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block text-xs text-zinc-500">{item.servings[0] ? `1 ${item.servings[0].label} · ${Math.round(item.per100g.calories * item.servings[0].grams / 100)} kcal` : `${item.per100g.calories} kcal / 100 g`} · P {r1(item.per100g.protein * (item.servings[0]?.grams ?? 100) / 100)} g</span></span>
                    <span className="chip shrink-0 bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">{label(item.category)}</span>
                  </button>
                </li>
              )) : !results.isFetching && <li className="px-3 py-2 text-sm text-zinc-500">No match - type the name below and enter macros manually.</li>}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div><p className="font-bold">{food.name}</p><p className="text-xs text-zinc-500">{food.per100g.calories} kcal · P {food.per100g.protein} g · C {food.per100g.carbs} g · F {food.per100g.fat} g per 100 g</p></div>
            <button type="button" onClick={clearFood} className="btn-ghost h-8 w-8 p-0" aria-label="Remove selected food"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Input label="Quantity" type="number" step="0.5" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
            <Select label="Serving" options={servings.map((s, i) => ({ value: String(i), label: s.label === 'grams' ? 'grams' : `${s.label} (${s.grams} g)` }))} value={String(serving)} onChange={(e) => setServing(Number(e.target.value))} />
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400"><Sparkles className="h-3.5 w-3.5" /> ≈ {Math.round(grams)} g → {f.calories} kcal · {f.protein} g protein · {f.carbs} g carbs · {f.fat} g fat</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {!food && <Input className="col-span-2" label="Food name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Custom food (if not in the library)" />}
        {!food && <Input label="Quantity" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} placeholder="1 bowl" />}
        {!food && <div />}
        <Input label="Calories" type="number" value={f.calories} onChange={(e) => setF({ ...f, calories: e.target.value })} />
        <Input label="Protein (g)" type="number" value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value })} />
        <Input label="Carbs (g)" type="number" value={f.carbs} onChange={(e) => setF({ ...f, carbs: e.target.value })} />
        <Input label="Fat (g)" type="number" value={f.fat} onChange={(e) => setF({ ...f, fat: e.target.value })} />
      </div>
      {food && <p className="text-[11px] text-zinc-500">Values are auto-filled from the food library; adjust them if your portion differs.</p>}
      <button className="btn-primary w-full" disabled={!f.name.trim() || save.isPending} onClick={() => save.mutate()}><PlusCircle className="h-4 w-4" /> {save.isPending ? 'Saving…' : `Save to ${label(mealType)}`}</button>
    </div>
  );
}
