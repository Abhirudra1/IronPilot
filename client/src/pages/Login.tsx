import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { Input, PasswordInput } from '@/components/ui';
import GoogleSignIn from '@/components/GoogleSignIn';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/lib/api';
import { safePath } from '@/lib/safePath';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password, form.remember);
      nav(user.profileComplete === false ? '/onboarding' : safePath((loc.state as { from?: string })?.from), { replace: true });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Welcome back 👋" subtitle="Log in and let's get after it.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Email" type="email" name="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput label="Password" name="password" autoComplete="current-password" required placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} className="h-4 w-4 rounded accent-brand-500" /> Remember me</label>
          <Link to="/forgot-password" className="font-bold text-brand-500 hover:underline">Forgot password?</Link>
        </div>
        <button className="btn-primary w-full py-3 text-base" disabled={busy || !form.email || !form.password}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-zinc-400"><span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />or<span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" /></div>
      <GoogleSignIn label="signin_with" />
      <p className="mt-6 text-center text-sm text-zinc-500">New here? <Link to="/register" className="font-extrabold text-brand-500 hover:underline">Create an account</Link></p>
    </AuthLayout>
  );
}
