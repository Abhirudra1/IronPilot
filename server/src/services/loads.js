import { WorkoutLog } from '../models/index.js';
import { daysAgo } from '../utils/dates.js';

/*
 * Starting-load suggestions, the way an experienced coach would set them:
 *  - if the user has lifted the exercise before, repeat the last load (or add ~2.5% when every set hit 10+ reps)
 *  - otherwise estimate from body weight, experience level and sex per movement pattern, rounded to real plates
 *  - body-weight movements get 0 kg
 */
const LEVEL = { beginner: 0, intermediate: 1, advanced: 2 };
// fraction of body weight per level [beginner, intermediate, advanced]; barbell/machine totals
const BW_FRACTION = {
  bench: [0.35, 0.6, 0.9], overhead: [0.25, 0.4, 0.6], row: [0.3, 0.5, 0.75], pulldown: [0.4, 0.6, 0.8],
  squat: [0.5, 0.9, 1.3], hinge: [0.6, 1.0, 1.5], legpress: [1.0, 1.6, 2.2], legiso: [0.3, 0.5, 0.7],
  curl: [0.1, 0.16, 0.22], triceps: [0.15, 0.25, 0.35], isolation: [0.08, 0.12, 0.18], calf: [0.5, 0.9, 1.2], core: [0.1, 0.18, 0.25],
};
const BODYWEIGHT = /push-?up|pull-?up|chin-?up|plank|crunch|sit-?up|dip|burpee|mountain|leg raise|bodyweight|air squat|lunge(?!.*dumbbell)/i;

export function patternOf(name) {
  const n = name.toLowerCase();
  const has = (...k) => k.some((s) => n.includes(s));
  if (has('leg press')) return 'legpress';
  if (has('leg extension', 'leg curl')) return 'legiso';
  if (has('calf')) return 'calf';
  if (has('squat', 'lunge')) return 'squat';
  if (has('deadlift', 'romanian', 'hinge', 'swing', 'good morning', 'hip thrust')) return 'hinge';
  if (has('shoulder press', 'overhead', 'military')) return 'overhead';
  if (has('bench', 'chest press', 'incline', 'decline')) return 'bench';
  if (has('pulldown', 'pull-up', 'chin')) return 'pulldown';
  if (has('row', 'face pull')) return 'row';
  if (has('curl')) return 'curl';
  if (has('pushdown', 'extension', 'kickback', 'skull')) return 'triceps';
  if (has('woodchop', 'twist', 'cable crunch')) return 'core';
  return 'isolation';
}

const roundTo = (v, step) => Math.max(step, Math.round(v / step) * step);

/** Estimated first-session load in kg (per hand for dumbbells/kettlebells). */
export function defaultLoad(user, exerciseName, equipmentName = '') {
  if (BODYWEIGHT.test(exerciseName) && !/dumbbell|barbell|weighted/i.test(exerciseName)) return { weight: 0, note: 'Body weight - add load only when all sets feel easy' };
  const bw = user.currentWeight || user.weight || 70;
  const lvl = LEVEL[user.experienceLevel] ?? 0;
  const sex = user.gender === 'female' ? 0.7 : 1;
  const pattern = patternOf(exerciseName);
  const total = bw * BW_FRACTION[pattern][lvl] * sex;
  const perHand = /dumbbell|kettlebell/i.test(`${exerciseName} ${equipmentName}`);
  if (perHand) return { weight: roundTo(total / 2, 1), note: 'per hand - conservative starting weight, add 1-2 kg when 12 reps feel easy' };
  const step = /machine|cable|pec deck|pulldown|leg press|leg extension|leg curl/i.test(`${exerciseName} ${equipmentName}`) ? 5 : 2.5;
  return { weight: roundTo(total, step), note: 'starting weight estimate - adjust to a load you can lift with good form for all reps' };
}

/** Last / best load per exercise from the user's logs (last 90 days). */
export async function exerciseHistory(user, days = 90) {
  const logs = await WorkoutLog.find({ user: user._id, type: 'strength', performedAt: { $gte: daysAgo(days) } }).sort({ performedAt: -1 }).select('exerciseName weight reps sets performedAt').lean();
  const map = new Map();
  for (const l of logs) {
    const k = l.exerciseName.toLowerCase();
    const repsPerSet = Math.round((l.reps || 0) / (l.sets || 1));
    if (!map.has(k)) map.set(k, { name: l.exerciseName, lastWeight: l.weight || 0, lastRepsPerSet: repsPerSet, best: l.weight || 0, sessions: 1, lastDate: l.performedAt });
    else { const h = map.get(k); h.best = Math.max(h.best, l.weight || 0); h.sessions += 1; }
  }
  return map;
}

export function suggestLoad(user, exerciseName, equipmentName, history) {
  const h = history.get(exerciseName.toLowerCase());
  if (h && h.lastWeight > 0) {
    const progress = h.lastRepsPerSet >= 10;
    const step = /dumbbell|kettlebell/i.test(`${exerciseName} ${equipmentName}`) ? 1 : 2.5;
    const weight = progress ? roundTo(h.lastWeight * 1.05, step) : h.lastWeight;
    return { weight, source: 'history', note: progress ? `last time ${h.lastWeight} kg x ${h.lastRepsPerSet} reps - progress to ${weight} kg` : `repeat ${h.lastWeight} kg and aim for more reps` };
  }
  return { ...defaultLoad(user, exerciseName, equipmentName), source: 'estimate' };
}

/** Fill in weight + coaching note for every strength exercise that has no load yet. */
export async function applyStartingLoads(user, exercises, history) {
  const hist = history || await exerciseHistory(user);
  for (const e of exercises) {
    if (e.type === 'cardio') continue;
    if (e.weight > 0 && e.notes) continue;
    const s = suggestLoad(user, e.exerciseName, e.equipmentName || '', hist);
    if (!e.weight) e.weight = s.weight;
    e.notes = e.notes ? `${e.notes} · ${s.note}` : s.note;
    e.loadSource = s.source;
  }
  return exercises;
}

export function historyText(history, limit = 15) {
  const rows = [...history.values()].sort((a, b) => b.sessions - a.sessions).slice(0, limit);
  return rows.length ? rows.map((h) => `${h.name}: last ${h.lastWeight} kg x ${h.lastRepsPerSet} reps, best ${h.best} kg, ${h.sessions} sessions`).join('\n') : 'no strength logs yet';
}
