import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Input, Select, Textarea, Stat, FadeIn } from '@/components/ui';
import { GOALS, LEVELS, DIETS, ACTIVITY, label, bmiCategory } from '@/lib/utils';

const opts = (arr: readonly string[]) => arr.map((v) => ({ value: v, label: label(v) }));

export default function Profile() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const u = user!;
  const [f, setF] = useState({
    fullName: u.fullName, gender: u.gender, age: String(u.age || ''), height: String(u.height || ''), weight: String(u.weight || ''), currentWeight: String(u.currentWeight || ''), targetWeight: String(u.targetWeight || ''),
    fitnessGoal: u.fitnessGoal, experienceLevel: u.experienceLevel, workoutDaysPerWeek: String(u.workoutDaysPerWeek), dietaryPreference: u.dietaryPreference, activityLevel: u.activityLevel, medicalNotes: u.medicalNotes || '',
    chest: String(u.measurements?.chest || ''), waist: String(u.measurements?.waist || ''), hips: String(u.measurements?.hips || ''), arms: String(u.measurements?.arms || ''), thighs: String(u.measurements?.thighs || ''), avatarUrl: u.avatarUrl || '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = useMutation({
    mutationFn: () => api.patch('/users/profile', {
      fullName: f.fullName, gender: f.gender, age: Number(f.age), height: Number(f.height), weight: Number(f.weight), currentWeight: Number(f.currentWeight), targetWeight: Number(f.targetWeight) || undefined,
      fitnessGoal: f.fitnessGoal, experienceLevel: f.experienceLevel, workoutDaysPerWeek: Number(f.workoutDaysPerWeek), dietaryPreference: f.dietaryPreference, activityLevel: f.activityLevel, medicalNotes: f.medicalNotes || null, avatarUrl: f.avatarUrl || null,
      measurements: Object.fromEntries(['chest', 'waist', 'hips', 'arms', 'thighs'].filter((k) => f[k as keyof typeof f]).map((k) => [k, Number(f[k as keyof typeof f])])),
    }),
    onSuccess: (r) => { setUser(r.data.user); toast.success('Profile saved'); qc.invalidateQueries({ queryKey: ['dashboard'] }); }, onError: (e) => toast.error(errMsg(e)),
  });

  const bmi = f.height && f.currentWeight ? Math.round((Number(f.currentWeight) / ((Number(f.height) / 100) ** 2)) * 10) / 10 : null;
  const onAvatar = async (file?: File) => {
    if (!file) return;
    const bmp = await createImageBitmap(file); const c = document.createElement('canvas'); const s = Math.min(1, 256 / Math.max(bmp.width, bmp.height));
    c.width = bmp.width * s; c.height = bmp.height * s; c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    setF({ ...f, avatarUrl: c.toDataURL('image/jpeg', 0.85) });
  };

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
      <PageHeader title="Profile" subtitle="Your body stats and goals drive every calculation and AI recommendation." icon={<UserIcon className="h-6 w-6" />} actions={<button className="btn-primary" disabled={save.isPending}><Save className="h-4 w-4" /> Save changes</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="BMI" value={bmi ?? '-'} sub={bmiCategory(bmi)} />
        <Stat label="Daily calories" value={u.calorieTarget || '-'} sub="kcal target" accent="orange" />
        <Stat label="Protein target" value={`${u.proteinTarget || '-'} g`} accent="rose" />
        <Stat label="Water goal" value={`${u.waterGoalMl} ml`} accent="sky" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn><div className="card space-y-3 p-5">
          <h2 className="font-bold">Personal information</h2>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-brand-500/15 text-2xl font-bold text-brand-500">{f.avatarUrl ? <img src={f.avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : u.fullName[0]}</div>
            <div><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} /><button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" /> Change photo</button><p className="mt-1 text-xs text-slate-500">{u.email}</p></div>
          </div>
          <Input label="Full name" value={f.fullName} onChange={set('fullName')} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Gender" options={opts(['male', 'female', 'other'])} value={f.gender} onChange={set('gender')} />
            <Input label="Age" type="number" value={f.age} onChange={set('age')} />
            <Input label="Height (cm)" type="number" value={f.height} onChange={set('height')} />
            <Select label="Activity level" options={opts(ACTIVITY)} value={f.activityLevel} onChange={set('activityLevel')} />
          </div>
          <Textarea label="Medical notes (optional)" placeholder="Injuries, conditions, medication - the coach will respect these." value={f.medicalNotes} onChange={set('medicalNotes')} />
        </div></FadeIn>
        <div className="space-y-4">
          <FadeIn delay={0.05}><div className="card space-y-3 p-5">
            <h2 className="font-bold">Weight & goals</h2>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Start (kg)" type="number" step="0.1" value={f.weight} onChange={set('weight')} />
              <Input label="Current (kg)" type="number" step="0.1" value={f.currentWeight} onChange={set('currentWeight')} />
              <Input label="Target (kg)" type="number" step="0.1" value={f.targetWeight} onChange={set('targetWeight')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Fitness goal" options={opts(GOALS)} value={f.fitnessGoal} onChange={set('fitnessGoal')} />
              <Select label="Experience" options={opts(LEVELS)} value={f.experienceLevel} onChange={set('experienceLevel')} />
              <Select label="Days per week" options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n}` }))} value={f.workoutDaysPerWeek} onChange={set('workoutDaysPerWeek')} />
              <Select label="Dietary preference" options={opts(DIETS)} value={f.dietaryPreference} onChange={set('dietaryPreference')} />
            </div>
          </div></FadeIn>
          <FadeIn delay={0.1}><div className="card p-5">
            <h2 className="mb-3 font-bold">Body measurements (cm)</h2>
            <div className="grid grid-cols-5 gap-2">
              {(['chest', 'waist', 'hips', 'arms', 'thighs'] as const).map((k) => <Input key={k} label={label(k)} type="number" value={f[k]} onChange={set(k)} />)}
            </div>
          </div></FadeIn>
        </div>
      </div>
    </form>
  );
}
