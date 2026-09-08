import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Shield, Users, Library, Dumbbell, Utensils, Bell, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminLibrary from './AdminLibrary';
import AdminDiets from './AdminDiets';
import AdminNotifications from './AdminNotifications';

const NAV = [
  { to: '', label: 'Analytics', icon: BarChart3, end: true },
  { to: 'users', label: 'Users', icon: Users },
  { to: 'equipment', label: 'Equipment', icon: Library },
  { to: 'exercises', label: 'Exercises', icon: Dumbbell },
  { to: 'diets', label: 'Diet templates', icon: Utensils },
  { to: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Admin() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-500"><Shield className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold">Admin Panel</h1><p className="text-sm text-slate-500">Manage users, content, templates and notifications.</p></div></div>
      <nav className="mb-5 flex gap-1 overflow-x-auto scrollbar-thin" aria-label="Admin sections">
        {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium', isActive ? 'bg-violet-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5')}><n.icon className="h-4 w-4" /> {n.label}</NavLink>)}
      </nav>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="equipment" element={<AdminLibrary kind="equipment" />} />
        <Route path="exercises" element={<AdminLibrary kind="exercises" />} />
        <Route path="diets" element={<AdminDiets />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  );
}
