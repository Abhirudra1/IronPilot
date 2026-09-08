import { clsx, type ClassValue } from 'clsx';
export const cn = (...i: ClassValue[]) => clsx(i);

export const label = (s?: string | null) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');
export const fmtDuration = (sec = 0) => { const m = Math.floor(sec / 60); const s = sec % 60; return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s).padStart(2, '0')}`; };
export const fmtMinutes = (sec = 0) => `${Math.round(sec / 60)} min`;
export const fmtDate = (d?: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => (d ? new Date(d).toLocaleDateString(undefined, opts) : '');
export const fmtDateTime = (d?: string | Date) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const GOALS = ['weight_loss', 'fat_loss', 'muscle_gain', 'strength_gain', 'body_recomposition', 'general_fitness', 'athletic_performance'];
export const LEVELS = ['beginner', 'intermediate', 'advanced'];
export const DIETS = ['no_preference', 'vegetarian', 'vegan', 'eggetarian', 'non_vegetarian', 'pescatarian', 'keto', 'high_protein', 'indian', 'gluten_free'];
export const ACTIVITY = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body', 'cardio'];
export const MUSCLE_COLORS: Record<string, string> = { chest: '#f43f5e', back: '#8b5cf6', shoulders: '#f59e0b', biceps: '#06b6d4', triceps: '#14b8a6', forearms: '#a3e635', core: '#eab308', quads: '#3b82f6', hamstrings: '#6366f1', glutes: '#ec4899', calves: '#22c55e', full_body: '#0ea5e9', cardio: '#fb7185' };

export const bmiCategory = (b?: number | null) => (b == null ? '' : b < 18.5 ? 'Underweight' : b < 25 ? 'Normal' : b < 30 ? 'Overweight' : 'Obese');
export const equipmentEmoji = (cat?: string) => (cat === 'cardio' ? '🏃' : cat === 'strength_machine' ? '🏋️' : cat === 'free_weight' ? '💪' : '🤸');
