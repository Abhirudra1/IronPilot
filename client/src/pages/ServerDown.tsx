import { CloudOff, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/** Shown instead of the login page when the API cannot be reached while a session exists. */
export default function ServerDown() {
  const { refresh } = useAuth();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="card max-w-sm p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-600"><CloudOff className="h-7 w-7" /></div>
        <h1 className="mt-4 text-xl font-extrabold">Can't reach the server</h1>
        <p className="mt-2 text-sm text-zinc-500">{navigator.onLine ? 'The IronPilot API is not responding. If you are running it locally, start it with "npm run dev" in the server folder. We retry automatically every 10 seconds.' : 'You appear to be offline. Your logged workouts are queued and will sync when the connection returns.'}</p>
        <button className="btn-primary mt-5 w-full" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /> Retry now</button>
      </div>
    </div>
  );
}
