import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Library, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { Equipment as Eq } from '@/types';
import { PageHeader, Tabs, Badge, FadeIn, Empty } from '@/components/ui';
import { MediaGridSkeleton } from '@/components/ui/Skeleton';
import { label, equipmentEmoji } from '@/lib/utils';

const CATS = [{ value: 'all', label: 'All' }, { value: 'cardio', label: 'Cardio' }, { value: 'strength_machine', label: 'Machines' }, { value: 'free_weight', label: 'Free weights' }] as const;

export function EquipmentImage({ item, className = 'h-40' }: { item: Eq; className?: string }) {
  const [ok, setOk] = useState(true);
  return item.imageUrl && ok ? <img src={item.imageUrl} alt={item.name} loading="lazy" onError={() => setOk(false)} className={`${className} w-full object-cover`} /> : <div className={`${className} grid w-full place-items-center bg-gradient-to-br from-brand-500/20 to-violet-500/20 text-6xl`}>{equipmentEmoji(item.category)}</div>;
}

export default function Equipment() {
  const [cat, setCat] = useState<(typeof CATS)[number]['value']>('all');
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['equipment'], queryFn: async () => (await api.get('/library/equipment')).data.items as Eq[], staleTime: 10 * 60_000 });
  const items = useMemo(() => (data || []).filter((e) => (cat === 'all' || e.category === cat) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.targetMuscles.some((m) => m.includes(q.toLowerCase())))), [data, cat, q]);

  return (
    <div>
      <PageHeader title="Equipment Library" subtitle="Learn what every machine does, how to use it safely, and what to aim for as a beginner." icon={<Library className="h-6 w-6" />}
        actions={<Link to="/exercises" className="btn-secondary">Browse exercises →</Link>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs tabs={CATS as unknown as { value: typeof cat; label: string }[]} value={cat} onChange={setCat} />
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search equipment or muscle" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search equipment" /></div>
      </div>
      {isLoading ? <MediaGridSkeleton /> : !items.length ? <Empty title="No equipment found" hint="Run the seed script on the server to load the library." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e, i) => (
            <FadeIn key={e._id} delay={Math.min(i, 8) * 0.04}>
              <Link to={`/equipment/${e.slug}`} className="card block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow">
                <EquipmentImage item={e} />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{e.name}</h3><Badge color={e.difficulty === 'beginner' ? 'green' : e.difficulty === 'intermediate' ? 'amber' : 'rose'}>{e.difficulty}</Badge></div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{e.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{e.targetMuscles.slice(0, 3).map((m) => <Badge key={m} color="brand">{label(m)}</Badge>)}</div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
