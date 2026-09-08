import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { AIRecommendation } from '@/types';
import { Spinner } from '@/components/ui';

export default function AICoachWidget({ scope = 'daily' }: { scope?: 'daily' | 'weekly' | 'monthly' }) {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['ai-status'], queryFn: async () => (await api.get('/ai/status')).data as { enabled: boolean; lastError?: string | null; lastModel?: string | null }, staleTime: 60_000 });
  const q = useQuery({ queryKey: ['ai-rec', scope], queryFn: async () => (await api.get(`/ai/recommendations/${scope}`)).data.item as AIRecommendation, staleTime: 10 * 60_000 });
  const refresh = async () => { await api.get(`/ai/recommendations/${scope}?refresh=true`); qc.invalidateQueries({ queryKey: ['ai-rec', scope] }); };
  return (
    <div className="card relative overflow-hidden bg-gradient-to-br from-brand-500 to-violet-500 p-5 text-white">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80"><Sparkles className="h-4 w-4" /> AI Coach · {scope}</p>
        <button onClick={refresh} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Refresh recommendations" disabled={q.isFetching}><RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} /></button>
      </div>
      {q.isLoading ? <div className="py-6"><Spinner className="text-white" /></div> : q.data ? (
        <>
          <p className="mt-2 text-lg font-bold leading-snug">{q.data.headline}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-white/90">
            {q.data.recommendations.slice(0, 4).map((r, i) => <li key={i} className="flex gap-2"><span>•</span><span>{r}</span></li>)}
          </ul>
          <div className="mt-4 flex items-center justify-between text-xs text-white/70">
            <span>{q.data.source === 'gemini' ? 'Powered by IronPilot AI' : status.data?.enabled ? 'Basic guidance (AI temporarily unavailable)' : 'Basic guidance'}</span>
            <Link to="/coach" className="font-semibold underline-offset-2 hover:underline">Ask the coach →</Link>
          </div>
        </>
      ) : <p className="mt-2 text-sm">Complete a workout to unlock personalised coaching.</p>}
    </div>
  );
}
