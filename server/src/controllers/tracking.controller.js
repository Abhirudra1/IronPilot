import { z } from 'zod';
import { escapeRegex, safeSearch, isSafeImageUrl } from '../utils/security.js';
import { WorkoutLog, WeightHistory, Exercise } from '../models/index.js';
import { notFound } from '../utils/ApiError.js';
import { caloriesBurned, bmi } from '../utils/fitness.js';
import { endOfDay, daysAgo, dateKey } from '../utils/dates.js';
import { evaluateAchievements } from '../services/achievements.js';

/* ---------------- Workout logs (manual / voice / offline) ---------------- */
export const logSchema = z.object({
  exercise: z.string().optional().nullable(), exerciseName: z.string().min(1), equipmentName: z.string().optional(), muscleGroup: z.string().optional(),
  type: z.enum(['strength', 'cardio', 'flexibility']).default('strength'), sets: z.number().min(0).optional(), reps: z.number().min(0).optional(), weight: z.number().min(0).optional(),
  durationSeconds: z.number().min(0).optional(), distanceKm: z.number().min(0).optional(), speedKmh: z.number().min(0).optional(),
  notes: z.string().max(500).optional(), performedAt: z.coerce.date().optional(), source: z.enum(['manual', 'voice', 'offline']).default('manual'), offlineId: z.string().optional(),
});
export const syncSchema = z.object({ logs: z.array(logSchema) });

async function buildLog(user, body) {
  let ex = null;
  if (body.exercise) ex = await Exercise.findById(body.exercise).populate('equipment').lean();
  const weightKg = user.currentWeight || user.weight || 70;
  const minutes = body.durationSeconds ? body.durationSeconds / 60 : (body.sets || 0) * 0.75;
  const calories = caloriesBurned({ activity: ex?.metActivity || (body.type === 'cardio' ? 'default' : 'strength'), minutes, weightKg });
  return {
    user: user._id, exercise: ex?._id, exerciseName: ex?.name || body.exerciseName, equipment: ex?.equipment?._id, equipmentName: ex?.equipment?.name || body.equipmentName,
    muscleGroup: ex?.primaryMuscle || body.muscleGroup, type: ex?.type || body.type, sets: body.sets, reps: body.reps, weight: body.weight,
    volume: (body.sets || 0) * (body.reps || 0) * (body.weight || 0), durationSeconds: body.durationSeconds, distanceKm: body.distanceKm, speedKmh: body.speedKmh,
    caloriesBurned: calories, notes: body.notes, performedAt: body.performedAt || new Date(), source: body.source,
  };
}

export async function createLog(req, res) {
  const item = await WorkoutLog.create(await buildLog(req.user, req.body));
  res.status(201).json({ success: true, item });
}

export async function syncLogs(req, res) {
  const docs = [];
  for (const l of req.body.logs) docs.push(await buildLog(req.user, l));
  const items = docs.length ? await WorkoutLog.insertMany(docs) : [];
  res.status(201).json({ success: true, synced: items.length, items });
}

