import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errMsg } from '@/lib/api';
import type { Notification, User } from '@/types';
import { PageLoader, Input, Select, Textarea, Badge } from '@/components/ui';
import { fmtDateTime } from '@/lib/utils';

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [f, setF] = useState({ userId: '', title: '', message: '', type: 'system', link: '' });
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'notifications'], queryFn: async () => (await api.get('/admin/notifications')).data.items as Notification[] });
  const users = useQuery({ queryKey: ['admin', 'users', '', 1, 'all'], queryFn: async () => (await api.get('/admin/users', { params: { limit: 50 } })).data.items as User[] });
  const send = useMutation({ mutationFn: () => api.post('/admin/notifications', { ...f, userId: f.userId || null, link: f.link || undefined }), onSuccess: () => { toast.success(f.userId ? 'Notification sent' : 'Broadcast sent to all users'); setF({ ...f, title: '', message: '' }); qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); }, onError: (e) => toast.error(errMsg(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/notifications/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }) });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Send notification</h2>
        <Select label="Recipient" options={[{ value: '', label: 'All users (broadcast)' }, ...(users.data || []).map((u) => ({ value: u._id, label: `${u.fullName} (${u.email})` }))]} value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} />
        <Select label="Type" options={['system', 'workout', 'water', 'weight', 'meal', 'ai'].map((t) => ({ value: t, label: t }))} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} />
        <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Textarea label="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
        <Input label="Link (optional)" placeholder="/session" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
        <button className="btn-primary w-full" disabled={!f.title || !f.message || send.isPending} onClick={() => send.mutate()}><Send className="h-4 w-4" /> Send</button>
      </div>
      <div className="card p-5 lg:col-span-2">
        <h2 className="mb-3 font-bold">Recent notifications</h2>
        {isLoading ? <PageLoader /> : (
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-white/5">
            {data?.map((n) => (
              <li key={n._id} className="flex items-start justify-between gap-3 py-2">
                <div><p className="font-semibold">{n.title} <Badge color="slate">{n.type}</Badge> {!n.user && <Badge color="violet">broadcast</Badge>}</p><p className="text-xs text-slate-500">{n.message}</p><p className="text-[11px] text-slate-400">{typeof n.user === 'object' && n.user ? `${n.user.fullName} · ` : ''}{fmtDateTime(n.createdAt)}{n.read ? ' · read' : ''}</p></div>
                <button className="btn-ghost p-1.5 text-rose-500" onClick={() => remove.mutate(n._id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!data?.length && <li className="py-6 text-center text-slate-500">No notifications yet.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
