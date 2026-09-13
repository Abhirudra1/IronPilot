import { useEffect, useRef, useState } from 'react';

type Sentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: string, cb: () => void) => void };
type WakeLockNav = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } };

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/**
 * Holds a screen wake lock while `active` is true, so the phone does not lock mid-set.
 *
 * The browser drops the lock whenever the tab is hidden (switching apps, the user locking the
 * phone by hand), and never returns it on its own - so re-acquire on visibilitychange. Costs
 * nothing while idle: no polling, no timers, and the lock is released the moment `active` is false.
 */
export function useWakeLock(active: boolean) {
  const sentinel = useRef<Sentinel | null>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active || !wakeLockSupported()) return;
    let cancelled = false;

    const release = async () => {
      const s = sentinel.current;
      sentinel.current = null;
      setHeld(false);
      if (s && !s.released) await s.release().catch(() => undefined);
    };

    const acquire = async () => {
      if (cancelled || sentinel.current || document.visibilityState !== 'visible') return;
      try {
        const s = await (navigator as WakeLockNav).wakeLock!.request('screen');
        if (cancelled) { await s.release().catch(() => undefined); return; }
        sentinel.current = s;
        setHeld(true);
        s.addEventListener('release', () => { sentinel.current = null; setHeld(false); });
      } catch { /* denied (low battery, unsupported context) - the session just works without it */ }
    };

    const onVisibility = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisibility); void release(); };
  }, [active]);

  return { held, supported: wakeLockSupported() };
}