export async function listLogs(req, res) {
  const { search, muscle, type, from, to, page = 1, limit = 30 } = req.query;
  const q = { user: req.user._id };
  const term = escapeRegex(safeSearch(search));
  if (term) q.$or = [{ exerciseName: { $regex: term, $options: 'i' } }, { equipmentName: { $regex: term, $options: 'i' } }, { notes: { $regex: term, $options: 'i' } }];
  if (muscle) q.muscleGroup = muscle;
  if (type) q.type = type;
  if (from || to) q.performedAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: endOfDay(new Date(to)) } : {}) };
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([WorkoutLog.find(q).sort({ performedAt: -1 }).skip(skip).limit(Number(limit)).lean(), WorkoutLog.countDocuments(q)]);
  res.json({ success: true, items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function deleteLog(req, res) {
  const r = await WorkoutLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) throw notFound('Log not found');
  res.json({ success: true });
}

/* ---------------- Weight ---------------- */
export const weightSchema = z.object({
  weight: z.number().min(20).max(400), bodyFat: z.number().min(1).max(70).optional(), date: z.coerce.date().optional(),
  measurements: z.object({ chest: z.number().optional(), waist: z.number().optional(), hips: z.number().optional(), arms: z.number().optional(), thighs: z.number().optional() }).partial().optional(),
  photoUrl: z.string().max(3_000_000).refine(isSafeImageUrl, 'photo must be an image data URL or http(s) URL').optional().nullable(), photoLabel: z.enum(['before', 'progress', 'after']).optional(), notes: z.string().max(500).optional(),
});

export async function addWeight(req, res) {
  // one weigh-in per day: a second entry for the same day updates it instead of creating a duplicate
  const when = req.body.date ? new Date(req.body.date) : new Date();
  const dayStart = new Date(when); dayStart.setHours(0, 0, 0, 0); const dayEnd = new Date(when); dayEnd.setHours(23, 59, 59, 999);
  const existing = await WeightHistory.findOne({ user: req.user._id, date: { $gte: dayStart, $lte: dayEnd } });
  let item;
  if (existing) { Object.assign(existing, req.body, { bmi: bmi(req.body.weight, req.user.height) }); item = await existing.save(); }
  else item = await WeightHistory.create({ ...req.body, user: req.user._id, bmi: bmi(req.body.weight, req.user.height) });
  const latest = await WeightHistory.findOne({ user: req.user._id }).sort({ date: -1 }).lean();
  req.user.currentWeight = latest.weight;
  if (req.body.measurements) req.user.measurements = { ...(req.user.measurements?.toObject?.() || {}), ...req.body.measurements };
  await req.user.save();
  const newAchievements = await evaluateAchievements(req.user);
  res.status(201).json({ success: true, item, currentWeight: req.user.currentWeight, newAchievements });
}

export async function weightHistory(req, res) {
  const { range = 'monthly' } = req.query; // daily(30d) | weekly(12w) | monthly(12m) | all
  const since = range === 'daily' ? daysAgo(30) : range === 'weekly' ? daysAgo(84) : range === 'monthly' ? daysAgo(365) : new Date(0);
  const items = await WeightHistory.find({ user: req.user._id, date: { $gte: since } }).sort({ date: 1 }).lean();
  // Aggregate to weekly / monthly averages for readability
  const bucket = (d) => range === 'weekly' ? dateKey(daysAgo(d.getDay(), d)) : range === 'monthly' ? dateKey(d).slice(0, 7) : dateKey(d);
  const groups = new Map();
  for (const w of items) {
    const k = bucket(w.date);
    const g = groups.get(k) || { date: k, sum: 0, n: 0, bmiSum: 0 };
    g.sum += w.weight; g.n += 1; g.bmiSum += w.bmi || bmi(w.weight, req.user.height) || 0; groups.set(k, g);
  }
  const series = [...groups.values()].map((g) => ({ date: g.date, weight: Math.round((g.sum / g.n) * 10) / 10, bmi: Math.round((g.bmiSum / g.n) * 10) / 10 }));
  const photos = items.filter((w) => w.photoUrl).map((w) => ({ _id: w._id, date: w.date, weight: w.weight, photoUrl: w.photoUrl, photoLabel: w.photoLabel }));
  res.json({ success: true, items, series, photos, startWeight: req.user.weight, targetWeight: req.user.targetWeight, currentWeight: req.user.currentWeight, height: req.user.height });
}

export async function deleteWeight(req, res) {
  const r = await WeightHistory.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) throw notFound('Entry not found');
  const latest = await WeightHistory.findOne({ user: req.user._id }).sort({ date: -1 }).lean();
  req.user.currentWeight = latest?.weight ?? req.user.weight; await req.user.save();
  res.json({ success: true });
}
