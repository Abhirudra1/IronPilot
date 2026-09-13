import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Deliberately free of framer-motion: these render as route-level Suspense fallbacks, which live in
// the eagerly-loaded entry chunk. Importing the animation library here would pull it back in.

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div style={style} className={cn('animate-pulse rounded-md bg-zinc-200/80 dark:bg-white/[0.08]', className)} />;
}

/** Announces the wait to screen readers, which would otherwise be read an empty page. */
function Screen({ children, label = 'Loading' }: { children: ReactNode; label?: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/* ---------- Building blocks (shaped like their real counterparts in components/ui) ---------- */

export function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="hidden h-11 w-11 rounded-2xl lg:block" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="hidden h-7 w-48 lg:block" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      {actions && <div className="flex gap-2"><Skeleton className="h-11 w-32 rounded-xl" /><Skeleton className="h-11 w-28 rounded-xl" /></div>}
    </div>
  );
}

export function TabsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mb-4 inline-flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
      {range(count).map((i) => <Skeleton key={i} className="h-8 w-24 rounded-lg" />)}
    </div>
  );
}

/** Mirrors <Stat>: icon tile + label line + value line. */
export function StatGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3', className)}>
      {range(count).map((i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Plans-style: title, chips, a few list rows, footer meta. */
export function CardGridSkeleton({ count = 6, rows = 4, className }: { count?: number; rows?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {range(count).map((i) => (
        <div key={i} className="card flex flex-col p-4 sm:p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-3.5 w-1/3" />
          <div className="mt-3 flex gap-1.5">
            {range(3).map((c) => <Skeleton key={c} className="h-6 w-16 rounded-full" />)}
          </div>
          <div className="mt-3 space-y-2">
            {range(rows).map((r) => (
              <div key={r} className="flex justify-between gap-2">
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3.5 w-12 shrink-0" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3 pt-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></div>
        </div>
      ))}
    </div>
  );
}

/** Equipment/exercise library: h-40 image on top of the card, then text. */
export function MediaGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {range(count).map((i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-4/5" />
            <div className="mt-2 flex gap-1">{range(3).map((c) => <Skeleton key={c} className="h-6 w-14 rounded-full" />)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Exercise library: compact rows in a 3-up grid, each with a muscle-colour bar. */
export function ExerciseGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {range(count).map((i) => (
        <div key={i} className="card flex items-start gap-3 p-4">
          <Skeleton className="h-12 w-1.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
          </div>
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}

/** History/schedule-style stacked rows. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {range(rows).map((i) => (
        <div key={i} className="card flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
          </div>
          <div className="hidden shrink-0 space-y-2 sm:block"><Skeleton className="h-3.5 w-16" /><Skeleton className="h-3.5 w-16" /></div>
        </div>
      ))}
    </div>
  );
}

// Fixed heights (not random) so the bars don't reshuffle on every re-render.
const BAR_HEIGHTS = ['45%', '70%', '35%', '85%', '55%', '95%', '40%', '75%', '60%', '30%', '80%', '50%'];

export function ChartSkeleton({ className, title = true }: { className?: string; title?: boolean }) {
  return (
    <div className={cn('card p-5', className)}>
      {title && <Skeleton className="mb-4 h-5 w-40" />}
      <div className="flex h-52 items-end gap-2">
        {BAR_HEIGHTS.map((h, i) => <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: h }} />)}
      </div>
      <div className="mt-3 flex justify-between">{range(4).map((i) => <Skeleton key={i} className="h-3 w-10" />)}</div>
    </div>
  );
}

export function FormSkeleton({ fields = 6, columns = 2 }: { fields?: number; columns?: number }) {
  return (
    <div className="card space-y-4 p-5">
      <Skeleton className="h-5 w-40" />
      <div className={cn('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>
        {range(fields).map((i) => (
          <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-11 w-full rounded-xl" /></div>
        ))}
      </div>
      <Skeleton className="h-11 w-32 rounded-xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex gap-4 border-b border-zinc-200/80 p-4 dark:border-white/[0.07]">
        {range(cols).map((i) => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {range(rows).map((r) => (
        <div key={r} className="flex gap-4 border-b border-zinc-100 p-4 last:border-0 dark:border-white/5">
          {range(cols).map((c) => <Skeleton key={c} className="h-4 flex-1" />)}
        </div>
      ))}
    </div>
  );
}

/* ---------- Whole-page compositions ---------- */

export function DashboardSkeleton() {
  return (
    <Screen label="Loading your dashboard">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-28" /></div>
          <div className="flex gap-1.5"><Skeleton className="h-7 w-16 rounded-full" /><Skeleton className="h-7 w-24 rounded-full" /></div>
        </div>
        {/* Today's workout hero */}
        <div className="card overflow-hidden">
          <div className="space-y-2 bg-zinc-100 p-4 dark:bg-white/5 sm:p-5">
            <Skeleton className="h-3 w-32" /><Skeleton className="h-7 w-56 max-w-full" /><Skeleton className="h-4 w-44" />
          </div>
          <div className="space-y-3 p-3 sm:p-4">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2"><Skeleton className="h-12 flex-1 rounded-xl" /><Skeleton className="h-12 w-20 rounded-xl" /></div>
          </div>
        </div>
        {/* Quick-log shortcuts */}
        <div className="grid grid-cols-4 gap-2">
          {range(4).map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-200 bg-white px-1 py-2.5 dark:border-white/[0.07] dark:bg-surface-800">
              <Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3 w-10" /><Skeleton className="h-2.5 w-8" />
            </div>
          ))}
        </div>
        <StatGridSkeleton count={6} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card space-y-3 p-5 lg:col-span-2">
            <Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" />
          </div>
          <div className="card grid grid-cols-2 gap-3 p-4 sm:p-5">
            {range(2).map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-[84px] w-[84px] rounded-full" />
                <div className="space-y-1.5"><Skeleton className="h-8 w-14 rounded-lg" /><Skeleton className="h-8 w-14 rounded-lg" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

export function ListPageSkeleton({ rows = 6, filters = true }: { rows?: number; filters?: boolean }) {
  return (
    <Screen>
      <HeaderSkeleton />
      {filters && <div className="card mb-4 flex flex-col gap-2 p-3 md:flex-row"><Skeleton className="h-11 flex-1 rounded-xl" /><Skeleton className="h-11 w-full rounded-xl md:w-40" /><Skeleton className="h-11 w-full rounded-xl md:w-40" /></div>}
      <ListSkeleton rows={rows} />
    </Screen>
  );
}

export function LibraryPageSkeleton({ variant = 'media' }: { variant?: 'media' | 'exercise' }) {
  return (
    <Screen>
      <HeaderSkeleton actions={false} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <TabsSkeleton count={4} />
        <Skeleton className="h-11 flex-1 rounded-xl" />
      </div>
      {variant === 'exercise' ? <ExerciseGridSkeleton /> : <MediaGridSkeleton />}
    </Screen>
  );
}

export function PlansPageSkeleton() {
  return (
    <Screen>
      <HeaderSkeleton />
      <TabsSkeleton count={2} />
      <CardGridSkeleton count={6} />
    </Screen>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <Screen label="Loading analytics">
      <HeaderSkeleton />
      <TabsSkeleton count={3} />
      <StatGridSkeleton count={6} className="mb-4" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton /><ChartSkeleton />
      </div>
    </Screen>
  );
}

export function ProgressPageSkeleton() {
  return (
    <Screen>
      <HeaderSkeleton />
      <TabsSkeleton count={3} />
      <StatGridSkeleton count={4} className="mb-4 sm:grid-cols-3" />
      <ChartSkeleton />
    </Screen>
  );
}

/** Nutrition meals/water: progress ring + macro bars beside the day's entries. */
export function RingListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Screen>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-[110px] w-[110px] rounded-full" />
              <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-24" /></div>
            </div>
            <div className="mt-4 space-y-3">
              {range(3).map((i) => (
                <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-2 w-full rounded-full" /></div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2 lg:col-span-2">
          {range(rows).map((i) => (
            <div key={i} className="card flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/5" /></div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

export function DetailPageSkeleton() {
  return (
    <Screen>
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="card overflow-hidden">
        <Skeleton className="h-56 w-full rounded-none sm:h-72" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-7 w-2/5" />
          <div className="flex gap-1.5">{range(3).map((i) => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}</div>
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </Screen>
  );
}

export function ChatPageSkeleton() {
  const widths = ['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4'];
  return (
    <Screen label="Loading your coach">
      <HeaderSkeleton actions={false} />
      <div className="card flex h-[60vh] flex-col p-0">
        <div className="flex-1 space-y-4 overflow-hidden p-5">
          {widths.map((w, i) => (
            <div key={i} className={cn('flex gap-2', i % 2 === 1 && 'flex-row-reverse')}>
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className={cn('h-16 rounded-2xl', w)} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-zinc-200/80 p-3 dark:border-white/[0.07]">
          <Skeleton className="h-11 flex-1 rounded-xl" /><Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </div>
    </Screen>
  );
}

export function SessionPageSkeleton() {
  return (
    <Screen label="Loading your workout">
      <div className="space-y-4">
        <div className="card flex items-center gap-3 p-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3.5 w-28" /></div>
          <Skeleton className="h-11 w-24 rounded-xl" />
        </div>
        <div className="card space-y-4 p-5">
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
          <Skeleton className="mx-auto h-7 w-48" />
          <div className="grid grid-cols-3 gap-3">{range(3).map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <ListSkeleton rows={3} />
      </div>
    </Screen>
  );
}

export function FormPageSkeleton() {
  return (
    <Screen>
      <HeaderSkeleton actions={false} />
      <div className="grid gap-4 lg:grid-cols-2">
        <FormSkeleton fields={4} columns={1} />
        <FormSkeleton fields={4} columns={1} />
      </div>
    </Screen>
  );
}

export function BadgeGridSkeleton() {
  return (
    <Screen>
      <HeaderSkeleton actions={false} />
      <div className="card mb-5 space-y-3 p-6"><Skeleton className="h-6 w-44" /><Skeleton className="h-4 w-64 max-w-full" /><Skeleton className="h-2.5 w-full rounded-full" /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {range(8).map((i) => (
          <div key={i} className="card flex flex-col items-center gap-2 p-5">
            <Skeleton className="h-14 w-14 rounded-full" /><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function WeekPageSkeleton() {
  return (
    <Screen>
      <HeaderSkeleton />
      <div className="card mb-4 space-y-2 p-4 sm:p-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-2/3" /></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2"><ListSkeleton rows={5} /></div>
        <div className="card space-y-3 p-4 sm:p-5">
          <Skeleton className="h-5 w-32" />{range(4).map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    </Screen>
  );
}

/* ---------- Route-aware chrome ---------- */

/** Picks the placeholder that matches the page being loaded. */
export function RouteSkeleton({ pathname }: { pathname: string }) {
  const p = (pathname.replace(/\/+$/, '') || '/').toLowerCase();
  if (p === '/') return <DashboardSkeleton />;
  if (p.startsWith('/plans/')) return <FormPageSkeleton />;
  if (p === '/plans') return <PlansPageSkeleton />;
  if (p.startsWith('/equipment/')) return <DetailPageSkeleton />;
  if (p === '/exercises') return <LibraryPageSkeleton variant="exercise" />;
  if (p === '/equipment') return <LibraryPageSkeleton />;
  if (p === '/analytics') return <AnalyticsPageSkeleton />;
  if (p === '/progress') return <ProgressPageSkeleton />;
  if (p === '/coach') return <ChatPageSkeleton />;
  if (p.startsWith('/session')) return p.endsWith('/summary') ? <DetailPageSkeleton /> : <SessionPageSkeleton />;
  if (p === '/achievements') return <BadgeGridSkeleton />;
  if (p === '/week') return <WeekPageSkeleton />;
  if (p === '/profile' || p === '/settings' || p === '/onboarding') return <FormPageSkeleton />;
  if (p === '/nutrition') return <Screen><HeaderSkeleton /><TabsSkeleton /><RingListSkeleton /></Screen>;
  if (p === '/schedule') return <ListPageSkeleton filters={false} />;
  if (p.startsWith('/admin')) return <Screen><HeaderSkeleton /><StatGridSkeleton count={4} className="mb-4" /><TableSkeleton /></Screen>;
  return <ListPageSkeleton />;
}

/** Stand-in for the whole authenticated shell, used while AppShell itself is still downloading. */
export function ShellSkeleton({ pathname }: { pathname: string }) {
  return (
    <div className="min-h-[100dvh] lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-white/[0.06] dark:bg-surface-800 lg:fixed lg:inset-y-0 lg:block">
        <div className="flex items-center gap-2 px-4 py-4"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-5 w-24" /></div>
        <div className="space-y-1.5 px-3">{range(10).map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
      </aside>
      <div className="flex min-h-[100dvh] flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 dark:border-white/[0.06] dark:bg-surface/90">
          <div className="flex h-14 items-center gap-2 px-2 sm:px-4 lg:h-16">
            <Skeleton className="h-10 w-10 rounded-xl lg:hidden" />
            <Skeleton className="h-5 w-28 lg:hidden" />
            <div className="ml-auto flex gap-1"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 w-10 rounded-full" /></div>
          </div>
        </header>
        <main className="flex-1 px-4 py-4 sm:py-6">
          <div className="mx-auto max-w-6xl"><RouteSkeleton pathname={pathname} /></div>
        </main>
      </div>
    </div>
  );
}

/** Login / register / password screens: split hero + form card. */
export function AuthSkeleton() {
  return (
    <Screen>
      <div className="grid min-h-[100dvh] lg:grid-cols-2">
        <div className="hidden flex-col justify-center gap-4 p-12 lg:flex">
          <Skeleton className="h-9 w-40" /><Skeleton className="h-14 w-4/5" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" />
          <div className="mt-4 grid grid-cols-2 gap-3">{range(4).map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="card w-full max-w-md space-y-4 p-6">
            <Skeleton className="h-7 w-44" /><Skeleton className="h-4 w-56 max-w-full" />
            <div className="space-y-1.5"><Skeleton className="h-3 w-14" /><Skeleton className="h-11 w-full rounded-xl" /></div>
            <div className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-11 w-full rounded-xl" /></div>
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="mx-auto h-3 w-40" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
