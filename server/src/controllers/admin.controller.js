import { z } from 'zod';
import { escapeRegex, safeSearch, isSafeAppPath } from '../utils/security.js';
import { User, WorkoutSession, WorkoutLog, Equipment, Exercise, DietPlan, Notification, AIRecommendation } from '../models/index.js';
import { notFound, badRequest } from '../utils/ApiError.js';
import { daysAgo, dateKey } from '../utils/dates.js';

export async function stats(_req, res) {
  const since = daysAgo(29);
  const byDay = (field) => [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}` } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }];
  const [users, activeUsers, sessions, sessions30, equipment, exercises, aiCalls, topEquipment, signups, sessionsByDay] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ lastLoginAt: { $gte: daysAgo(7) } }),
    WorkoutSession.countDocuments({ status: 'completed' }),
    WorkoutSession.countDocuments({ status: 'completed', startedAt: { $gte: since } }),
    Equipment.countDocuments({ isActive: true }),
    Exercise.countDocuments({ isActive: true }),
    AIRecommendation.countDocuments({ source: 'gemini' }),
    WorkoutLog.aggregate([{ $match: { equipmentName: { $ne: null } } }, { $group: { _id: '$equipmentName', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    User.aggregate([{ $match: { createdAt: { $gte: since } } }, ...byDay('createdAt')]),
    WorkoutSession.aggregate([{ $match: { status: 'completed', startedAt: { $gte: since } } }, ...byDay('startedAt')]),
  ]);
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const k = dateKey(daysAgo(i));
    days.push({ date: k, sessions: sessionsByDay.find((x) => x._id === k)?.count || 0, signups: signups.find((x) => x._id === k)?.count || 0 });
  }
  res.json({ success: true, data: { users, activeUsers, sessions, sessions30, equipment, exercises, aiCalls, topEquipment: topEquipment.map((t) => ({ name: t._id, count: t.count })), days } });
}

export async function listUsers(req, res) {
  const { search, page = 1, limit = 25 } = req.query;
  const term = safeSearch(search);
  const q = term ? { $or: [{ fullName: { $regex: escapeRegex(term), $options: 'i' } }, { email: { $regex: escapeRegex(term), $options: 'i' } }] } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([User.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(), User.countDocuments(q)]);
  res.json({ success: true, items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export const userUpdateSchema = z.object({ role: z.enum(['user', 'admin']).optional(), isActive: z.boolean().optional(), fullName: z.string().min(2).optional() });
export async function updateUser(req, res) {
  if (req.params.id === req.user._id.toString() && req.body.role === 'user') throw badRequest('You cannot demote yourself');
  const item = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw notFound('User not found');
  res.json({ success: true, item });
}
export async function deleteUser(req, res) {
  if (req.params.id === req.user._id.toString()) throw badRequest('You cannot delete yourself');
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
}

/* ---- diet templates ---- */
const mealSuggestion = z.object({
  type: z.string(), name: z.string(), description: z.string().optional(), calories: z.number().optional(),
  protein: z.number().optional(), carbs: z.number().optional(), fat: z.number().optional(), items: z.array(z.string()).optional(),
});
export const dietTemplateSchema = z.object({
  name: z.string().min(2), planType: z.string().optional(), dailyCalories: z.number().optional(), proteinTarget: z.number().optional(),
  carbTarget: z.number().optional(), fatTarget: z.number().optional(), waterMl: z.number().optional(), meals: z.array(mealSuggestion).optional(),
  tips: z.array(z.string()).optional(), rationale: z.string().optional(), isActive: z.boolean().optional(),
});
export async function listDietTemplates(_req, res) {
  res.json({ success: true, items: await DietPlan.find({ isTemplate: true }).sort({ name: 1 }).lean() });
}
export async function createDietTemplate(req, res) {
  res.status(201).json({ success: true, item: await DietPlan.create({ ...req.body, isTemplate: true, user: null }) });
}
export async function updateDietTemplate(req, res) {
  const item = await DietPlan.findOneAndUpdate({ _id: req.params.id, isTemplate: true }, req.body, { new: true });
  if (!item) throw notFound('Template not found');
  res.json({ success: true, item });
}
export async function deleteDietTemplate(req, res) {
  await DietPlan.findOneAndDelete({ _id: req.params.id, isTemplate: true });
  res.json({ success: true });
}

/* ---- notifications (broadcast when userId is empty) ---- */
export const notifySchema = z.object({
  userId: z.string().optional().nullable(), title: z.string().min(1).max(120), message: z.string().min(1).max(1000),
  type: z.string().max(40).optional(), link: z.string().max(300).refine(isSafeAppPath, 'link must be a relative app path').optional(),
});
export async function sendNotification(req, res) {
  const { userId, ...rest } = req.body;
  const item = await Notification.create({ ...rest, type: rest.type || 'system', user: userId || null });
  res.status(201).json({ success: true, item });
}
export async function listNotifications(_req, res) {
  const items = await Notification.find({}).sort({ createdAt: -1 }).limit(100).populate('user', 'fullName email').lean();
  res.json({ success: true, items });
}
export async function deleteNotification(req, res) {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}
