import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { Input } from '@/components/ui';
import { api, errMsg, setToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [pw, setPw] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.a !== pw.b) return toast.error('Passwords do not match');
    setBusy(true);
    try { const { data } = await api.post('/auth/reset-password', { token, password: pw.a }); setToken(data.token, true); setUser(data.user); toast.success('Password updated'); nav('/', { replace: true }); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <AuthLayout title="Set a new password">
      <form onSubmit={submit} className="space-y-4">
        <Input label="New password" type="password" name="password" minLength={6} required value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
        <Input label="Confirm password" type="password" name="confirm" minLength={6} required value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
      </form>
    </AuthLayout>
  );
}
