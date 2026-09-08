import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Send, Bot, RefreshCw, Dumbbell, Utensils, Scale, HeartPulse, Flame, Calculator, Plus, Clock, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg, getToken } from '@/lib/api';
import type { ChatMessage, AIRecommendation } from '@/types';
import { Spinner, Tabs, Badge, Modal } from '@/components/ui';
import Markdown from '@/components/Markdown';
import { useAuth } from '@/context/AuthContext';
import { cn, fmtDateTime } from '@/lib/utils';

const SUGGESTIONS = [
  { icon: Dumbbell, text: 'What workout should I do today?' },
  { icon: Utensils, text: 'What should I eat today to hit my targets?' },
  { icon: Scale, text: 'Why am I not losing weight?' },
  { icon: HeartPulse, text: 'Am I overtraining?' },
  { icon: Flame, text: 'Which muscle group should I train next?' },
  { icon: Calculator, text: 'How many calories should I consume?' },
];
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const CONV_KEY = 'ip_chat';
const ARCHIVE_KEY = 'ip_chat_archive';
interface Conversation { id: string; startedAt: string; lastAt: string; count: number; preview: string }

/** JWT "issued at": a new login = new token = new conversation, without touching the auth flow. */
function tokenIssuedAt(): string {
  try { const t = getToken(); if (!t) return '0'; return String(JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).iat || '0'); } catch { return '0'; }
}
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
function currentConversation(): string {
  const iat = tokenIssuedAt();
  try {
    const saved = JSON.parse(sessionStorage.getItem(CONV_KEY) || 'null') as { iat: string; id: string } | null;
    if (saved && saved.iat === iat) return saved.id;
  } catch { /* ignore */ }
  const id = newId();
  try { sessionStorage.setItem(CONV_KEY, JSON.stringify({ iat, id })); } catch { /* ignore */ }
  return id;
}
/** Keep a local copy of recent conversations (last 10) so older chats survive on this device even offline. */
function archive(id: string, messages: ChatMessage[]) {
  if (!messages.length) return;
  try {
    const all = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '{}') as Record<string, { at: number; messages: ChatMessage[] }>;
    all[id] = { at: Date.now(), messages: messages.slice(-60) };
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(Object.fromEntries(Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 10))));
  } catch { /* storage full or unavailable */ }
}

