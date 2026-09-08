import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, errMsg } from '@/lib/api';
import { GOALS, LEVELS, DIETS, ACTIVITY, label } from '@/lib/utils';

const opts = (arr: readonly string[]) => arr.map((v) => ({ value: v, label: label(v) }));

/** Shown once to Google sign-in users so the coach has the essentials (body stats, goal, experience, diet). */
export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    fullName: user?.fullName || '', gender: user?.gender || 'male', age: '', height: '', weight: '', targetWeight: '',
    fitnessGoal: 'general_fitness', experienceLevel: 'beginner', workoutDaysPerWeek: '3', dietaryPreference: 'no_preference', activityLevel: 'moderate',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (Number(f.age) < 10 || Number(f.height) < 80 || Number(f.weight) < 20) return toast.error('Please fill in your age, height and weight');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/complete-profile', { ...f, age: Number(f.age), height: Number(f.height), weight: Number(f.weight), targetWeight: f.targetWeight ? Number(f.targetWeight) : undefined, workoutDaysPerWeek: Number(f.workoutDaysPerWeek) });
      setUser(data.user); toast.success('All set! Your targets are ready.'); nav('/', { replace: true });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title={`Nice to meet you, ${user?.fullName.split(' ')[0]} 👋`} subtitle="A few essentials so your calories, macros and plans are personalised." wide>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={f.fullName} onChange={set('fullName')} className="sm:col-span-2" />
        <Select label="Gender" options={opts(['male', 'female', 'other'])} value={f.gender} onChange={set('gender')} />
        <Input label="Age" type="number" required min={10} max={100} value={f.age} onChange={set('age')} />
        <Input label="Height (cm)" type="number" required min={80} max={260} value={f.height} onChange={set('height')} />
        <Input label="Current weight (kg)" type="number" step="0.1" required value={f.weight} onChange={set('weight')} />
        <Input label="Target weight (kg)" type="number" step="0.1" value={f.targetWeight} onChange={set('targetWeight')} hint="Optional" />
        <Select label="Activity level" options={opts(ACTIVITY)} value={f.activityLevel} onChange={set('activityLevel')} />
        <Select label="Fitness goal" options={opts(GOALS)} value={f.fitnessGoal} onChange={set('fitnessGoal')} />
        <Select label="Experience level" options={opts(LEVELS)} value={f.experienceLevel} onChange={set('experienceLevel')} />
        <Select label="Workout days per week" options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n}` }))} value={f.workoutDaysPerWeek} onChange={set('workoutDaysPerWeek')} />
        <Select label="Dietary preference" options={opts(DIETS)} value={f.dietaryPreference} onChange={set('dietaryPreference')} />
        <button className="btn-primary py-3 sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : 'Finish setup'}</button>
      </form>
    </AuthLayout>
  );
}
