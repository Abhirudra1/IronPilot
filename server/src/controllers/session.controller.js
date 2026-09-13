import crypto from 'crypto';
import { escapeRegex, safeSearch } from '../utils/security.js';
import { z } from 'zod';
import { WorkoutSession, WorkoutPlan, WorkoutLog, Exercise, Equipment } from '../models/index.js';
import { notFound, badRequest } from '../utils/ApiError.js';
import { caloriesBurned } from '../utils/fitness.js';
import { updateStreak } from '../services/streak.js';
import { evaluateAchievements } from '../services/achievements.js';
import { sessionSummary } from '../services/aiCoach.js';
import { buildWarmup, buildCooldown } from '../services/routines.js';
import { dayName } from '../utils/dates.js';

export const startSchema = z.object({
  planId: z.string().optional(),
  checkInMethod: z.enum(['manual', 'qr']).optional(),
  gymCode: z.string().max(64).optional(),
  exercises: z.array(z.object({
    exerciseName: z.string(), exercise: z.string().optional().nullable(), equipment: z.string().optional().nullable(), equipmentName: z.string().optional(),
    muscleGroup: z.string().optional(), type: z.enum(['strength', 'cardio', 'flexibility']).optional(),
    sets: z.number().optional(), reps: z.number().optional(), weight: z.number().optional(), duration: z.number().optional(), restSeconds: z.number().optional(),
  })).optional(),
});
export const setSchema = z.object({ setNumber: z.number().min(1), reps: z.number().min(0).max(500), weight: z.number().min(0).max(1000), durationSeconds: z.number().optional() });
export const cardioSchema = z.object({ durationSeconds: z.number().min(1), distanceKm: z.number().min(0).optional(), speedKmh: z.number().min(0).optional(), notes: z.string().optional() });
export const finishSchema = z.object({ withSummary: z.boolean().optional(), rating: z.number().min(1).max(5).optional(), notes: z.string().max(1000).optional(), durationSeconds: z.number().min(0).optional() });
export const addExerciseSchema = z.object({ exerciseId: z.string().optional(), exerciseName: z.string().optional(), sets: z.number().optional(), reps: z.number().optional(), weight: z.number().optional(), duration: z.number().optional() });

const userWeight = (u) => u.currentWeight || u.weight || 70;

function planToSessionExercises(exs) {
  return exs.map((e, i) => ({
    planExerciseId: e._id, exercise: e.exercise, exerciseName: e.exerciseName, equipment: e.equipment, equipmentName: e.equipmentName,
    muscleGroup: e.muscleGroup, type: e.type || 'strength', targetSets: e.sets, targetReps: e.reps, targetWeight: e.weight,
    targetDuration: e.duration, restSeconds: e.restSeconds || 60, sets: [], status: 'pending', order: i,
  }));
}

async function metFor(ex) {
  if (ex.exercise) { const e = await Exercise.findById(ex.exercise).select('metActivity').lean(); if (e?.metActivity) return e.metActivity; }
  if (ex.equipment) { const q = await Equipment.findById(ex.equipment).select('metActivity').lean(); if (q?.metActivity) return q.metActivity; }
  return ex.type === 'cardio' ? 'default' : 'strength';
}

function recomputeTotals(session) {
  session.totalCalories = session.exercises.reduce((a, e) => a + (e.caloriesBurned || 0), 0);
  session.totalVolume = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).reduce((b, s) => b + (s.reps || 0) * (s.weight || 0), 0), 0);
  session.muscleGroups = [...new Set(session.exercises.filter((e) => e.status === 'completed' && e.muscleGroup).map((e) => e.muscleGroup))];
}

async function loadActive(req) {
  const s = await WorkoutSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!s) throw notFound('Session not found');
  if (['completed', 'abandoned'].includes(s.status)) throw badRequest('Session already finished');
  return s;
}

