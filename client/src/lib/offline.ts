import { api } from './api';

const KEY = 'fc_offline_logs';
export interface OfflineLog { offlineId: string; exerciseName: string; exercise?: string | null; type: 'strength' | 'cardio' | 'flexibility'; sets?: number; reps?: number; weight?: number; durationSeconds?: number; distanceKm?: number; notes?: string; performedAt: string; source: 'offline' }

export const readQueue = (): OfflineLog[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const writeQueue = (q: OfflineLog[]) => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* ignore */ } window.dispatchEvent(new CustomEvent('fc:offline-queue')); };

export function enqueueLog(log: Omit<OfflineLog, 'offlineId' | 'source' | 'performedAt'> & { performedAt?: string }) {
  const q = readQueue();
  q.push({ ...log, offlineId: crypto.randomUUID(), source: 'offline', performedAt: log.performedAt || new Date().toISOString() });
  writeQueue(q);
}

let syncing = false;
export async function syncQueue(): Promise<number> {
  const q = readQueue();
  if (!q.length || syncing || !navigator.onLine) return 0;
  syncing = true;
  try {
    const { data } = await api.post('/tracking/logs/sync', { logs: q });
    writeQueue([]);
    return data.synced as number;
  } catch { return 0; } finally { syncing = false; }
}
