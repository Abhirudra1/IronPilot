import { Notification, WaterLog, Meal, WeightHistory, WorkoutSession } from '../models/index.js';
import { startOfDay, endOfDay } from '../utils/dates.js';

/**
 * Generate due reminders for a user based on preferences and today's activity.
 * Called lazily when notifications are fetched (no cron infra needed); idempotent per day/type.
 */
export async function generateDueReminders(user, plansToday = []) {
  const prefs = user.preferences?.notifications || {};
  const times = user.preferences?.reminderTimes || {};
  const today = { $gte: startOfDay(), $lte: endOfDay() };
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const existing = await Notification.find({ user: user._id, createdAt: today }).select('type').lean();
  const has = (t) => existing.some((n) => n.type === t);
  const created = [];

  if (prefs.workout && !has('workout') && plansToday.length && hhmm >= (times.workout || '18:00')) {
    const done = await WorkoutSession.exists({ user: user._id, status: 'completed', startedAt: today });
    if (!done) {
      created.push({ user: user._id, type: 'workout', title: 'Workout time!', link: '/session',
        message: `Today is ${plansToday[0].focus || plansToday[0].name} day. Tap Start Session when you reach the gym.` });
    }
  }
  if (prefs.water && !has('water') && now.getHours() >= 10) {
    const logs = await WaterLog.find({ user: user._id, date: today }).lean();
    const total = logs.reduce((a, w) => a + w.amountMl, 0);
    const goal = user.waterGoalMl || 2500;
    if (total < goal * 0.4) {
      created.push({ user: user._id, type: 'water', title: 'Stay hydrated', link: '/nutrition',
        message: `You have logged ${total} ml today. ${Math.max(0, goal - total)} ml to go.` });
    }
  }
  if (prefs.weight && !has('weight') && hhmm >= (times.weight || '07:00')) {
    const since = new Date(); since.setDate(since.getDate() - 7);
    const recent = await WeightHistory.exists({ user: user._id, date: { $gte: since } });
    if (!recent) {
      created.push({ user: user._id, type: 'weight', title: 'Weekly weigh-in', link: '/progress',
        message: 'It has been a week since your last weight check-in. Log it to keep your trend accurate.' });
    }
  }
  if (prefs.meal && !has('meal') && hhmm >= (times.meal || '13:00')) {
    const meals = await Meal.countDocuments({ user: user._id, date: today });
    if (meals === 0) {
      created.push({ user: user._id, type: 'meal', title: 'Log your meals', link: '/nutrition',
        message: 'No meals logged today. Track your intake to stay on target.' });
    }
  }
  if (created.length) await Notification.insertMany(created);
  return created.length;
}