export async function start(req, res) {
  const existing = await WorkoutSession.findOne({ user: req.user._id, status: { $in: ['active', 'paused'] } });
  if (existing) return res.json({ success: true, item: existing, resumed: true });

  let plan = null;
  if (req.body.planId) plan = await WorkoutPlan.findOne({ _id: req.body.planId, $or: [{ user: req.user._id }, { isPublic: true }] }).lean();
  else if (!req.body.exercises?.length) plan = await WorkoutPlan.findOne({ user: req.user._id, isActive: true, scheduledDays: dayName() }).lean();

  const exercises = plan ? planToSessionExercises(plan.exercises) : planToSessionExercises((req.body.exercises || []).map((e) => ({ ...e })));
  const groups = plan?.muscleGroups?.length ? plan.muscleGroups : [...new Set(exercises.map((e) => e.muscleGroup).filter(Boolean))];
  const routineOpts = { firstExercise: exercises.find((e) => e.type !== 'cardio')?.exerciseName, level: req.user.experienceLevel, hasStrength: exercises.some((e) => e.type !== 'cardio') };
  const item = await WorkoutSession.create({
    user: req.user._id, plan: plan?._id, planName: plan?.name || 'Free workout', focus: plan?.focus || 'Free workout',
    exercises, warmup: buildWarmup(groups, routineOpts), cooldown: buildCooldown(groups),
    checkInMethod: req.body.checkInMethod || 'manual', gymCode: req.body.gymCode,
  });
  res.status(201).json({ success: true, item });
}

export async function active(req, res) {
  const item = await WorkoutSession.findOne({ user: req.user._id, status: { $in: ['active', 'paused'] } });
  res.json({ success: true, item });
}

export async function get(req, res) {
  const item = await WorkoutSession.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!item) throw notFound('Session not found');
  res.json({ success: true, item });
}

export const routineStepSchema = z.object({ done: z.boolean() });

/** Tick a single warm-up / cool-down step. */
export async function setRoutineStep(req, res) {
  const s = await loadActive(req);
  const phase = req.params.phase === 'cooldown' ? 'cooldown' : 'warmup';
  const routine = s[phase];
  if (!routine) throw notFound('This session has no routine for that phase');
  const stepDoc = routine.steps.id(req.params.stepId);
  if (!stepDoc) throw notFound('Step not found');
  stepDoc.done = req.body.done;
  stepDoc.doneAt = req.body.done ? new Date() : undefined;
  routine.completedAt = routine.steps.every((x) => x.done) ? new Date() : undefined;
  await s.save();
  res.json({ success: true, item: s });
}

/** Skip (or un-skip) a whole warm-up / cool-down phase. */
export async function skipRoutine(req, res) {
  const s = await loadActive(req);
  const phase = req.params.phase === 'cooldown' ? 'cooldown' : 'warmup';
  const routine = s[phase];
  if (!routine) throw notFound('This session has no routine for that phase');
  routine.skipped = req.body.skipped !== false;
  await s.save();
  res.json({ success: true, item: s });
}

export async function addExercise(req, res) {
  const s = await loadActive(req);
  let ex = null;
  if (req.body.exerciseId) ex = await Exercise.findById(req.body.exerciseId).populate('equipment').lean();
  if (!ex && !req.body.exerciseName) throw badRequest('exerciseId or exerciseName required');
  s.exercises.push({
    exercise: ex?._id, exerciseName: ex?.name || req.body.exerciseName, equipment: ex?.equipment?._id, equipmentName: ex?.equipment?.name,
    muscleGroup: ex?.primaryMuscle, type: ex?.type || 'strength', targetSets: req.body.sets ?? ex?.defaultSets ?? 3, targetReps: req.body.reps ?? ex?.defaultReps ?? 10,
    targetWeight: req.body.weight ?? 0, targetDuration: req.body.duration ?? ex?.defaultDuration ?? 0, restSeconds: req.user.preferences?.restTimerDefault || 60,
    sets: [], status: 'pending', order: s.exercises.length,
  });
  await s.save();
  res.json({ success: true, item: s });
}

