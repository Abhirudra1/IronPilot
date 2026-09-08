import { forwardRef, useEffect, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Layout ---------- */
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card p-4 sm:p-5', className)} {...rest}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      {/* On phones the app bar already shows the page title, so only the one-line description is repeated here */}
      <div className="flex items-center gap-3">
        {icon && <div className="hidden h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-500 lg:grid">{icon}</div>}
        <div className="min-w-0">
          <h1 className="hidden text-2xl font-extrabold tracking-tight lg:block">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-white/10">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} aria-label="Loading" />;
export const PageLoader = () => <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>;

/* ---------- Form ---------- */
type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string };
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...rest }, ref) => {
  const inputId = id || rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input ref={ref} id={inputId} className={cn('input', error && 'border-rose-500')} aria-invalid={!!error} {...rest} />
      {error ? <p className="mt-1 text-xs text-rose-500">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
});
Input.displayName = 'Input';

/** Password field with a show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...rest }, ref) => {
  const [show, setShow] = useState(false);
  const inputId = id || rest.name || 'password';
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <div className="relative">
        <input ref={ref} id={inputId} type={show ? 'text' : 'password'} className={cn('input pr-12', error && 'ring-2 ring-rose-400')} aria-invalid={!!error} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} tabIndex={-1}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-500">{error}</p> : hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[]; error?: string };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, options, error, className, id, ...rest }, ref) => {
  const selectId = id || rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select ref={ref} id={selectId} className={cn('input', error && 'border-rose-500')} {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(({ label, className, id, ...rest }, ref) => (
  <div className={className}>
    {label && <label htmlFor={id || rest.name} className="label">{label}</label>}
    <textarea ref={ref} id={id || rest.name} className="input min-h-[90px]" {...rest} />
  </div>
));
Textarea.displayName = 'Textarea';

/* ---------- Feedback ---------- */
export function Badge({ children, color = 'brand', className }: { children: ReactNode; color?: 'brand' | 'green' | 'amber' | 'rose' | 'slate' | 'violet'; className?: string }) {
  const map = {
    brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300', green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  };
  return <span className={cn('chip', map[color], className)}>{children}</span>;
}

const ACCENTS: Record<string, string> = {
  brand: 'bg-brand-500/10 text-brand-500', orange: 'bg-orange-500/10 text-orange-500', sky: 'bg-sky-500/10 text-sky-500', violet: 'bg-violet-500/10 text-violet-500',
  emerald: 'bg-emerald-500/10 text-emerald-500', rose: 'bg-rose-500/10 text-rose-500', amber: 'bg-amber-500/10 text-amber-500',
};
export function Stat({ label, value, sub, icon, accent = 'brand' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: keyof typeof ACCENTS }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      {icon && <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', ACCENTS[accent] || ACCENTS.brand)}>{icon}</div>}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-xl font-bold">{value}</p>
        {sub && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 96, stroke = 9, color = '#5a9e0c', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-200 dark:text-white/10" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (v / 100) * c }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, max, color = 'bg-brand-500', className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex max-w-full overflow-x-auto rounded-xl bg-zinc-100 p-1 scrollbar-none dark:bg-white/5 sm:inline-flex', className)}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn('min-h-9 shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition sm:flex-none', value === t.value ? 'bg-white text-zinc-900 shadow-card dark:bg-surface-600 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            className={cn('card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-2xl', size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}>
            <div className="mb-4 flex items-center justify-between">
              {title && <h2 className="text-lg font-bold">{title}</h2>}
              <button onClick={onClose} className="btn-ghost -mr-2 h-9 w-9 rounded-full p-0" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, onClose, onConfirm, title, message, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>Confirm</button>
      </div>
    </Modal>
  );
}

export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  // min-w-0 so a grid/flex item never grows past its column because of long, non-wrapping content
  return <motion.div className={cn('min-w-0', className)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>{children}</motion.div>;
}
