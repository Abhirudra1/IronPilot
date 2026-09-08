import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { Users, Activity, Dumbbell, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { PageLoader, Stat } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

interface Stats { users: number; activeUsers: number; sessions: number; sessions30: number; equipment: number; exercises: number; aiCalls: number; topEquipment: { name: string; count: number }[]; days: { date: string; sessions: number; signups: number }[] }
const tip = { contentStyle: { borderRadius: 12, border: 'none', background: '#111a2e', color: '#fff' } };

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => (await api.get('/admin/stats')).data.data as Stats });
  if (isLoading || !data) return <PageLoader />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={data.users} sub={`${data.activeUsers} active (7d)`} icon={<Users className="h-5 w-5" />} />
        <Stat label="Sessions" value={data.sessions} sub={`${data.sessions30} in last 30 days`} icon={<Activity className="h-5 w-5" />} accent="emerald" />
        <Stat label="Library" value={`${data.equipment} / ${data.exercises}`} sub="equipment / exercises" icon={<Dumbbell className="h-5 w-5" />} accent="violet" />
        <Stat label="AI calls" value={data.aiCalls} sub="stored recommendations" icon={<Sparkles className="h-5 w-5" />} accent="orange" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><h2 className="mb-3 font-bold">Sessions & signups (30 days)</h2><div className="h-64"><ResponsiveContainer><AreaChart data={data.days}><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/10" /><XAxis dataKey="date" tickFormatter={(d) => fmtDate(d)} tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} /><Tooltip {...tip} /><Legend /><Area type="monotone" dataKey="sessions" stroke="#0ea5e9" fill="#0ea5e955" name="Sessions" /><Area type="monotone" dataKey="signups" stroke="#84cc16" fill="#84cc1655" name="Signups" /></AreaChart></ResponsiveContainer></div></div>
        <div className="card p-5"><h2 className="mb-3 font-bold">Top equipment (all users)</h2><div className="h-64"><ResponsiveContainer><BarChart data={data.topEquipment} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="#94a3b8" /><Tooltip {...tip} /><Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Uses" /></BarChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
}
