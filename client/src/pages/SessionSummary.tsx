import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Share2, Sparkles, Flame, Timer, Dumbbell, Trophy, Home, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { WorkoutSession } from '@/types';
import { PageLoader, Badge, FadeIn } from '@/components/ui';
import { fmtDuration, label } from '@/lib/utils';

export default function SessionSummary() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const newAchievements = (loc.state as { newAchievements?: { title: string; icon: string; points: number }[] } | null)?.newAchievements || [];
  const { data, isLoading } = useQuery({ queryKey: ['session', id], queryFn: async () => (await api.get(`/sessions/${id}`)).data.item as WorkoutSession });
  if (isLoading || !data) return <PageLoader />;

  const shareUrl = `${location.origin}/shared/${data.shareCode}`;
  const share = async () => {
    const text = `I just finished ${data.focus || data.planName} on IronPilot: ${fmtDuration(data.durationSeconds)}, ${data.totalCalories} kcal 💪`;
    if (navigator.share) { try { await navigator.share({ title: 'My workout', text, url: shareUrl }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(`${text} ${shareUrl}`); toast.success('Share link copied');
  };
  const done = data.exercises.filter((e) => e.status === 'completed');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card overflow-hidden bg-gradient-to-br from-accent-500 to-emerald-600 p-6 text-center text-surface">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-2 text-2xl font-extrabold">Session complete!</h1>
        <p className="font-semibold">{data.focus || data.planName}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-white/25 p-2"><Timer className="mx-auto h-4 w-4" /><p className="text-lg font-bold">{fmtDuration(data.durationSeconds)}</p><p className="text-xs">duration</p></div>
          <div className="rounded-xl bg-white/25 p-2"><Flame className="mx-auto h-4 w-4" /><p className="text-lg font-bold">{data.totalCalories}</p><p className="text-xs">kcal</p></div>
          <div className="rounded-xl bg-white/25 p-2"><Dumbbell className="mx-auto h-4 w-4" /><p className="text-lg font-bold">{Math.round(data.totalVolume)}</p><p className="text-xs">kg volume</p></div>
        </div>
      </motion.div>

      {newAchievements.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="card border-amber-400/50 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 font-bold text-amber-600"><Trophy className="h-5 w-5" /> New achievement{newAchievements.length > 1 ? 's' : ''} unlocked!</p>
            <ul className="mt-2 space-y-1 text-sm">{newAchievements.map((a) => <li key={a.title}>{a.icon} {a.title} <span className="text-slate-500">+{a.points} pts</span></li>)}</ul>
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.15}>
        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-500"><Sparkles className="h-4 w-4" /> AI Coach summary</p>
          <p className="mt-2 leading-relaxed">{data.aiSummary}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Exercises ({done.length}/{data.exercises.length})</p>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {data.exercises.map((e) => (
              <li key={e._id} className="flex items-center justify-between py-2 text-sm">
                <div><p className="font-semibold">{e.exerciseName}</p><p className="text-xs text-slate-500">{e.equipmentName}{e.muscleGroup ? ` · ${label(e.muscleGroup)}` : ''}</p></div>
                <div className="text-right"><Badge color={e.status === 'completed' ? 'green' : e.status === 'skipped' ? 'amber' : 'slate'}>{label(e.status)}</Badge><p className="mt-1 text-xs text-slate-500">{e.type === 'cardio' ? `${fmtDuration(e.durationSeconds || 0)}${e.distanceKm ? ` · ${e.distanceKm} km` : ''}` : e.sets.filter((s) => s.completed).map((s) => `${s.reps}×${s.weight}`).join(', ')} · {e.caloriesBurned} kcal</p></div>
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" onClick={() => nav('/')}><Home className="h-4 w-4" /> Dashboard</button>
        <button className="btn-secondary" onClick={share}><Share2 className="h-4 w-4" /> Share</button>
        <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }}><Copy className="h-4 w-4" /> Copy link</button>
      </div>
    </div>
  );
}
