import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthSkeleton, ShellSkeleton } from './components/ui/Skeleton';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

/** While a top-level chunk downloads, stand in with something shaped like the page being opened. */
function BootSkeleton() {
  const { pathname } = useLocation();
  return AUTH_PATHS.some((p) => pathname.startsWith(p)) ? <AuthSkeleton /> : <ShellSkeleton pathname={pathname} />;
}

// Lazy: the authenticated shell (and its framer-motion sidebar/drawer animations) is dead weight
// for anyone landing on /login, /register, or a /shared/:code link — keep it out of the entry chunk.
const AppShell = lazy(() => import('./components/layout/AppShell'));

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Plans = lazy(() => import('./pages/Plans'));
const PlanEditor = lazy(() => import('./pages/PlanEditor'));
const Schedule = lazy(() => import('./pages/Schedule'));
const WeekPlan = lazy(() => import('./pages/WeekPlan'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ServerDown = lazy(() => import('./pages/ServerDown'));
const Session = lazy(() => import('./pages/Session'));
const SessionSummary = lazy(() => import('./pages/SessionSummary'));
const History = lazy(() => import('./pages/History'));
const Equipment = lazy(() => import('./pages/Equipment'));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Progress = lazy(() => import('./pages/Progress'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Coach = lazy(() => import('./pages/Coach'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Shared = lazy(() => import('./pages/Shared'));
const Admin = lazy(() => import('./pages/admin/Admin'));

function Protected({ children, admin = false }: { children: JSX.Element; admin?: boolean }) {
  const { user, loading, serverDown } = useAuth();
  const loc = useLocation();
  if (loading) return <ShellSkeleton pathname={loc.pathname} />;
  if (!user && serverDown) return <ServerDown />; // keep the session, do not bounce to login while the API is unreachable
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  if (user.profileComplete === false && loc.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return children;
}
function Public({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthSkeleton />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Suspense fallback={<BootSkeleton />}>
      <Routes>
        <Route path="/login" element={<Public><Login /></Public>} />
        <Route path="/register" element={<Public><Register /></Public>} />
        <Route path="/forgot-password" element={<Public><ForgotPassword /></Public>} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/shared/:code" element={<Shared />} />
        <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
        <Route element={<Protected><AppShell /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="plans" element={<Plans />} />
          <Route path="plans/new" element={<PlanEditor />} />
          <Route path="plans/:id" element={<PlanEditor />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="week" element={<WeekPlan />} />
          <Route path="session" element={<Session />} />
          <Route path="session/:id/summary" element={<SessionSummary />} />
          <Route path="history" element={<History />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="equipment/:slug" element={<EquipmentDetail />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="progress" element={<Progress />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="coach" element={<Coach />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin/*" element={<Protected admin><Admin /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