export async function completeSet(req, res) {
  const s = await loadActive(req);
  const ex = s.exercises.id(req.params.exerciseId);
  if (!ex) throw notFound('Exercise not in session');
  const { setNumber, reps, weight, durationSeconds } = req.body;
  const existing = ex.sets.find((x) => x.setNumber === setNumber);
  const data = { setNumber, reps, weight, durationSeconds, completed: true, completedAt: new Date() };
  if (existing) Object.assign(existing, data); else ex.sets.push(data);
  ex.sets.sort((a, b) => a.setNumber - b.setNumber);
  if (ex.status === 'pending') { ex.status = 'in_progress'; ex.startedAt = new Date(); }
  // strength calorie estimate: ~45s of work per set
  const met = await metFor(ex);
  ex.caloriesBurned = caloriesBurned({ activity: met, minutes: ex.sets.filter((x) => x.completed).length * 0.75, weightKg: userWeight(req.user) });
  recomputeTotals(s);
  await s.save();
  res.json({ success: true, item: s, exercise: ex, restSeconds: ex.restSeconds });
}

export async function logCardio(req, res) {
  const s = await loadActive(req);
  const ex = s.exercises.id(req.params.exerciseId);
  if (!ex) throw notFound('Exercise not in session');
  const { durationSeconds, distanceKm, speedKmh, notes } = req.body;
  ex.durationSeconds = durationSeconds; ex.distanceKm = distanceKm; ex.speedKmh = speedKmh ?? (distanceKm ? Math.round((distanceKm / (durationSeconds / 3600)) * 10) / 10 : undefined);
  if (notes) ex.notes = notes;
  const met = await metFor(ex);
  const intensity = speedKmh ? Math.min(1.6, Math.max(0.6, speedKmh / 6)) : 1;
  ex.caloriesBurned = caloriesBurned({ activity: met, minutes: durationSeconds / 60, weightKg: userWeight(req.user), intensity });
  ex.status = 'completed'; ex.completedAt = new Date(); ex.startedAt ??= new Date(Date.now() - durationSeconds * 1000);
  recomputeTotals(s);
  s.currentExerciseIndex = Math.min(s.exercises.length - 1, s.exercises.findIndex((e) => e._id.equals(ex._id)) + 1);
  await s.save();
  res.json({ success: true, item: s, exercise: ex });
}

export async function completeExercise(req, res) {
  const s = await loadActive(req);
  const ex = s.exercises.id(req.params.exerciseId);
  if (!ex) throw notFound('Exercise not in session');
  ex.status = req.body.skip ? 'skipped' : 'completed';
  ex.completedAt = new Date();
  if (req.body.notes) ex.notes = req.body.notes;
  recomputeTotals(s);
  const idx = s.exercises.findIndex((e) => e._id.equals(ex._id));
  s.currentExerciseIndex = Math.min(s.exercises.length - 1, idx + 1);
  await s.save();
  res.json({ success: true, item: s });
}

export async function setStatus(req, res) {
  const s = await loadActive(req);
  const status = req.body.status;
  if (!['active', 'paused', 'abandoned'].includes(status)) throw badRequest('Invalid status');
  s.status = status;
  if (status === 'abandoned') s.endedAt = new Date();
  await s.save();
  res.json({ success: true, item: s });
}

export async function finish(req, res) {
  const s = await loadActive(req);
  const user = req.user;
  s.status = 'completed';
  s.endedAt = new Date();
  s.durationSeconds = req.body.durationSeconds ?? Math.round((s.endedAt - s.startedAt) / 1000);
  if (req.body.rating) s.rating = req.body.rating;
  if (req.body.notes) s.notes = req.body.notes;
  for (const ex of s.exercises) if (ex.status === 'in_progress') { ex.status = 'completed'; ex.completedAt = new Date(); }
  recomputeTotals(s);
  s.shareCode = crypto.randomBytes(9).toString('base64url');

  // Flatten completed exercises to WorkoutLog history
  const logs = s.exercises.filter((e) => e.status === 'completed').map((e) => {
    const done = e.sets.filter((x) => x.completed);
    return {
      user: user._id, session: s._id, exercise: e.exercise, exerciseName: e.exerciseName, equipment: e.equipment, equipmentName: e.equipmentName,
      muscleGroup: e.muscleGroup, type: e.type, sets: done.length, reps: done.reduce((a, x) => a + (x.reps || 0), 0),
      weight: done.length ? Math.max(...done.map((x) => x.weight || 0)) : 0, volume: done.reduce((a, x) => a + (x.reps || 0) * (x.weight || 0), 0),
      durationSeconds: e.durationSeconds, distanceKm: e.distanceKm, speedKmh: e.speedKmh, caloriesBurned: e.caloriesBurned, notes: e.notes,
      performedAt: e.completedAt || s.endedAt, source: 'session',
    };
  });
  if (logs.length) await WorkoutLog.insertMany(logs);

  user.totalWorkouts += 1;
  user.totalWorkoutMinutes += Math.round(s.durationSeconds / 60);
  updateStreak(user, s.endedAt);
  await user.save();
  const newAchievements = await evaluateAchievements(user);

  s.aiSummary = await sessionSummary(user, s, { ai: req.body.withSummary !== false });
  await s.save();
  res.json({ success: true, item: s, newAchievements });
}

