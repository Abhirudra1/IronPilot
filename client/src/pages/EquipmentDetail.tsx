import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, ShieldAlert, Lightbulb, Target, Clock, Gauge, Weight, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Equipment, Exercise } from '@/types';
import { Badge, FadeIn } from '@/components/ui';
import { DetailPageSkeleton } from '@/components/ui/Skeleton';
import { label } from '@/lib/utils';
import { EquipmentImage } from './Equipment';

export default function EquipmentDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['equipment', slug], queryFn: async () => (await api.get(`/library/equipment/${slug}`)).data as { item: Equipment; exercises: Exercise[] } });
  if (isLoading || !data) return <DetailPageSkeleton />;
  const e = data.item;
  const facts = [
    { icon: Target, label: 'Purpose', value: e.purpose },
    { icon: Clock, label: 'Recommended duration', value: e.recommendedDuration },
    { icon: Gauge, label: 'Suggested speed / pace', value: e.suggestedSpeed },
    { icon: Weight, label: 'Recommended weight', value: e.recommendedWeight },
    { icon: PlayCircle, label: 'Usage frequency', value: e.recommendedUsage },
  ].filter((f) => f.value);

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => nav(-1)} className="btn-ghost mb-3 -ml-2"><ArrowLeft className="h-4 w-4" /> Back</button>
      <FadeIn>
        <div className="card overflow-hidden">
          <EquipmentImage item={e} className="h-56 sm:h-72" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{e.name}</h1>
              <Badge color="slate">{label(e.category)}</Badge>
              <Badge color={e.difficulty === 'beginner' ? 'green' : e.difficulty === 'intermediate' ? 'amber' : 'rose'}>{e.difficulty}</Badge>
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{e.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{e.targetMuscles.map((m) => <Badge key={m} color="brand">{label(m)}</Badge>)}</div>
            {e.videoUrl && <a href={e.videoUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-4"><ExternalLink className="h-4 w-4" /> Watch video demonstration</a>}
          </div>
        </div>
      </FadeIn>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FadeIn delay={0.05}>
          <div className="card p-5">
            <h2 className="font-bold">Quick facts</h2>
            <dl className="mt-3 space-y-3">
              {facts.map((f) => <div key={f.label} className="flex gap-3"><f.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" /><div><dt className="text-xs uppercase tracking-wide text-slate-500">{f.label}</dt><dd className="font-medium">{f.value}</dd></div></div>)}
            </dl>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="card p-5">
            <h2 className="font-bold">How to use</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{e.howToUse.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="card border-brand-500/30 p-5">
            <h2 className="flex items-center gap-2 font-bold"><Lightbulb className="h-5 w-5 text-brand-500" /> Beginner tips</h2>
            <ul className="mt-3 space-y-2 text-sm">{e.beginnerTips.map((s, i) => <li key={i} className="flex gap-2"><span className="text-brand-500">•</span>{s}</li>)}</ul>
          </div>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="card border-rose-500/30 p-5">
            <h2 className="flex items-center gap-2 font-bold"><ShieldAlert className="h-5 w-5 text-rose-500" /> Safety precautions</h2>
            <ul className="mt-3 space-y-2 text-sm">{e.safetyTips.map((s, i) => <li key={i} className="flex gap-2"><span className="text-rose-500">•</span>{s}</li>)}</ul>
          </div>
        </FadeIn>
      </div>

      {data.exercises.length > 0 && (
        <FadeIn delay={0.25}>
          <div className="card mt-4 p-5">
            <h2 className="font-bold">Exercises with this equipment</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.exercises.map((x) => (
                <Link key={x._id} to={`/exercises?equipment=${e.slug}&highlight=${x.slug}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className="font-semibold">{x.name}</span><span className="text-xs text-slate-500">{label(x.primaryMuscle)} · {x.type === 'cardio' ? `${x.defaultDuration} min` : `${x.defaultSets}×${x.defaultReps}`}</span>
                </Link>
              ))}
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
