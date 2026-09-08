import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mic, MicOff, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import { enqueueLog } from '@/lib/offline';
import { Input, Select } from '@/components/ui';
import type { Exercise } from '@/types';

type SRResult = { isFinal: boolean; 0: { transcript: string } };
type SR = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; onresult: ((e: { resultIndex: number; results: ArrayLike<SRResult> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const getSR = (): (new () => SR) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/** Parse spoken phrases like "bench press 3 sets 10 reps 40 kg" or "treadmill 15 minutes". */
export function parseVoice(text: string) {
  const t = text.toLowerCase();
  const num = (re: RegExp) => { const m = t.match(re); return m ? Number(m[1]) : undefined; };
  const sets = num(/(\d+)\s*sets?/); const reps = num(/(\d+)\s*reps?/); const weight = num(/(\d+(?:\.\d+)?)\s*(?:kg|kilo)/);
  const minutes = num(/(\d+)\s*min/); const km = num(/(\d+(?:\.\d+)?)\s*(?:km|kilomet)/);
  const name = t.replace(/\d+(?:\.\d+)?\s*(sets?|reps?|kg|kilos?|kilograms?|min(?:ute)?s?|km|kilomet(?:er|re)s?)/g, '').replace(/\b(for|of|at|with|and|log|did|do)\b/g, '').replace(/\s+/g, ' ').trim();
  return { name, sets, reps, weight, minutes, km, type: minutes ? 'cardio' : 'strength' as 'cardio' | 'strength' };
}

export default function QuickLog({ onDone, defaultDate }: { onDone: () => void; defaultDate?: string }) {
  const { data: exercises } = useQuery({ queryKey: ['exercises'], queryFn: async () => (await api.get('/library/exercises')).data.items as Exercise[], staleTime: 10 * 60_000 });
  const [f, setF] = useState({ exercise: '', exerciseName: '', type: 'strength', sets: '3', reps: '10', weight: '', minutes: '', km: '', notes: '', date: defaultDate || '' });
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recRef = useRef<SR | null>(null);
  const handledRef = useRef(false);
  const supportsVoice = useMemo(() => Boolean(getSR()), []);

  const pick = (id: string) => {
    const ex = exercises?.find((e) => e._id === id);
    setF({ ...f, exercise: id, exerciseName: ex?.name || '', type: ex?.type || 'strength', sets: String(ex?.defaultSets || 3), reps: String(ex?.defaultReps || 10), minutes: ex?.defaultDuration ? String(ex.defaultDuration) : f.minutes });
  };

  const applyTranscript = (text: string) => {
    const p = parseVoice(text);
    const match = exercises?.find((x) => x.name.toLowerCase().includes(p.name) || (p.name.length > 3 && p.name.includes(x.name.toLowerCase())));
    setF((cur) => ({ ...cur, exercise: match?._id || '', exerciseName: match?.name || p.name, type: match?.type || p.type, sets: p.sets ? String(p.sets) : cur.sets, reps: p.reps ? String(p.reps) : cur.reps, weight: p.weight ? String(p.weight) : cur.weight, minutes: p.minutes ? String(p.minutes) : cur.minutes, km: p.km ? String(p.km) : cur.km }));
    setTranscript(text);
    toast.success(`Heard: "${text}"`, { id: 'voice-heard' }); // fixed id => one toast, updated in place
  };

  const stopVoice = () => { try { recRef.current?.stop(); } catch { /* ignore */ } setListening(false); };

  const startVoice = () => {
    const Ctor = getSR(); if (!Ctor) return;
    handledRef.current = false; setInterim('');
    const r = new Ctor();
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    // Browsers emit many interim results while you speak (that was the flood of popups). Only the
    // final result is applied, exactly once; interim text is shown inline instead of as toasts.
    r.onresult = (e) => {
      let finalText = ''; let interimText = '';
      for (let i = 0; i < e.results.length; i++) { const res = e.results[i]; if (res.isFinal) finalText += res[0].transcript; else interimText += res[0].transcript; }
      if (finalText && !handledRef.current) { handledRef.current = true; applyTranscript(finalText.trim()); stopVoice(); }
      else setInterim(interimText.trim());
    };
    r.onend = () => {
      setListening(false);
      // Some engines never flag isFinal; fall back to the last interim text when recognition ends.
      if (!handledRef.current) { setInterim((last) => { if (last) { handledRef.current = true; applyTranscript(last); } return ''; }); }
    };
    r.onerror = (ev) => { setListening(false); if (ev.error !== 'aborted' && ev.error !== 'no-speech') toast.error('Could not hear you, try again', { id: 'voice-err' }); };
    recRef.current = r; setListening(true); r.start();
  };
  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* ignore */ } }, []);

  const submit = async () => {
    if (!f.exerciseName) return toast.error('Choose or say an exercise');
    const payload = {
      exercise: f.exercise || null, exerciseName: f.exerciseName, type: f.type as 'strength' | 'cardio', source: transcript ? 'voice' : 'manual',
      sets: f.type === 'strength' ? Number(f.sets) : undefined, reps: f.type === 'strength' ? Number(f.reps) : undefined, weight: f.weight ? Number(f.weight) : undefined,
      durationSeconds: f.minutes ? Number(f.minutes) * 60 : undefined, distanceKm: f.km ? Number(f.km) : undefined, notes: f.notes || undefined,
      performedAt: f.date ? new Date(`${f.date}T12:00:00`).toISOString() : undefined,
    };
    if (!navigator.onLine) { enqueueLog(payload as never); toast('Saved offline · will sync when online', { icon: '📴' }); onDone(); return; }
    setBusy(true);
    try { await api.post('/tracking/logs', payload); toast.success('Exercise logged'); onDone(); }
    catch (e) { if ((e as { message?: string }).message === 'Network Error') { enqueueLog(payload as never); toast('Saved offline · will sync when online', { icon: '📴' }); onDone(); } else toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      {supportsVoice && (
        <button type="button" onClick={listening ? stopVoice : startVoice} className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-sm font-bold ${listening ? 'border-rose-400 text-rose-500' : 'border-brand-400/60 text-brand-500'}`}>
          {listening ? <><MicOff className="h-4 w-4 animate-pulse" /> {interim ? `"${interim}…"` : 'Listening… say e.g. "bench press 3 sets 10 reps 40 kg"'}</> : <><Mic className="h-4 w-4" /> Voice log an exercise</>}
        </button>
      )}
      {transcript && !listening && <p className="text-xs text-zinc-500">Heard: “{transcript}” - check the fields below, then save.</p>}
      {!navigator.onLine && <p className="flex items-center gap-2 rounded-2xl bg-amber-500/10 p-2 text-xs text-amber-600"><WifiOff className="h-4 w-4" /> Offline: this log will be queued and synced later.</p>}
      <Select label="Exercise" options={[{ value: '', label: 'Select or type below…' }, ...(exercises || []).map((e) => ({ value: e._id, label: `${e.name} (${e.primaryMuscle})` }))]} value={f.exercise} onChange={(e) => pick(e.target.value)} />
      <Input label="Or custom name" value={f.exerciseName} onChange={(e) => setF({ ...f, exerciseName: e.target.value, exercise: '' })} placeholder="e.g. Farmer's walk" />
      <div className="grid grid-cols-3 gap-2">
        <Select label="Type" options={[{ value: 'strength', label: 'Strength' }, { value: 'cardio', label: 'Cardio' }]} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} />
        {f.type === 'strength' ? (
          <><Input label="Sets" type="number" value={f.sets} onChange={(e) => setF({ ...f, sets: e.target.value })} /><Input label="Reps" type="number" value={f.reps} onChange={(e) => setF({ ...f, reps: e.target.value })} /><Input label="Weight (kg)" type="number" step="0.5" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} /></>
        ) : (
          <><Input label="Minutes" type="number" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /><Input label="Distance (km)" type="number" step="0.1" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} /></>
        )}
        <Input label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      <Input label="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" />
      <button className="btn-primary w-full" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save log'}</button>
    </div>
  );
}
