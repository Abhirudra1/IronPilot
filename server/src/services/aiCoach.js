import { generate, parseJson, geminiEnabled, COACH_SYSTEM } from './gemini.js';
import { buildUserContext, contextToText } from './userContext.js';
import { AIRecommendation, WorkoutPlan } from '../models/index.js';
import { dateKey, dayName, daysAgo } from '../utils/dates.js';
import { env } from '../config/env.js';

/* ------------------------- Rule-based fallback (no API key / API failure) ------------------------- */
function rulesRecommendations(ctx, scope, plansToday) {
  const s = ctx.stats; const t = ctx.targets; const recs = [];
  const focus = plansToday[0]?.focus || plansToday[0]?.name;
  if (scope === 'daily') {
    recs.push(focus ? `Today is ${focus} day.` : 'No workout scheduled today - a 20 minute walk or light cardio keeps momentum.');
    if (s.todayWaterMl < s.waterGoalMl * 0.5) recs.push(`Water intake is at ${s.todayWaterMl} ml - aim for ${s.waterGoalMl} ml.`);
    if (s.avgDailyProtein7d && s.avgDailyProtein7d < t.protein * 0.8) recs.push(`Protein intake is below target (${s.avgDailyProtein7d}g vs ${t.protein}g).`);
    const trained = s.musclesTrained.map((m) => m.split(' ')[0]);
    if (!trained.some((m) => ['quads', 'hamstrings', 'glutes'].includes(m)) && s.workoutsInPeriod > 2) recs.push('You have not trained legs recently - schedule a leg day this week.');
    if (s.currentStreak >= 3) recs.push(`${s.currentStreak} day streak - keep it going!`);
  } else if (scope === 'weekly') {
    recs.push(`You trained ${s.workoutsLast7Days} day(s) this week against a target of ${ctx.profile.workoutDaysPerWeek}.`);
    if (s.workoutsLast7Days < ctx.profile.workoutDaysPerWeek) recs.push('Consistency is below target - schedule shorter sessions if time is the issue.');
    if (s.totalMinutes / Math.max(1, s.workoutsInPeriod) < 30) recs.push('Average session is under 30 minutes - add 5 minutes of cardio at the end.');
    if (s.topEquipment.length) recs.push(`Most used equipment: ${s.topEquipment.slice(0, 3).join(', ')}.`);
  } else {
    recs.push(`Weight trend: ${s.weightTrend}.`);
    recs.push(`${s.workoutsInPeriod} workouts, ${s.totalMinutes} minutes and ${s.totalCalories} kcal burned in the last ${s.periodDays} days.`);
    recs.push(s.workoutsInPeriod >= ctx.profile.workoutDaysPerWeek * 4 ? 'Workout consistency is excellent.' : 'Aim to hit your weekly target every week next month.');
  }
  return { headline: recs[0], recommendations: recs.slice(1) };
}

/* ------------------------- Recommendations (daily / weekly / monthly) ------------------------- */
export async function getRecommendations(user, scope, { force = false } = {}) {
  const today = new Date();
  const key = scope === 'daily' ? dateKey(today) : scope === 'weekly' ? `W${dateKey(daysAgo(today.getDay()))}` : dateKey(today).slice(0, 7);
  if (!force) {
    const cached = await AIRecommendation.findOne({ user: user._id, scope, dateKey: key }).sort({ createdAt: -1 }).lean();
    if (cached && !(cached.source === 'rules' && geminiEnabled())) return cached;
  }
  const plansToday = await WorkoutPlan.find({ user: user._id, isActive: true, scheduledDays: dayName(today) }).lean();
  const ctx = await buildUserContext(user, { days: scope === 'monthly' ? 30 : scope === 'weekly' ? 14 : 7 });

  let result; let source = 'rules'; let response = '';
  if (geminiEnabled()) {
    try {
      const prompt = `<user_data>
${contextToText(ctx)}
</user_data>
TODAY: ${dayName(today)}; SCHEDULED PLANS TODAY: ${plansToday.map((p) => p.focus || p.name).join(', ') || 'none'}
Produce ${scope} coaching recommendations as JSON: {"headline": string (one punchy sentence, e.g. "Today is Chest and Triceps Day."), "recommendations": string[] (3-5 short, specific, data-driven sentences like "You missed Legs this week." or "Increase cardio by 5 minutes.")}`;
      response = await generate({ userId: user._id, system: COACH_SYSTEM, messages: [{ role: 'user', text: prompt }], json: true, temperature: 0.6 });
      const parsed = parseJson(response);
      if (parsed?.headline) { result = parsed; source = 'gemini'; }
    } catch (e) { console.warn('[ai] gemini failed, using rules:', e.message); }
  }
  if (!result) result = rulesRecommendations(ctx, scope, plansToday);

  const doc = await AIRecommendation.create({ user: user._id, scope, dateKey: key, headline: result.headline, recommendations: result.recommendations || [], response, source, model: source === 'gemini' ? env.geminiModel : undefined });
  return doc.toObject();
}

/* ------------------------- Session summary ------------------------- */
export async function sessionSummary(user, session, { ai = true } = {}) {
  const done = session.exercises.filter((e) => e.status === 'completed');
  const minutes = Math.round((session.durationSeconds || 0) / 60);
  const fallback = `Great work! You completed ${done.length}/${session.exercises.length} exercises in ${minutes} minutes, burning about ${session.totalCalories} kcal${session.totalVolume ? ` and lifting ${Math.round(session.totalVolume)} kg total` : ''}. Hydrate, get protein within the next hour, and rest well.`;
  if (!geminiEnabled() || !ai) return fallback;
  try {
    const ctx = await buildUserContext(user, { days: 14 });
    const prompt = `<user_data>
${contextToText(ctx)}
</user_data>
JUST COMPLETED SESSION: ${JSON.stringify({ focus: session.focus, minutes, calories: session.totalCalories, volumeKg: Math.round(session.totalVolume), exercises: session.exercises.map((e) => ({ name: e.exerciseName, status: e.status, sets: e.sets?.filter((s) => s.completed).map((s) => `${s.reps}x${s.weight}kg`), durationMin: e.durationSeconds ? Math.round(e.durationSeconds / 60) : undefined })) })}
Write a 3-4 sentence motivating post-workout summary with one concrete improvement for next time. Plain text, no markdown.`;
    const text = await generate({ userId: user._id, system: COACH_SYSTEM, messages: [{ role: 'user', text: prompt }], temperature: 0.8, maxOutputTokens: 400 });
    return text.trim() || fallback;
  } catch (e) { console.warn('[ai] summary failed:', e.message); return fallback; }
}
