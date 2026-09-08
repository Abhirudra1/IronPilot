import { z } from 'zod';
import { WaterLog, Meal, DietPlan } from '../models/index.js';
import { notFound } from '../utils/ApiError.js';
import { startOfDay, endOfDay, daysAgo, dateKey } from '../utils/dates.js';
import { generateDietPlan } from '../services/aiPlanner.js';
import { MEAL_TYPES } from '../utils/constants.js';

const dayRange = (d) => ({ $gte: startOfDay(d), $lte: endOfDay(d) });

/* ---------------- Water ---------------- */
export const waterSchema = z.object({ amountMl: z.number().min(1).max(5000), date: z.coerce.date().optional() });

export async function addWater(req, res) {
  const item = await WaterLog.create({ ...req.body, user: req.user._id });
  const logs = await WaterLog.find({ user: req.user._id, date: dayRange(item.date) }).lean();
  const total = logs.reduce((a, w) => a + w.amountMl, 0);
  res.status(201).json({ success: true, item, totalMl: total, goalMl: req.user.waterGoalMl, remainingMl: Math.max(0, req.user.waterGoalMl - total) });
}

export async function waterToday(req, res) {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const logs = await WaterLog.find({ user: req.user._id, date: dayRange(date) }).sort({ date: -1 }).lean();
  const total = logs.reduce((a, w) => a + w.amountMl, 0);
  const weekLogs = await WaterLog.find({ user: req.user._id, date: { $gte: daysAgo(6) } }).lean();
  const week = [];
  for (let i = 6; i >= 0; i--) { const k = dateKey(daysAgo(i)); week.push({ date: k, ml: weekLogs.filter((w) => dateKey(w.date) === k).reduce((a, w) => a + w.amountMl, 0) }); }
  res.json({ success: true, logs, totalMl: total, goalMl: req.user.waterGoalMl, remainingMl: Math.max(0, req.user.waterGoalMl - total), week });
}

export async function deleteWater(req, res) {
  const r = await WaterLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) throw notFound('Entry not found');
  res.json({ success: true });
}

/* ---------------- Meals ---------------- */
export const mealSchema = z.object({
  type: z.enum(MEAL_TYPES), name: z.string().min(1).max(120), calories: z.number().min(0).max(5000).default(0), protein: z.number().min(0).max(500).default(0),
  carbs: z.number().min(0).max(1000).default(0), fat: z.number().min(0).max(500).default(0), quantity: z.string().max(60).optional(), notes: z.string().max(300).optional(), date: z.coerce.date().optional(),
});

export async function addMeal(req, res) {
  const item = await Meal.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, item });
}

export async function mealsForDay(req, res) {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const items = await Meal.find({ user: req.user._id, date: dayRange(date) }).sort({ date: 1 }).lean();
  const totals = items.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const u = req.user;
  const targets = { calories: u.calorieTarget || 2000, protein: u.proteinTarget || 120, carbs: u.carbTarget || 220, fat: u.fatTarget || 60 };
  const remaining = Object.fromEntries(Object.keys(targets).map((k) => [k, Math.max(0, targets[k] - totals[k])]));
  const byType = Object.fromEntries(MEAL_TYPES.map((t) => [t, items.filter((m) => m.type === t)]));
  res.json({ success: true, items, byType, totals, targets, remaining });
}

export async function updateMeal(req, res) {
  const item = await Meal.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
  if (!item) throw notFound('Meal not found');
  res.json({ success: true, item });
}

export async function deleteMeal(req, res) {
  const r = await Meal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) throw notFound('Meal not found');
  res.json({ success: true });
}

/* ---------------- Diet plans ---------------- */
export const dietGenerateSchema = z.object({ planType: z.string().max(60).optional(), notes: z.string().max(500).optional(), save: z.boolean().default(true) });

export async function generateDiet(req, res) {
  const plan = await generateDietPlan(req.user, { planType: req.body.planType || req.user.fitnessGoal, notes: req.body.notes });
  if (!req.body.save) return res.json({ success: true, item: plan });
  await DietPlan.updateMany({ user: req.user._id, isActive: true }, { isActive: false });
  const item = await DietPlan.create({ ...plan, user: req.user._id, isActive: true });
  res.status(201).json({ success: true, item });
}

export async function listDiets(req, res) {
  const [mine, templates] = await Promise.all([
    DietPlan.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    DietPlan.find({ isTemplate: true, isActive: true }).sort({ name: 1 }).lean(),
  ]);
  res.json({ success: true, items: mine, templates, active: mine.find((d) => d.isActive) || null });
}

export async function activateDiet(req, res) {
  const src = await DietPlan.findOne({ _id: req.params.id, $or: [{ user: req.user._id }, { isTemplate: true }] }).lean();
  if (!src) throw notFound('Diet plan not found');
  await DietPlan.updateMany({ user: req.user._id, isActive: true }, { isActive: false });
  let item;
  if (src.isTemplate) { const { _id, createdAt: _c, updatedAt: _u, ...rest } = src; item = await DietPlan.create({ ...rest, user: req.user._id, isTemplate: false, isActive: true }); }
  else item = await DietPlan.findByIdAndUpdate(src._id, { isActive: true }, { new: true });
  // adopt targets
  req.user.calorieTarget = item.dailyCalories || req.user.calorieTarget; req.user.proteinTarget = item.proteinTarget || req.user.proteinTarget;
  req.user.carbTarget = item.carbTarget || req.user.carbTarget; req.user.fatTarget = item.fatTarget || req.user.fatTarget;
  await req.user.save();
  res.json({ success: true, item });
}
