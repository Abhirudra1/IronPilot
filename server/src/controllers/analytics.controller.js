import { dailyAnalytics, weeklyAnalytics, monthlyAnalytics, equipmentAnalytics } from '../services/analytics.js';
import { Report, Achievement, Notification, WorkoutPlan } from '../models/index.js';
import { generateDueReminders } from '../services/notifications.js';
import { dayName } from '../utils/dates.js';
import { levelForPoints } from '../services/achievements.js';
import { notFound } from '../utils/ApiError.js';

export async function daily(req, res) { res.json({ success: true, data: await dailyAnalytics(req.user, req.query.date ? new Date(req.query.date) : new Date()) }); }
export async function weekly(req, res) { res.json({ success: true, data: await weeklyAnalytics(req.user, Number(req.query.weeks) || 1) }); }
export async function monthly(req, res) { res.json({ success: true, data: await monthlyAnalytics(req.user) }); }
export async function equipment(req, res) { res.json({ success: true, data: await equipmentAnalytics(req.user) }); }

export async function overview(req, res) {
  const [d, w, m, e] = await Promise.all([dailyAnalytics(req.user), weeklyAnalytics(req.user), monthlyAnalytics(req.user), equipmentAnalytics(req.user)]);
  res.json({ success: true, daily: d, weekly: w, monthly: m, equipment: e });
}

/** Snapshot report; the client renders it to PDF. */
export async function createReport(req, res) {
  const period = ['daily', 'weekly', 'monthly'].includes(req.body.period) ? req.body.period : 'monthly';
  const data = period === 'daily' ? await dailyAnalytics(req.user) : period === 'weekly' ? await weeklyAnalytics(req.user) : await monthlyAnalytics(req.user);
  const equipmentData = await equipmentAnalytics(req.user);
  const item = await Report.create({ user: req.user._id, period, from: new Date(), to: new Date(), data: { ...data, equipment: equipmentData }, summary: `${period} report for ${req.user.fullName}` });
  res.status(201).json({ success: true, item });
}
export async function listReports(req, res) {
  const items = await Report.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ success: true, items });
}

/* ---------------- Achievements ---------------- */
export async function achievements(req, res) {
  const catalog = await Achievement.find({ isActive: true }).lean();
  const earned = new Map((req.user.achievements || []).map((a) => [a.key, a.earnedAt]));
  const items = catalog.map((a) => ({ ...a, earned: earned.has(a.key), earnedAt: earned.get(a.key) || null }));
  const level = levelForPoints(req.user.points);
  res.json({ success: true, items, points: req.user.points, level, nextLevelPoints: 100 * (level + 1) ** 2, earnedCount: earned.size });
}

/* ---------------- Notifications ---------------- */
export async function notifications(req, res) {
  const plansToday = await WorkoutPlan.find({ user: req.user._id, isActive: true, scheduledDays: dayName() }).select('name focus').lean();
  await generateDueReminders(req.user, plansToday);
  const items = await Notification.find({ $or: [{ user: req.user._id }, { user: null }] }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, items, unread: items.filter((n) => !n.read).length });
}
export async function markRead(req, res) {
  if (req.params.id === 'all') {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  } else {
    const n = await Notification.findOneAndUpdate({ _id: req.params.id, $or: [{ user: req.user._id }, { user: null }] }, { read: true });
    if (!n) throw notFound('Notification not found');
  }
  res.json({ success: true });
}
export async function deleteNotification(req, res) {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
}
