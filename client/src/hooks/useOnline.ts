import { useEffect, useState } from 'react';
import { readQueue, syncQueue } from '@/lib/offline';
import toast from 'react-hot-toast';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queued, setQueued] = useState(readQueue().length);
  useEffect(() => {
    const up = async () => { setOnline(true); const n = await syncQueue(); if (n) toast.success(`Synced ${n} offline log${n > 1 ? 's' : ''}`); setQueued(readQueue().length); };
    const down = () => setOnline(false);
    const q = () => setQueued(readQueue().length);
    window.addEventListener('online', up); window.addEventListener('offline', down); window.addEventListener('fc:offline-queue', q);
    if (navigator.onLine && readQueue().length) void up();
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); window.removeEventListener('fc:offline-queue', q); };
  }, []);
  return { online, queued };
}
