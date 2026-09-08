import { z } from 'zod';
import { applyStartingLoads } from '../services/loads.js';
import { WorkoutPlan, Exercise } from '../models/index.js';
import { notFound } from '../utils/ApiError.js';
import { generateWorkoutPlan } from '../services/aiPlanner.js';
import { DAYS } from '../utils/constants.js';

const exerciseInput = z.object({
  exercise: z.string().optional().nullable(), exerciseName: z.string().min(1), equipment: z.string().optional().nullable(), equipmentName: z.string().optional(),
  muscleGroup: z.string().optional(), type: z.enum(['strength', 'cardio', 'flexibility']).optional(),
  sets: z.coerce.number().min(0).max(20).optional(), reps: z.coerce.number().min(0).max(200).optional(), weight: z.coerce.number().min(0).max(1000).optional(),
  duration: z.coerce.number().min(0).max(300).optional(), restSeconds: z.coerce.number().min(0).max(600).optional(), notes: z.string().max(500).optional(), order: z.number().optional(),
});
export const planSchema = z.object({
  name: z.string().min(1).max(80), description: z.string().max(500).optional(), focus: z.string().max(80).optional(),
  muscleGroups: z.array(z.string()).optional(), scheduledDays: z.array(z.enum(DAYS)).optional(),
  exercises: z.array(exerciseInput).min(0), isTemplate: z.boolean().optional(), isActive: z.boolean().optional(),
});
export const generateSchema = z.object({ focus: z.string().default('full_body'), minutes: z.coerce.number().min(15).max(180).default(60), save: z.boolean().default(false), scheduledDays: z.array(z.enum(DAYS)).optional() });
export const scheduleSchema = z.object({ schedule: z.record(z.enum(DAYS), z.string().nullable()) });

/** Fill equipment / muscle / type from the Exercise document when only an id was supplied. */
async function enrich(exercises) {
  const ids = exercises.map((e) => e.exercise).filter(Boolean);
  const docs = ids.length ? await Exercise.find({ _id: { $in: ids } }).populate('equipment', 'name').lean() : [];
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  return exercises.map((e, i) => {
    const d = e.exercise ? byId.get(String(e.exercise)) : null;
    return { ...e, order: e.order ?? i, exerciseName: e.exerciseName || d?.name, equipment: e.equipment ?? d?.equipment?._id ?? null, equipmentName: e.equipmentName || d?.equipment?.name, muscleGroup: e.muscleGroup || d?.primaryMuscle, type: e.type || d?.type || 'strength' };
  });
}

const estimate = (exercises) => exercises.reduce((a, e) => a + (e.type === 'cardio' ? (e.duration || 10) : (e.sets || 3) * ((e.restSeconds || 60) + 40) / 60), 0);

export async function list(req, res) {
  const { templates } = req.query;
  const q = templates === 'true' ? { $or: [{ user: req.user._id, isTemplate: true }, { isPublic: true }] } : { user: req.user._id, isActive: true };
  const items = await WorkoutPlan.find(q).sort({ updatedAt: -1 }).lean();
  res.json({ success: true, items });
}

export async function get(req, res) {
  const item = await WorkoutPlan.findOne({ _id: req.params.id, $or: [{ user: req.user._id }, { isPublic: true }] }).lean();
  if (!item) throw notFound('Plan not found');
  res.json({ success: true, item });
}

export async function create(req, res) {
  const exercises = await enrich(req.body.exercises);
  const muscleGroups = req.body.muscleGroups?.length ? req.body.muscleGroups : [...new Set(exercises.map((e) => e.muscleGroup).filter(Boolean))];
  const item = await WorkoutPlan.create({ ...req.body, exercises, muscleGroups, user: req.user._id, estimatedMinutes: Math.round(estimate(exercises)) });
  res.status(201).json({ success: true, item });
}

export async function update(req, res) {
  const item = await WorkoutPlan.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) throw notFound('Plan not found');
  Object.assign(item, req.body);
  if (req.body.exercises) {
    item.exercises = await enrich(req.body.exercises);
    item.estimatedMinutes = Math.round(estimate(item.exercises));
    if (!req.body.muscleGroups) item.muscleGroups = [...new Set(item.exercises.map((e) => e.muscleGroup).filter(Boolean))];
  }
  await item.save();
  res.json({ success: true, item });
}

export async function remove(req, res) {
  const item = await WorkoutPlan.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isActive: false, scheduledDays: [] });
  if (!item) throw notFound('Plan not found');
  res.json({ success: true });
}

export async function duplicate(req, res) {
  const src = await WorkoutPlan.findOne({ _id: req.params.id, $or: [{ user: req.user._id }, { isPublic: true }] }).lean();
  if (!src) throw notFound('Plan not found');
  const { _id, createdAt: _c, updatedAt: _u, ...rest } = src;
  let name = src.name;
  for (let n = 2; await WorkoutPlan.exists({ user: req.user._id, name, isActive: true }); n++) name = `${src.name} ${n}`;
  const item = await WorkoutPlan.create({ ...rest, user: req.user._id, isPublic: false, isTemplate: false, name, scheduledDays: [] });
  res.status(201).json({ success: true, item });
}

export async function generate(req, res) {
  const { focus, minutes, save, scheduledDays } = req.body;
  const plan = await generateWorkoutPlan(req.user, { focus, minutes });
  await applyStartingLoads(req.user, plan.exercises); // coach-style starting weights from history / level
  plan.estimatedMinutes = Math.round(estimate(plan.exercises));
  if (!save) return res.json({ success: true, item: plan });
  const item = await WorkoutPlan.create({ ...plan, user: req.user._id, scheduledDays: scheduledDays || [] });
  res.status(201).json({ success: true, item });
}

/** Weekly schedule: { monday: planId|null, ... } */
export async function getSchedule(req, res) {
  const plans = await WorkoutPlan.find({ user: req.user._id, isActive: true }).select('name focus scheduledDays exercises estimatedMinutes').lean();
  const schedule = Object.fromEntries(DAYS.map((d) => [d, plans.find((p) => p.scheduledDays.includes(d)) || null]));
  res.json({ success: true, schedule, plans });
}

export async function setSchedule(req, res) {
  const { schedule } = req.body;
  const plans = await WorkoutPlan.find({ user: req.user._id, isActive: true });
  for (const p of plans) {
    p.scheduledDays = DAYS.filter((d) => schedule[d] === p._id.toString());
    await p.save();
  }
  res.json({ success: true });
}
