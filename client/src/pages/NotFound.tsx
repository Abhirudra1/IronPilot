import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

/** Friendly 404 for unknown routes (rendered inside the app shell when signed in). */
export default function NotFound() {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400"><Compass className="h-8 w-8" /></div>
      <p className="mt-4 text-5xl font-extrabold tracking-tight">404</p>
      <h1 className="mt-1 text-xl font-extrabold">This page doesn't exist</h1>
      <p className="mt-2 text-sm text-zinc-500">There is nothing at <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-white/10">{loc.pathname}</code>. It may have moved, or the link was mistyped.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn-secondary" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /> Go back</button>
        <Link to="/" className="btn-primary"><Home className="h-4 w-4" /> Home</Link>
      </div>
    </div>
  );
}
