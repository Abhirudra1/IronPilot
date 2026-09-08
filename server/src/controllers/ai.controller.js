import { z } from 'zod';
import { getRecommendations } from '../services/aiCoach.js';
import { chat } from '../services/aiPlanner.js';
import { suggestTodayPlan } from '../services/todayPlan.js';
import { suggestMeals } from '../services/mealSuggest.js';
import { getWeeklyPlan, applyWeeklyPlan } from '../services/weeklyPlan.js';
import { ChatMessage, AIRecommendation } from '../models/index.js';
import { geminiEnabled, geminiStatus } from '../services/gemini.js';
import { env } from '../config/env.js';

const convId = z.string().regex(/^[A-Za-z0-9_-]{1,48}$/);
export const chatSchema = z.object({ message: z.string().trim().min(1).max(600), conversationId: convId.optional() });

export async function status(req, res) {
  // Model names, errors and token counts are operational details: admins only.
  if (req.user?.role !== 'admin') return res.json({ success: true, enabled: geminiEnabled() });
  res.json({ success: true, enabled: geminiEnabled(), model: env.geminiModel, ...geminiStatus });
}

export async function recommendations(req, res) {
  const scope = ['daily', 'weekly', 'monthly'].includes(req.params.scope) ? req.params.scope : 'daily';
  const item = await getRecommendations(req.user, scope, { force: req.query.refresh === 'true' });
  res.json({ success: true, item });
}

export async function allRecommendations(req, res) {
  const [daily, weekly, monthly] = await Promise.all(['daily', 'weekly', 'monthly'].map((s) => getRecommendations(req.user, s)));
  res.json({ success: true, daily, weekly, monthly });
}

export async function sendChat(req, res) {
  const reply = await chat(req.user, req.body.message, req.body.conversationId || 'default');
  res.json({ success: true, reply });
}

export async function chatHistory(req, res) {
  const conversationId = convId.safeParse(req.query.conversation).success ? String(req.query.conversation) : null;
  const items = await ChatMessage.find({ user: req.user._id, ...(conversationId ? { conversationId } : {}) }).sort({ createdAt: 1 }).limit(100).lean();
  res.json({ success: true, items });
}

export async function clearChat(req, res) {
  const conversationId = convId.safeParse(req.query.conversation).success ? String(req.query.conversation) : null;
  await ChatMessage.deleteMany({ user: req.user._id, ...(conversationId ? { conversationId } : {}) });
  res.json({ success: true });
}

export async function recent(req, res) {
  const items = await AIRecommendation.find({ user: req.user._id, scope: { $in: ['daily', 'weekly', 'monthly'] } }).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ success: true, items });
}

export async function todayPlan(req, res) {
  res.json({ success: true, ...(await suggestTodayPlan(req.user)) });
}

export async function mealSuggestions(req, res) {
  const d = req.query.date ? new Date(String(req.query.date)) : new Date();
  res.json({ success: true, ...(await suggestMeals(req.user, Number.isNaN(d.getTime()) ? new Date() : d)) });
}

/** Previous conversations (one per login), newest first, with a preview of the first question. */
export async function conversations(req, res) {
  const rows = await ChatMessage.aggregate([
    { $match: { user: req.user._id } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$conversationId', startedAt: { $first: '$createdAt' }, lastAt: { $last: '$createdAt' }, count: { $sum: 1 }, preview: { $first: { $cond: [{ $eq: ['$role', 'user'] }, '$content', null] } } } },
    { $sort: { lastAt: -1 } },
    { $limit: 20 },
  ]);
  res.json({ success: true, items: rows.map((r) => ({ id: r._id, startedAt: r.startedAt, lastAt: r.lastAt, count: r.count, preview: (r.preview || '').slice(0, 80) })) });
}

export async function weeklyPlan(req, res) {
  const force = req.method === 'POST' && req.body?.force === true;
  res.json({ success: true, item: await getWeeklyPlan(req.user, { force }) });
}

export async function applyWeek(req, res) {
  const result = await applyWeeklyPlan(req.user);
  res.json({ success: true, ...result });
}