export default function Coach() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<'chat' | 'insights'>('chat');
  const [conv, setConv] = useState<string>(() => currentConversation());
  const [text, setText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const status = useQuery({ queryKey: ['ai-status'], queryFn: async () => (await api.get('/ai/status')).data as { enabled: boolean } });
  const history = useQuery({ queryKey: ['chat', conv], queryFn: async () => (await api.get('/ai/chat', { params: { conversation: conv } })).data.items as ChatMessage[] });
  const conversations = useQuery({ queryKey: ['chat-conversations'], queryFn: async () => (await api.get('/ai/chat/conversations')).data.items as Conversation[], enabled: historyOpen });
  const recs = useQuery({ queryKey: ['ai-recs-all'], queryFn: async () => (await api.get('/ai/recommendations')).data as { daily: AIRecommendation; weekly: AIRecommendation; monthly: AIRecommendation }, enabled: tab === 'insights', staleTime: 10 * 60_000 });
  useEffect(() => { if (history.data) archive(conv, history.data); }, [history.data, conv]);

  const send = useMutation({
    mutationFn: (message: string) => api.post('/ai/chat', { message, conversationId: conv }),
    onMutate: (message) => { qc.setQueryData<ChatMessage[]>(['chat', conv], (old) => [...(old || []), { _id: `tmp-${Date.now()}`, role: 'user', content: message, createdAt: new Date().toISOString() }]); setText(''); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chat', conv] }); qc.invalidateQueries({ queryKey: ['chat-conversations'] }); }, onError: (e) => toast.error(errMsg(e)),
  });
  const removeConv = useMutation({ mutationFn: (id: string) => api.delete('/ai/chat', { params: { conversation: id } }), onSuccess: (_r, id) => { qc.invalidateQueries({ queryKey: ['chat-conversations'] }); if (id === conv) qc.setQueryData(['chat', conv], []); toast.success('Conversation deleted'); } });
  const refreshRecs = useMutation({ mutationFn: () => Promise.all(['daily', 'weekly', 'monthly'].map((s) => api.get(`/ai/recommendations/${s}?refresh=true`))), onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-recs-all'] }); qc.invalidateQueries({ queryKey: ['ai-rec'] }); toast.success('Insights refreshed'); }, onError: (e) => toast.error(errMsg(e)) });
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [history.data, send.isPending, tab]);

  const switchTo = (id: string) => { try { sessionStorage.setItem(CONV_KEY, JSON.stringify({ iat: tokenIssuedAt(), id })); } catch { /* ignore */ } setConv(id); setHistoryOpen(false); };
  const submit = () => { const m = text.trim(); if (m && !send.isPending) send.mutate(m); };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } };
  const msgs = useMemo(() => history.data || [], [history.data]);
  const questions = msgs.filter((m) => m.role === 'user').length;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col" style={{ minHeight: 'calc(100dvh - 11rem)' }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Sparkles className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-tight tracking-tight sm:text-2xl">AI Coach</h1>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">{status.data?.enabled ? 'IronPilot AI · answers from your live data' : 'Basic coach · AI not configured'}</p>
        </div>
        <Tabs tabs={[{ value: 'chat', label: 'Chat' }, { value: 'insights', label: 'Insights' }]} value={tab} onChange={setTab} className="shrink-0" />
      </div>

      {tab === 'chat' ? (
        <div className="card flex min-w-0 flex-1 flex-col overflow-hidden p-0">
          {/* Conversation bar */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-white/[0.06]">
            <p className="truncate text-xs font-semibold text-zinc-500">{questions ? `${questions} question${questions === 1 ? '' : 's'} in this chat` : 'New chat · starts fresh on every login'}</p>
            <div className="flex shrink-0 gap-1">
              <button className="btn-ghost h-9 px-2.5 text-xs" onClick={() => setHistoryOpen(true)}><Clock className="h-4 w-4" /> History</button>
              <button className="btn-secondary h-9 px-2.5 text-xs" onClick={() => switchTo(newId())} disabled={!msgs.length}><Plus className="h-4 w-4" /> New chat</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin sm:px-5">
            {!msgs.length && !history.isLoading && (
              <div className="py-4 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400"><Bot className="h-7 w-7" /></div>
                <p className="mt-3 font-extrabold">Hi {user?.fullName.split(' ')[0]}, ready when you are.</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">I use your workouts, weight trend, meals and targets. Tap a question or type your own.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => <button key={s.text} onClick={() => send.mutate(s.text)} className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-semibold hover:border-brand-500 hover:bg-brand-500/5 dark:border-white/10 dark:bg-surface-700"><s.icon className="h-4 w-4 shrink-0 text-brand-500" /> <span className="min-w-0">{s.text}</span></button>)}
                </div>
              </div>
            )}
            {msgs.map((m) => (
              m.role === 'user' ? (
                <motion.div key={m._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 text-[15px] leading-relaxed text-white dark:bg-brand-400 dark:text-zinc-950"><p className="whitespace-pre-wrap break-words">{m.content}</p></div>
                    <p className="mt-1 text-right text-[10px] text-zinc-400">{time(m.createdAt)}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={m._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Bot className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-500">IronPilot Coach <span className="font-normal text-zinc-400">· {time(m.createdAt)}</span></p>
                    <Markdown text={m.content} className="mt-1 break-words text-[15px] text-zinc-800 dark:text-zinc-100" />
                  </div>
                </motion.div>
              )
            ))}
            {send.isPending && (
              <div className="flex gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Bot className="h-3.5 w-3.5" /></div>
                <div className="flex items-center gap-1 pt-2"><span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-zinc-200 p-2.5 dark:border-white/[0.06] sm:p-3">
            {msgs.length > 0 && <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none">{SUGGESTIONS.slice(0, 4).map((s) => <button key={s.text} onClick={() => send.mutate(s.text)} className="chip shrink-0 border border-zinc-200 bg-white text-zinc-600 hover:border-brand-500 dark:border-white/10 dark:bg-surface-700 dark:text-zinc-300">{s.text}</button>)}</div>}
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5 pl-3 focus-within:border-brand-500 dark:border-white/10 dark:bg-surface-700">
              <textarea className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-zinc-400" rows={1} placeholder="Ask about your training or nutrition…" maxLength={600} value={text} onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(128, e.target.scrollHeight)}px`; }} onKeyDown={onKey} aria-label="Message" />
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-white transition disabled:opacity-40 dark:bg-brand-400 dark:text-zinc-950" disabled={!text.trim() || send.isPending} aria-label="Send"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-2"><p className="text-sm text-zinc-500">Generated from your workouts, weight trend, nutrition and consistency.</p><button className="btn-secondary shrink-0" onClick={() => refreshRecs.mutate()} disabled={refreshRecs.isPending}><RefreshCw className={cn('h-4 w-4', refreshRecs.isPending && 'animate-spin')} /> Refresh</button></div>
          {recs.isLoading ? <div className="py-10 text-center"><Spinner className="mx-auto h-8 w-8" /></div> : recs.data && (['daily', 'weekly', 'monthly'] as const).map((scope, i) => {
            const r = recs.data[scope];
            return (
              <motion.div key={scope} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-5">
                <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">{scope} focus</p><Badge color={r.source === 'gemini' ? 'violet' : 'slate'}>{r.source === 'gemini' ? 'AI' : 'Basic'}</Badge></div>
                <p className="mt-2 text-lg font-extrabold">{r.headline}</p>
                <ul className="mt-3 space-y-2 text-sm">{r.recommendations.map((x, j) => <li key={j} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/10 text-[11px] font-bold text-brand-600 dark:text-brand-400">{j + 1}</span><Markdown text={x} className="min-w-0 flex-1" /></li>)}</ul>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Previous conversations" size="sm">
        <p className="mb-3 text-xs text-zinc-500">Every login starts a fresh chat. Older chats stay here (with a copy on this device) until you delete them.</p>
        <ul className="max-h-80 space-y-1.5 overflow-y-auto">
          {conversations.isLoading && <li className="py-4 text-center"><Spinner className="mx-auto" /></li>}
          {conversations.data?.map((c) => (
            <li key={c.id} className={cn('flex items-center gap-2 rounded-xl border p-2.5', c.id === conv ? 'border-brand-500 bg-brand-500/5' : 'border-zinc-200 dark:border-white/10')}>
              <button className="min-w-0 flex-1 text-left" onClick={() => switchTo(c.id)}>
                <p className="truncate text-sm font-semibold">{c.preview || 'Conversation'}</p>
                <p className="text-[11px] text-zinc-500">{fmtDateTime(c.startedAt)} · {Math.floor(c.count / 2)} question{Math.floor(c.count / 2) === 1 ? '' : 's'}{c.id === conv ? ' · current' : ''}</p>
              </button>
              <button className="btn-ghost h-9 w-9 shrink-0 p-0 text-rose-500" onClick={() => removeConv.mutate(c.id)} aria-label="Delete conversation"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {conversations.data && !conversations.data.length && <li className="py-4 text-center text-sm text-zinc-500">No conversations yet.</li>}
        </ul>
        <button className="btn-secondary mt-3 w-full" onClick={() => setHistoryOpen(false)}><X className="h-4 w-4" /> Close</button>
      </Modal>
    </div>
  );
}
