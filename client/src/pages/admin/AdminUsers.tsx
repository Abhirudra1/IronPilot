import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { User } from '@/types';
import { PageLoader, Badge } from '@/components/ui';
import { fmtDate, label } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users', search, page], queryFn: async () => (await api.get('/admin/users', { params: { search, page } })).data as { items: User[]; total: number; pages: number } });
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<User> }) => api.patch(`/admin/users/${id}`, body), onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); }, onError: (e) => toast.error(errMsg(e)) });
  return (
    <div>
      <div className="relative mb-3 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search users" /></div>
      {isLoading || !data ? <PageLoader /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5"><tr><th className="px-4 py-2">User</th><th className="px-4 py-2">Goal</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Workouts</th><th className="px-4 py-2">Joined</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {data.items.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-2"><p className="font-semibold">{u.fullName} {u.role === 'admin' && <Badge color="violet">admin</Badge>}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="px-4 py-2">{label(u.fitnessGoal)}<p className="text-xs text-slate-500">{u.experienceLevel}</p></td>
                  <td className="px-4 py-2">L{u.level} · {u.points} pts</td>
                  <td className="px-4 py-2">{u.totalWorkouts} · {Math.round(u.totalWorkoutMinutes / 60)} h</td>
                  <td className="px-4 py-2 text-slate-500">{fmtDate(u.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2"><Badge color={u.isActive ? 'green' : 'rose'}>{u.isActive ? 'active' : 'disabled'}</Badge></td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" title={u.role === 'admin' ? 'Make user' : 'Make admin'} disabled={u._id === me?._id} onClick={() => update.mutate({ id: u._id, body: { role: u.role === 'admin' ? 'user' : 'admin' } })}><ShieldCheck className={`h-4 w-4 ${u.role === 'admin' ? 'text-violet-500' : 'text-slate-400'}`} /></button>
                      <button className="btn-ghost p-1.5" title={u.isActive ? 'Disable' : 'Enable'} disabled={u._id === me?._id} onClick={() => update.mutate({ id: u._id, body: { isActive: !u.isActive } })}>{u.isActive ? <UserX className="h-4 w-4 text-rose-500" /> : <UserCheck className="h-4 w-4 text-emerald-500" />}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.pages > 1 && <div className="flex items-center justify-center gap-3 p-3 text-sm"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button><span>{page} / {data.pages} · {data.total} users</span><button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
        </div>
      )}
    </div>
  );
}
