import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { Input, Select, PasswordInput } from '@/components/ui';
import GoogleSignIn from '@/components/GoogleSignIn';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/lib/api';
import { GOALS, LEVELS, DIETS, ACTIVITY, label } from '@/lib/utils';

const opts = (arr: readonly string[]) => arr.map((v) => ({ value: v, label: label(v) }));
const STEPS = ['Account', 'Body', 'Goals'];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    fullName: '', email: '', password: '', gender: 'male', age: '', height: '', weight: '', targetWeight: '',
    fitnessGoal: 'general_fitness', experienceLevel: 'beginner', workoutDaysPerWeek: '3', dietaryPreference: 'no_preference', activityLevel: 'moderate',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const stepError = () => {
    if (step === 0) {
      if (f.fullName.trim().length < 2) return 'Please enter your full name';
      if (!/\S+@\S+\.\S+/.test(f.email)) return 'Please enter a valid email';
      if (f.password.length < 8) return 'Password must be at least 8 characters';
    }
    if (step === 1) {
      if (Number(f.age) < 10 || Number(f.age) > 100) return 'Please enter your age (10-100)';
      if (Number(f.height) < 80 || Number(f.height) > 260) return 'Please enter your height in cm';
      if (Number(f.weight) < 20 || Number(f.weight) > 400) return 'Please enter your weight in kg';
    }
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = stepError(); if (err) return toast.error(err);
    if (step < 2) { setStep(step + 1); return; }
    setBusy(true);
    try {
      await register({ ...f, email: f.email.trim(), age: Number(f.age), height: Number(f.height), weight: Number(f.weight), targetWeight: f.targetWeight ? Number(f.targetWeight) : undefined, workoutDaysPerWeek: Number(f.workoutDaysPerWeek) });
      toast.success('Welcome aboard! 🚀'); nav('/', { replace: true });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Three quick steps so the co-pilot can personalise everything." wide>
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-2 rounded-full transition ${i <= step ? 'bg-brand-500 ' : 'well'}`} />
            <p className={`mt-1.5 text-xs font-extrabold ${i === step ? 'text-brand-500' : 'text-zinc-400'}`}>{s}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={submit} noValidate>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="grid gap-4 sm:grid-cols-2">
            {step === 0 && (
              <>
                <Input label="Full name" name="fullName" required autoComplete="name" placeholder="Alex Carter" value={f.fullName} onChange={set('fullName')} className="sm:col-span-2" />
                <Input label="Email" type="email" name="email" required autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set('email')} />
                <PasswordInput label="Password" name="password" required minLength={8} autoComplete="new-password" hint="At least 8 characters" placeholder="Create a password" value={f.password} onChange={set('password')} />
                <div className="sm:col-span-2">
                  <div className="my-1 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-zinc-400"><span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />or<span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" /></div>
                  <div className="mt-3"><GoogleSignIn label="signup_with" /></div>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <Select label="Gender" name="gender" options={opts(['male', 'female', 'other'])} value={f.gender} onChange={set('gender')} />
                <Input label="Age" type="number" name="age" required min={10} max={100} value={f.age} onChange={set('age')} />
                <Input label="Height (cm)" type="number" name="height" required min={80} max={260} value={f.height} onChange={set('height')} />
                <Input label="Current weight (kg)" type="number" step="0.1" name="weight" required min={20} max={400} value={f.weight} onChange={set('weight')} />
                <Input label="Target weight (kg)" type="number" step="0.1" name="targetWeight" min={20} max={400} value={f.targetWeight} onChange={set('targetWeight')} hint="Optional" />
                <Select label="Activity level" name="activityLevel" options={opts(ACTIVITY)} value={f.activityLevel} onChange={set('activityLevel')} />
              </>
            )}
            {step === 2 && (
              <>
                <Select label="Fitness goal" name="fitnessGoal" options={opts(GOALS)} value={f.fitnessGoal} onChange={set('fitnessGoal')} />
                <Select label="Experience level" name="experienceLevel" options={opts(LEVELS)} value={f.experienceLevel} onChange={set('experienceLevel')} />
                <Select label="Workout days per week" name="workoutDaysPerWeek" options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} day${n > 1 ? 's' : ''}` }))} value={f.workoutDaysPerWeek} onChange={set('workoutDaysPerWeek')} />
                <Select label="Dietary preference" name="dietaryPreference" options={opts(DIETS)} value={f.dietaryPreference} onChange={set('dietaryPreference')} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="btn-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</button>
          <button className="btn-primary min-w-36 py-3" disabled={busy}>{step < 2 ? 'Continue' : busy ? 'Creating…' : 'Create account'}</button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">Already have an account? <Link to="/login" className="font-extrabold text-brand-500 hover:underline">Log in</Link></p>
    </AuthLayout>
  );
}
