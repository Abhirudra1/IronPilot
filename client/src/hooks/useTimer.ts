import { useCallback, useEffect, useRef, useState } from 'react';

/** Countdown timer (seconds). Survives re-renders; uses wall clock for accuracy in background tabs. */
export function useCountdown(onFinish?: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number>(0);
  const cb = useRef(onFinish); cb.current = onFinish;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { setRunning(false); cb.current?.(); }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((seconds: number) => { setTotal(seconds); setRemaining(seconds); endAt.current = Date.now() + seconds * 1000; setRunning(true); }, []);
  const add = useCallback((seconds: number) => { endAt.current += seconds * 1000; setTotal((t) => t + seconds); setRemaining((r) => r + seconds); }, []);
  const stop = useCallback(() => { setRunning(false); setRemaining(0); }, []);
  return { remaining, total, running, start, add, stop };
}

/** Stopwatch (seconds elapsed). */
export function useStopwatch(autoStart = false, startedAt?: string | number) {
  const [elapsed, setElapsed] = useState(() => (startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0));
  const [running, setRunning] = useState(autoStart);
  const base = useRef(Date.now() - elapsed * 1000);
  useEffect(() => {
    if (!running) return;
    base.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - base.current) / 1000)), 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const reset = useCallback(() => { setElapsed(0); base.current = Date.now(); }, []);
  return { elapsed, running, start: () => setRunning(true), pause: () => setRunning(false), reset };
}
