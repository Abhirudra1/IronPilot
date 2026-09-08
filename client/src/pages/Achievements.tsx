import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import type { Achievement } from '@/types';
import { PageHeader, PageLoader, Bar, FadeIn } from '@/components/ui';
import { fmtDate, cn } from '@/lib/utils';

export default function Achievements() {
  const { data, isLoading } = useQuery({ queryKey: ['achievements'], queryFn: async () => (await api.get('/analytics/achievements')).data as { items: Achievement[]; points: number; level: number; nextLevelPoints: number; earnedCount: number } });
  if (isLoading || !data) return <PageLoader />;
  const prevLevelPoints = 100 * data.level ** 2;
  const cats = [...new Set(data.items.map((a) => a.category))];
  return (
    <div>
      <PageHeader title="Achievements" subtitle="Badges, points and levels for staying consistent." icon={<Trophy className="h-6 w-6" />} />
      <FadeIn>
        <div className="card mb-5 bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-wide text-white/80">Progress level</p><p className="text-4xl font-extrabold">Level {data.level}</p><p className="text-sm text-white/90">{data.points} points · {data.earnedCount}/{data.items.length} badges</p></div>
            <div className="min-w-56 flex-1"><div className="flex justify-between text-xs text-white/80"><span>{prevLevelPoints}</span><span>Next level at {data.nextLevelPoints}</span></div><Bar value={data.points - prevLevelPoints} max={data.nextLevelPoints - prevLevelPoints} color="bg-white" className="mt-1 bg-white/30" /></div>
          </div>
        </div>
      </FadeIn>
      {cats.map((c) => (
        <section key={c} className="mb-6">
          <h2 className="mb-3 font-bold capitalize">{c}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.filter((a) => a.category === c).map((a, i) => (
              <motion.div key={a.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className={cn('card relative p-4 text-center', a.earned ? 'border-amber-400/60 shadow-glow' : 'opacity-70')}>
                {!a.earned && <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />}
                <p className={cn('text-4xl', !a.earned && 'grayscale')}>{a.icon}</p>
                <p className="mt-2 font-bold">{a.title}</p>
                <p className="text-xs text-slate-500">{a.description}</p>
                <p className="mt-2 text-xs font-semibold text-amber-500">+{a.points} pts</p>
                {a.earned && a.earnedAt && <p className="text-[10px] text-slate-400">Earned {fmtDate(a.earnedAt)}</p>}
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
