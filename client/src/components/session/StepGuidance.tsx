import { AlertTriangle, ExternalLink, Info, PlayCircle } from 'lucide-react';
import type { RoutineStep } from '@/types';

/** How to do it, why it matters, what people get wrong, and a demo to watch. */
export default function StepGuidance({ step }: { step: RoutineStep }) {
  return (
    <div className="space-y-2 text-sm">
      {step.how && <p><span className="font-bold text-brand-600 dark:text-brand-400">How:</span> {step.how}</p>}
      {step.why && (
        <p className="flex gap-2 text-zinc-600 dark:text-zinc-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <span><span className="font-bold">Why:</span> {step.why}</span>
        </p>
      )}
      {step.mistake && (
        <p className="flex gap-2 rounded-xl bg-rose-500/10 p-2.5 text-rose-900 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <span><span className="font-bold">Most people get this wrong:</span> {step.mistake}</span>
        </p>
      )}
      {step.video && (
        <a href={step.video} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:underline dark:text-brand-400">
          <PlayCircle className="h-4 w-4" /> Watch how it is done <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