export async function history(req, res) {
  const { page = 1, limit = 20, from, to, search } = req.query;
  const q = { user: req.user._id, status: { $in: ['completed', 'abandoned'] } };
  if (from || to) q.startedAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
  const term = escapeRegex(safeSearch(search));
  if (term) q.$or = [{ planName: { $regex: term, $options: 'i' } }, { focus: { $regex: term, $options: 'i' } }, { 'exercises.exerciseName': { $regex: term, $options: 'i' } }];
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    WorkoutSession.find(q).sort({ startedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    WorkoutSession.countDocuments(q),
  ]);
  res.json({ success: true, items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function shared(req, res) {
  const item = await WorkoutSession.findOne({ shareCode: req.params.code, status: 'completed' }).populate('user', 'fullName').lean();
  if (!item) throw notFound('Shared session not found');
  res.json({ success: true, item: { ...item, user: { fullName: item.user?.fullName } } });
}

/* ---------------- Edit / undo / delete ---------------- */
export const updateSessionSchema = z.object({ planName: z.string().min(1).max(80).optional(), focus: z.string().max(80).optional(), notes: z.string().max(1000).optional(), rating: z.number().min(1).max(5).optional() });

export async function update(req, res) {
  const s = await WorkoutSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!s) throw notFound('Session not found');
  Object.assign(s, req.body);
  await s.save();
  res.json({ success: true, item: s });
}

/** Delete a session (active = discard). Its exercise logs and the user's totals are rolled back. */
export async function remove(req, res) {
  const s = await WorkoutSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!s) throw notFound('Session not found');
  await WorkoutLog.deleteMany({ session: s._id });
  if (s.status === 'completed') {
    req.user.totalWorkouts = Math.max(0, (req.user.totalWorkouts || 0) - 1);
    req.user.totalWorkoutMinutes = Math.max(0, (req.user.totalWorkoutMinutes || 0) - Math.round((s.durationSeconds || 0) / 60));
    await req.user.save();
  }
  await s.deleteOne();
  res.json({ success: true });
}

export async function removeExercise(req, res) {
  const s = await loadActive(req);
  const ex = s.exercises.id(req.params.exerciseId);
  if (!ex) throw notFound('Exercise not in session');
  s.exercises.pull(ex._id);
  s.currentExerciseIndex = Math.max(0, Math.min(s.currentExerciseIndex, s.exercises.length - 1));
  recomputeTotals(s);
  await s.save();
  res.json({ success: true, item: s });
}

export async function undoSet(req, res) {
  const s = await loadActive(req);
  const ex = s.exercises.id(req.params.exerciseId);
  if (!ex) throw notFound('Exercise not in session');
  if (!ex.sets.length) throw badRequest('No sets to undo');
  ex.sets.pop();
  if (ex.status === 'completed') { ex.status = ex.sets.length ? 'in_progress' : 'pending'; ex.completedAt = undefined; }
  const done = ex.sets.filter((x) => x.completed).length;
  ex.caloriesBurned = done ? caloriesBurned({ activity: await metFor(ex), minutes: done * 0.75, weightKg: userWeight(req.user) }) : 0;
  recomputeTotals(s);
  await s.save();
  res.json({ success: true, item: s, exercise: ex });
}
