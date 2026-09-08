import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ShieldAlert, Lightbulb, ExternalLink } from 'lucide-react';
import type { Equipment, Exercise } from '@/types';
import { equipmentEmoji } from '@/lib/utils';
import ExerciseAnimation from '@/components/ExerciseAnimation';

/** Beginner guided mode: shows equipment image, purpose, how-to, recommendations and safety. */
export default function GuidedMode({ equipment, exercise }: { equipment?: Equipment; exercise?: Exercise }) {
  const [imgOk, setImgOk] = useState(true);
  if (!equipment && !exercise) return null;
  return (
    <div className="card overflow-hidden">
      {exercise && <div className="p-3 pb-0"><ExerciseAnimation exercise={exercise} compact /></div>}
      <div className="grid sm:grid-cols-3">
        <div className="relative h-40 bg-slate-100 dark:bg-white/5 sm:h-full">
          {equipment?.imageUrl && imgOk ? <img src={equipment.imageUrl} alt={equipment.name} className="h-full w-full object-cover" onError={() => setImgOk(false)} loading="lazy" /> : <div className="grid h-full min-h-40 place-items-center text-6xl">{equipmentEmoji(equipment?.category)}</div>}
          <span className="absolute left-2 top-2 chip bg-black/60 text-white"><BookOpen className="h-3 w-3" /> Guided mode</span>
        </div>
        <div className="space-y-3 p-4 sm:col-span-2">
          {equipment && (
            <>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Equipment</p><p className="font-bold">{equipment.name}</p><p className="text-sm text-slate-600 dark:text-slate-300">{equipment.purpose || equipment.description}</p></div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {equipment.recommendedDuration && <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/5"><p className="text-slate-500">Recommended</p><p className="font-semibold">{equipment.recommendedDuration}</p></div>}
                {equipment.recommendedWeight && <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/5"><p className="text-slate-500">Weight</p><p className="font-semibold">{equipment.recommendedWeight}</p></div>}
                {equipment.suggestedSpeed && <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/5"><p className="text-slate-500">Speed / pace</p><p className="font-semibold">{equipment.suggestedSpeed}</p></div>}
              </div>
            </>
          )}
          {(exercise?.instructions?.length || equipment?.howToUse?.length) ? (
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to do it</p><ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">{(exercise?.instructions?.length ? exercise.instructions : equipment!.howToUse).map((s, i) => <li key={i}>{s}</li>)}</ol></div>
          ) : null}
          {(exercise?.tips?.[0] || equipment?.beginnerTips?.[0]) && <p className="flex items-start gap-2 rounded-lg bg-brand-500/10 p-2 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {exercise?.tips?.[0] || equipment?.beginnerTips?.[0]}</p>}
          {equipment?.safetyTips?.[0] && <p className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-2 text-sm"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> {equipment.safetyTips[0]}</p>}
          <div className="flex gap-3 text-xs">
            {equipment && <Link to={`/equipment/${equipment.slug}`} className="font-semibold text-brand-500">Full equipment guide →</Link>}
            {(exercise?.videoUrl || equipment?.videoUrl) && <a href={exercise?.videoUrl || equipment?.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-brand-500">Video demo <ExternalLink className="h-3 w-3" /></a>}
          </div>
        </div>
      </div>
    </div>
  );
}
