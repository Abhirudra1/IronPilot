import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { Input } from '@/components/ui';
import { api, errMsg } from '@/lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<{ emailed: boolean } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const { data } = await api.post('/auth/forgot-password', { email }); setSent({ emailed: Boolean(data.emailed) }); if (data.resetUrl) setResetUrl(data.resetUrl); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll generate a reset link.">
      {sent ? (
        <div className="card p-5">
          <p className="font-extrabold">{sent.emailed ? 'Check your inbox 📬' : 'Reset link generated'}</p>
          <p className="mt-1 text-sm text-zinc-500">{sent.emailed ? 'If that email exists, we have sent a reset link (valid for 30 minutes). Check spam too.' : 'Email delivery is not configured on this server, so the link was logged server-side (and shown below in development).'}</p>
          {resetUrl && <p className="well mt-3 break-all p-3 text-xs">Dev link: <a className="font-bold text-brand-500 underline" href={resetUrl}>{resetUrl}</a></p>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-500"><Link to="/login" className="font-semibold text-brand-500 hover:underline">Back to login</Link></p>
    </AuthLayout>
  );
}
