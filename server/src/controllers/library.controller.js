import { z } from 'zod';
import { escapeRegex, safeSearch, isSafeHttpUrl } from '../utils/security.js';
import { Equipment, Exercise, Food } from '../models/index.js';
import { notFound } from '../utils/ApiError.js';
import { EQUIPMENT_CATEGORIES, MUSCLE_GROUPS, EXPERIENCE_LEVELS, EXERCISE_TYPES } from '../utils/constants.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function listEquipment(req, res) {
  const { category, search, muscle } = req.query;
  const q = { isActive: true };
  if (category) q.category = category;
  if (muscle) q.targetMuscles = muscle;
  if (safeSearch(search)) q.name = { $regex: escapeRegex(safeSearch(search)), $options: 'i' };
  const items = await Equipment.find(q).sort({ category: 1, name: 1 }).lean();
  res.json({ success: true, items });
}

export async function getEquipment(req, res) {
  const item = await Equipment.findOne({ $or: [{ slug: req.params.idOrSlug }, ...(req.params.idOrSlug.match(/^[a-f\d]{24}$/i) ? [{ _id: req.params.idOrSlug }] : [])] }).lean();
  if (!item) throw notFound('Equipment not found');
  const exercises = await Exercise.find({ equipment: item._id, isActive: true }).lean();
  res.json({ success: true, item, exercises });
}

export async function listExercises(req, res) {
  const { muscle, type, equipment, search, difficulty, favorites } = req.query;
  const q = { isActive: true };
  if (muscle) q.primaryMuscle = muscle;
  if (type) q.type = type;
  if (difficulty) q.difficulty = difficulty;
  if (equipment) q.equipmentSlug = equipment;
  if (safeSearch(search)) q.name = { $regex: escapeRegex(safeSearch(search)), $options: 'i' };
  if (favorites === 'true') q._id = { $in: req.user.favoriteExercises };
  const items = await Exercise.find(q).populate('equipment', 'name slug category imageUrl').sort({ primaryMuscle: 1, name: 1 }).lean();
  res.json({ success: true, items });
}

export async function getExercise(req, res) {
  const item = await Exercise.findOne({ $or: [{ slug: req.params.idOrSlug }, ...(req.params.idOrSlug.match(/^[a-f\d]{24}$/i) ? [{ _id: req.params.idOrSlug }] : [])] }).populate('equipment').lean();
  if (!item) throw notFound('Exercise not found');
  res.json({ success: true, item });
}

export const meta = (_req, res) => res.json({ success: true, categories: EQUIPMENT_CATEGORIES, muscles: MUSCLE_GROUPS, levels: EXPERIENCE_LEVELS, types: EXERCISE_TYPES });

/* ---------- admin CRUD ---------- */
export const equipmentSchema = z.object({
  name: z.string().min(2), category: z.enum(EQUIPMENT_CATEGORIES), description: z.string().min(5), purpose: z.string().optional(),
  imageUrl: z.string().max(1000).refine(isSafeHttpUrl, 'must be an http(s) URL').optional(), videoUrl: z.string().max(1000).refine(isSafeHttpUrl, 'must be an http(s) URL').optional(), targetMuscles: z.array(z.enum(MUSCLE_GROUPS)).optional(),
  difficulty: z.enum(EXPERIENCE_LEVELS).optional(), howToUse: z.array(z.string()).optional(), beginnerTips: z.array(z.string()).optional(),
  safetyTips: z.array(z.string()).optional(), recommendedUsage: z.string().optional(), recommendedDuration: z.string().optional(),
  recommendedWeight: z.string().optional(), suggestedSpeed: z.string().optional(), metActivity: z.string().optional(), isActive: z.boolean().optional(),
});
export const exerciseSchema = z.object({
  name: z.string().min(2), type: z.enum(EXERCISE_TYPES).optional(), equipment: z.string().optional().nullable(), primaryMuscle: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).optional(), difficulty: z.enum(EXPERIENCE_LEVELS).optional(), instructions: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(), imageUrl: z.string().max(1000).refine(isSafeHttpUrl, 'must be an http(s) URL').optional(), videoUrl: z.string().max(1000).refine(isSafeHttpUrl, 'must be an http(s) URL').optional(), metActivity: z.string().optional(),
  defaultSets: z.number().optional(), defaultReps: z.number().optional(), defaultDuration: z.number().optional(), isActive: z.boolean().optional(),
});

export async function createEquipment(req, res) {
  const item = await Equipment.create({ ...req.body, slug: slugify(req.body.name) });
  res.status(201).json({ success: true, item });
}
export async function updateEquipment(req, res) {
  const item = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw notFound('Equipment not found');
  res.json({ success: true, item });
}
export async function deleteEquipment(req, res) {
  await Equipment.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
}
export async function createExercise(req, res) {
  const body = { ...req.body, slug: slugify(req.body.name), createdBy: req.user._id };
  if (body.equipment) { const eq = await Equipment.findById(body.equipment).lean(); body.equipmentSlug = eq?.slug; body.metActivity = body.metActivity || eq?.metActivity; }
  const item = await Exercise.create(body);
  res.status(201).json({ success: true, item });
}
export async function updateExercise(req, res) {
  const body = { ...req.body };
  if (body.equipment) { const eq = await Equipment.findById(body.equipment).lean(); body.equipmentSlug = eq?.slug; }
  const item = await Exercise.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!item) throw notFound('Exercise not found');
  res.json({ success: true, item });
}
export async function deleteExercise(req, res) {
  await Exercise.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
}

/* ---------------- Foods (nutrition library) ---------------- */
export async function listFoods(req, res) {
  const term = safeSearch(req.query.search);
  const q = { isActive: true };
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: 'i' };
    q.$or = [{ name: rx }, { aliases: rx }];
  }
  if (req.query.category) q.category = String(req.query.category).slice(0, 30);
  const items = await Food.find(q).sort({ name: 1 }).limit(term ? 25 : 60).lean();
  // Prefer names that start with the query
  if (term) items.sort((a, b) => Number(b.name.toLowerCase().startsWith(term.toLowerCase())) - Number(a.name.toLowerCase().startsWith(term.toLowerCase())));
  res.json({ success: true, items });
}

export async function getFood(req, res) {
  const item = await Food.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!item) throw notFound('Food not found');
  res.json({ success: true, item });
}

export const foodSchema = z.object({
  name: z.string().min(2).max(80), aliases: z.array(z.string().max(60)).max(10).optional(),
  category: z.enum(['grains', 'protein', 'dairy', 'fruit', 'vegetable', 'legume', 'snack', 'beverage', 'fat_oil', 'meal', 'supplement']).optional(),
  cuisine: z.string().max(30).optional(), dietTags: z.array(z.enum(['vegetarian', 'vegan', 'non_veg', 'eggetarian'])).optional(),
  per100g: z.object({ calories: z.number().min(0).max(900), protein: z.number().min(0).max(100), carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100) }),
  servings: z.array(z.object({ label: z.string().min(1).max(30), grams: z.number().min(1).max(2000) })).min(1).max(8), isActive: z.boolean().optional(),
});
export async function createFood(req, res) {
  const item = await Food.create({ ...req.body, slug: slugify(req.body.name) });
  res.status(201).json({ success: true, item });
}
export async function updateFood(req, res) {
  const item = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw notFound('Food not found');
  res.json({ success: true, item });
}
export async function deleteFood(req, res) {
  await Food.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
}
