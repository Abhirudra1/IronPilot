import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Play, QrCode, Dumbbell, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan, PlanSuggestion } from '@/types';
import { PageHeader, Modal, Input, Badge, FadeIn } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { cn, label } from '@/lib/utils';

type Detector = { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]> };
const hasDetector = () => 'BarcodeDetector' in window;

export default function StartScreen({ planId, onStart, starting }: { planId?: string; onStart: (body: Record<string, unknown>) => void; starting: boolean }) {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['schedule'], queryFn: async () => (await api.get('/plans/schedule')).data as { schedule: Record<string, WorkoutPlan | null>; plans: WorkoutPlan[] } });
  const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  const todayPlan = data?.schedule[today] || null;
  const pick = useQuery({ queryKey: ['today-plan'], queryFn: async () => (await api.get('/ai/today-plan')).data as PlanSuggestion, staleTime: 10 * 60_000 });
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [qr, setQr] = useState(false);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { if (selected === undefined && data && pick.isFetched) setSelected(planId || todayPlan?._id || pick.data?.plan?._id || null); }, [data, planId, todayPlan, selected, pick.isFetched, pick.data]);

  const stopScan = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setScanning(false); };
  const scan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream; setScanning(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const det = new Ctor({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try { const codes = await det.detect(videoRef.current); if (codes[0]) { setCode(codes[0].rawValue); stopScan(); return; } } catch { /* keep scanning */ }
        requestAnimationFrame(() => setTimeout(tick, 250));
      };
      void tick();
    } catch { setScanning(false); }
  };
  useEffect(() => () => stopScan(), []);

  const begin = (method: 'manual' | 'qr') => onStart({ planId: selected || undefined, checkInMethod: method, gymCode: method === 'qr' ? code : undefined });
  const checkinPayload = JSON.stringify({ app: 'ironpilot', user: user?._id, date: new Date().toISOString().slice(0, 10) });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Gym Check-In" subtitle="Pick your plan and press Start. The app will guide you exercise by exercise with timers." icon={<Play className="h-6 w-6" />} />
      <FadeIn>
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-brand-500 to-violet-600 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Today · {label(today)}</p>
            <h2 className="mt-1 text-2xl font-extrabold">{todayPlan ? todayPlan.focus || todayPlan.name : pick.data?.plan ? `Coach pick: ${pick.data.plan.focus || pick.data.plan.name}` : 'No plan scheduled'}</h2>
            <p className="text-sm text-white/80">{todayPlan ? `${todayPlan.exercises.length} exercises · ~${todayPlan.estimatedMinutes || 45} min` : pick.data?.plan ? pick.data.reason : 'Choose any plan below or do a free session.'}</p>
          </div>
          <div className="p-5">
            <p className="label">Choose a plan</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setSelected(null)} className={cn('rounded-xl border p-3 text-left', selected === null ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-white/10')}>
                <p className="font-semibold">Free session</p><p className="text-xs text-slate-500">Add exercises as you go</p>
              </button>
              {data?.plans.map((p) => (
                <button key={p._id} onClick={() => setSelected(p._id)} className={cn('rounded-xl border p-3 text-left', selected === p._id ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-white/10')}>
                  <div className="flex items-center justify-between"><p className="font-semibold">{p.name}</p>{p._id === todayPlan?._id && <Badge color="green">Today</Badge>}{p._id !== todayPlan?._id && p._id === pick.data?.plan?._id && <Badge color="violet">Coach pick</Badge>}</div>
                  <p className="text-xs text-slate-500">{p.exercises.length} exercises · {p.focus}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary flex-1 py-4 text-base" disabled={starting || selected === undefined} onClick={() => begin('manual')}><Play className="h-5 w-5" /> {starting ? 'Starting…' : 'START SESSION'}</button>
              <button className="btn-secondary py-4" onClick={() => setQr(true)}><QrCode className="h-5 w-5" /> QR check-in</button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500"><Dumbbell className="mr-1 inline h-3.5 w-3.5" />Workflow: Start → follow plan → complete sets → rest timer → next exercise → finish → AI summary</p>
          </div>
        </div>
      </FadeIn>

      <Modal open={qr} onClose={() => { stopScan(); setQr(false); }} title="QR gym check-in">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="text-center">
            <p className="mb-2 text-sm font-semibold">Your check-in code</p>
            <div className="inline-block rounded-xl bg-white p-3"><QRCodeSVG value={checkinPayload} size={150} /></div>
            <p className="mt-2 text-xs text-slate-500">Show this at the front desk.</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Scan the gym's QR</p>
            {scanning ? <video ref={videoRef} className="w-full rounded-xl" muted playsInline /> : hasDetector() ? <button className="btn-secondary w-full" onClick={scan}><Camera className="h-4 w-4" /> Open camera</button> : <p className="text-xs text-slate-500">Camera QR scanning is not supported on this browser - enter the code manually.</p>}
            <Input className="mt-3" label="Gym code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. GYM-1234" />
            <button className="btn-primary mt-3 w-full" disabled={!code || starting} onClick={() => { stopScan(); begin('qr'); }}><Play className="h-4 w-4" /> Check in & start</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
