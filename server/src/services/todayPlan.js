import { WorkoutPlan, WorkoutSession } from '../models/index.js';
import { dayName } from '../utils/dates.js';
import { effectiveStreak } from './streak.js';

const label = (s) => String(s || '').replace(/_/g, ' ');
const pick = (p) => ({ _id: p._id, name: p.name, focus: p.focus, muscleGroups: p.muscleGroups || [], exerciseCount: p.exercises?.length || 0, estimatedMinutes: p.estimatedMinutes, isPublic: Boolean(p.isPublic), isOwn: Boolean(p.user) });

/**
 * Coach pick for today: the scheduled plan if there is one, otherwise the plan (own or template) whose
 * muscle groups have gone longest without training - switching to something light when the streak is
 * long and yesterday was hard, or when the weekly target is already met.
 */
export async function suggestTodayPlan(user) {
  const now = Date.now();
  const [scheduled, recent, plans] = await Promise.all([
    WorkoutPlan.find({ user: user._id, isActive: true, scheduledDays: dayName() }).lean(),
    WorkoutSession.find({ user: user._id, status: 'completed', startedAt: { $gte: new Date(now - 14 * 864e5) } }).sort({ startedAt: -1 }).select('muscleGroups startedAt durationSeconds totalVolume planName focus').lean(),
    WorkoutPlan.find({ isActive: true, $or: [{ user: user._id }, { isPublic: true }] }).lean(),
  ]);
  const streak = effectiveStreak(user);
  const sessionsThisWeek = recent.filter((s) => now - new Date(s.startedAt).getTime() < 7 * 864e5).length;
  if (scheduled.length) return { plan: pick(scheduled[0]), reason: `Scheduled for ${label(dayName())}.`, kind: 'scheduled', streak, sessionsThisWeek };
  if (!plans.length) return { plan: null, reason: 'Create a plan or pick a template to get a daily coach pick.', kind: 'none', streak, sessionsThisWeek };

  const lastTrained = {}; // muscle group -> days since last trained
  for (const s of recent) {
    const days = (now - new Date(s.startedAt).getTime()) / 864e5;
    for (const m of s.muscleGroups || []) if (lastTrained[m] === undefined || days < lastTrained[m]) lastTrained[m] = days;
  }
  const yesterday = recent.find((s) => now - new Date(s.startedAt).getTime() < 36 * 3600e3);
  const hardYesterday = Boolean(yesterday && ((yesterday.durationSeconds || 0) > 50 * 60 || (yesterday.totalVolume || 0) > 5000));
  const wantsRecovery = (streak >= 5 && hardYesterday) || sessionsThisWeek >= (user.workoutDaysPerWeek || 3);
  const isCardio = (p) => (p.muscleGroups?.length ? p.muscleGroups.every((g) => g === 'cardio') : false) || /cardio/i.test(p.focus || p.name);

  const score = (p) => {
    const groups = p.muscleGroups?.length ? p.muscleGroups : ['full_body'];
    let s = groups.reduce((a, g) => a + Math.min(10, lastTrained[g] ?? 10), 0) / groups.length; // longer untrained = higher
    if (wantsRecovery) s += isCardio(p) ? 6 : -4; else if (isCardio(p)) s -= 2;
    if (p.user && String(p.user) === String(user._id)) s += 1.5; // prefer the user's own plans
    if (/beginner/i.test(p.name)) s += user.experienceLevel === 'beginner' ? 1 : -0.5;
    if (['weight_loss', 'fat_loss'].includes(user.fitnessGoal) && isCardio(p)) s += 1.5;
    if (['muscle_gain', 'strength_gain'].includes(user.fitnessGoal) && isCardio(p)) s -= 1;
    return s;
  };
  const best = [...plans].sort((a, b) => score(b) - score(a))[0];
  const stale = (best.muscleGroups || []).filter((g) => lastTrained[g] === undefined || lastTrained[g] >= 4);
  let reason;
  if (wantsRecovery && streak >= 5) reason = `${streak}-day streak and a hard session yesterday - keep the habit with something lighter.`;
  else if (wantsRecovery) reason = `You have already hit ${sessionsThisWeek}/${user.workoutDaysPerWeek} sessions this week - an easy day keeps momentum without overtraining.`;
  else if (stale.length && lastTrained[stale[0]] === undefined) reason = `${stale.map(label).join(' & ')} ${stale.length > 1 ? 'have' : 'has'} not been trained in the last two weeks.`;
  else if (stale.length) reason = `${stale.map(label).join(' & ')} last trained ${Math.round(lastTrained[stale[0]])} days ago - time to hit ${stale.length > 1 ? 'them' : 'it'} again.`;
  else reason = 'Balanced pick based on what you trained this week.';
  return { plan: pick(best), reason, kind: wantsRecovery ? 'recovery' : 'balance', streak, sessionsThisWeek };
}
