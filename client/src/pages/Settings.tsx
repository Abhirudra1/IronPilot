import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save, KeyRound, Bell, Palette, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg, refreshToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { PageHeader, Input, Select, FadeIn, Confirm } from '@/components/ui';
import { cn, label } from '@/lib/utils';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const u = user!;
  const [prefs, setPrefs] = useState({ restTimerDefault: String(u.preferences.restTimerDefault), units: u.preferences.units, notifications: { ...u.preferences.notifications }, reminderTimes: { ...u.preferences.reminderTimes } });
  const [targets, setTargets] = useState({ waterGoalMl: String(u.waterGoalMl), calorieTarget: String(u.calorieTarget || ''), proteinTarget: String(u.proteinTarget || ''), carbTarget: String(u.carbTarget || ''), fatTarget: String(u.fatTarget || '') });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [delOpen, setDelOpen] = useState(false);

  const save = useMutation({
    mutationFn: () => api.patch('/users/profile', { preferences: { ...prefs, restTimerDefault: Number(prefs.restTimerDefault), reminderTimes: { ...prefs.reminderTimes, water: Number(prefs.reminderTimes.water) }, theme }, waterGoalMl: Number(targets.waterGoalMl), calorieTarget: Number(targets.calorieTarget) || undefined, proteinTarget: Number(targets.proteinTarget) || undefined, carbTarget: Number(targets.carbTarget) || undefined, fatTarget: Number(targets.fatTarget) || undefined }),
    onSuccess: (r) => { setUser(r.data.user); toast.success('Settings saved'); }, onError: (e) => toast.error(errMsg(e)),
  });
  const changePw = useMutation({ mutationFn: () => api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }), onSuccess: (r) => { if (r.data?.token) refreshToken(r.data.token); toast.success('Password changed'); setPw({ currentPassword: '', newPassword: '', confirm: '' }); }, onError: (e) => toast.error(errMsg(e)) });
  const delAccount = useMutation({ mutationFn: () => api.delete('/users/account'), onSuccess: () => { toast.success('Account deactivated'); logout(); } });

  const recompute = async () => { const { data } = await api.get('/users/targets'); const c = data.computed; setTargets({ waterGoalMl: String(c.water), calorieTarget: String(c.calories), proteinTarget: String(c.protein), carbTarget: String(c.carbs), fatTarget: String(c.fat) }); toast.success(`Recomputed from your profile (maintenance ${c.maintenance} kcal)`); };
  const submitPw = (e: FormEvent) => { e.preventDefault(); if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match'); changePw.mutate(); };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Appearance, timers, reminders, targets and security." icon={<SettingsIcon className="h-6 w-6" />} actions={<button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4" /> Save</button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn><div className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Palette className="h-5 w-5 text-brand-500" /> Appearance & workout</h2>
          <div><p className="label">Theme</p><div className="grid grid-cols-3 gap-2">{(['light', 'dark', 'system'] as const).map((t) => <button key={t} type="button" onClick={() => setTheme(t)} className={cn('rounded-xl border p-3 text-sm font-semibold capitalize', theme === t ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-slate-300 dark:border-white/10')}>{t}</button>)}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Default rest timer (s)" type="number" min={10} max={600} value={prefs.restTimerDefault} onChange={(e) => setPrefs({ ...prefs, restTimerDefault: e.target.value })} />
            <Select label="Units" options={[{ value: 'metric', label: 'Metric (kg, cm)' }, { value: 'imperial', label: 'Imperial (lb, in)' }]} value={prefs.units} onChange={(e) => setPrefs({ ...prefs, units: e.target.value as 'metric' | 'imperial' })} />
          </div>
        </div></FadeIn>

        <FadeIn delay={0.05}><div className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Bell className="h-5 w-5 text-brand-500" /> Reminders</h2>
          {(['workout', 'water', 'weight', 'meal'] as const).map((k) => (
            <div key={k} className="flex items-center gap-3">
              <label className="flex flex-1 items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 rounded" checked={prefs.notifications[k]} onChange={(e) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, [k]: e.target.checked } })} /> {label(k)} reminder</label>
              {k === 'water' ? <Input type="number" min={30} step={30} value={String(prefs.reminderTimes.water)} onChange={(e) => setPrefs({ ...prefs, reminderTimes: { ...prefs.reminderTimes, water: Number(e.target.value) } })} aria-label="Water interval minutes" className="w-28" hint="minutes" /> : <Input type="time" value={prefs.reminderTimes[k]} onChange={(e) => setPrefs({ ...prefs, reminderTimes: { ...prefs.reminderTimes, [k]: e.target.value } })} aria-label={`${k} time`} className="w-32" />}
            </div>
          ))}
          <p className="text-xs text-slate-500">Reminders appear in the notification bell when they are due. Enable browser notifications from the Schedule page.</p>
        </div></FadeIn>

        <FadeIn delay={0.1}><div className="card space-y-3 p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Daily targets</h2><button type="button" className="text-xs font-semibold text-brand-500" onClick={recompute}>Recompute from profile</button></div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Water (ml)" type="number" value={targets.waterGoalMl} onChange={(e) => setTargets({ ...targets, waterGoalMl: e.target.value })} />
            <Input label="Calories (kcal)" type="number" value={targets.calorieTarget} onChange={(e) => setTargets({ ...targets, calorieTarget: e.target.value })} />
            <Input label="Protein (g)" type="number" value={targets.proteinTarget} onChange={(e) => setTargets({ ...targets, proteinTarget: e.target.value })} />
            <Input label="Carbs (g)" type="number" value={targets.carbTarget} onChange={(e) => setTargets({ ...targets, carbTarget: e.target.value })} />
            <Input label="Fat (g)" type="number" value={targets.fatTarget} onChange={(e) => setTargets({ ...targets, fatTarget: e.target.value })} />
          </div>
        </div></FadeIn>

        <FadeIn delay={0.15}><form onSubmit={submitPw} className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5 text-brand-500" /> Change password</h2>
          <Input label="Current password" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="New password" type="password" minLength={6} autoComplete="new-password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            <Input label="Confirm" type="password" minLength={6} autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <button className="btn-secondary" disabled={changePw.isPending}>Update password</button>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-white/5">
            <button type="button" className="btn-secondary" onClick={logout}><LogOut className="h-4 w-4" /> Log out</button>
            <button type="button" className="btn-ghost text-rose-500" onClick={() => setDelOpen(true)}><Trash2 className="h-4 w-4" /> Deactivate account</button>
          </div>
        </form></FadeIn>
      </div>
      <Confirm open={delOpen} onClose={() => setDelOpen(false)} onConfirm={() => delAccount.mutate()} title="Deactivate your account?" message="You will be logged out and unable to log in. An admin can reactivate it." danger />
    </div>
  );
}
