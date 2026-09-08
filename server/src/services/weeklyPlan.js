import { WorkoutPlan, AIRecommendation, Exercise } from '../models/index.js';
import { generate, parseJson, geminiEnabled, COACH_SYSTEM } from './gemini.js';
import { buildUserContext, contextToText } from './userContext.js';
import { exerciseHistory, suggestLoad, historyText } from './loads.js';
import { macroTargets } from '../utils/fitness.js';
import { DAYS } from '../utils/constants.js';

const label = (s) => String(s || '').replace(/_/g, ' ');
const SPREAD = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

/** Monday of the current week as YYYY-MM-DD (the cache key). */
export function weekKey(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

function rulesWeek(user, ctx, plans, history) {
  const t = macroTargets(user);
  const daysTarget = Math.min(7, Math.max(1, user.workoutDaysPerWeek || 3));
  const slots = SPREAD[daysTarget];
  const pool = plans.length ? plans : [];
  const days = DAYS.map((day, i) => {
    const k = slots.indexOf(i);
    if (k < 0 || !pool.length) return { day, type: 'rest', focus: 'Rest & recovery', muscleGroups: [], exercises: [], notes: k >= 0 ? 'Create a plan or copy a template so the coach can fill this day.' : 'Easy 20-30 min walk, stretch, sleep 7-8 h.' };
    const p = pool[k % pool.length];
    const exercises = p.exercises.map((e) => {
      const load = e.type === 'cardio' ? null : suggestLoad(user, e.exerciseName, e.equipmentName || '', history);
      return { name: e.exerciseName, type: e.type, sets: e.sets, reps: e.reps, weightKg: load ? load.weight : 0, durationMin: e.type === 'cardio' ? e.duration : 0, note: load ? load.note : `${e.duration} min steady pace` };
    });
    return { day, type: 'training', focus: p.focus || p.name, planId: String(p._id), muscleGroups: p.muscleGroups || [], exercises, warmup: '5 min easy cardio + 2 light warm-up sets of the first lift', notes: user.experienceLevel === 'beginner' ? 'Stop each set 2 reps before failure; form first.' : 'Leave 1-2 reps in reserve; add load when all sets hit the top of the rep range.' };
  });
  const protein = t.protein;
  const s = ctx.stats;
  const coachNotes = [
    s.workoutsLast7Days < daysTarget ? `You trained ${s.workoutsLast7Days} time${s.workoutsLast7Days === 1 ? '' : 's'} last week against a target of ${daysTarget}; the plan keeps sessions short so consistency comes first.` : `Great consistency last week (${s.workoutsLast7Days} sessions) - this week adds a little load.`,
    s.avgDailyProtein7d && s.avgDailyProtein7d < protein * 0.8 ? `Protein has averaged ${s.avgDailyProtein7d} g/day; aim for ${protein} g by adding a protein source to every meal.` : `Keep protein at about ${protein} g/day (${Math.round(protein / 4)} g per meal over 4 meals).`,
    s.currentStreak >= 5 ? 'Streak is strong - protect it with at least a walk on rest days.' : 'Log every session, even short ones, to build the streak.',
  ];
  return {
    summary: `${daysTarget}-day ${label(user.fitnessGoal)} week built from your plans and recent lifts.`,
    days,
    nutrition: {
      trainingDayCalories: t.calories, restDayCalories: Math.round(t.calories * 0.92), protein, carbs: t.carbs, fat: t.fat, waterMl: t.water,
      mealStructure: [{ meal: 'breakfast', protein: Math.round(protein * 0.25), idea: 'eggs / paneer / Greek yogurt with oats or fruit' }, { meal: 'lunch', protein: Math.round(protein * 0.3), idea: 'lean protein + rice or roti + vegetables' }, { meal: 'snack', protein: Math.round(protein * 0.15), idea: 'whey, curd, nuts or a protein bar' }, { meal: 'dinner', protein: Math.round(protein * 0.3), idea: 'protein + vegetables, lighter carbs on rest days' }],
      tips: ['Have protein within 1-2 hours after training.', 'Rest days: same protein, slightly fewer carbs.', `Drink about ${Math.round(t.water / 250)} glasses of water spread through the day.`],
    },
    coachNotes,
    source: 'rules',
  };
}

function sanitizeWeek(parsed, fallback) {
  const byDay = new Map((parsed.days || []).map((d) => [String(d.day || '').toLowerCase(), d]));
  const days = DAYS.map((day) => {
    const d = byDay.get(day); const fb = fallback.days.find((x) => x.day === day);
    if (!d) return fb;
    const training = d.type !== 'rest' && Array.isArray(d.exercises) && d.exercises.length > 0;
    return {
      day, type: training ? 'training' : 'rest', focus: String(d.focus || fb.focus).slice(0, 60), muscleGroups: Array.isArray(d.muscleGroups) ? d.muscleGroups.map(String).slice(0, 6) : fb.muscleGroups,
      exercises: training ? d.exercises.slice(0, 10).map((e) => ({ name: String(e.name || '').slice(0, 60), type: e.durationMin > 0 ? 'cardio' : 'strength', sets: Math.min(10, Math.max(1, Number(e.sets) || 3)), reps: Math.min(50, Math.max(0, Number(e.reps) || 0)), weightKg: Math.max(0, Number(e.weightKg) || 0), durationMin: Math.max(0, Number(e.durationMin) || 0), note: String(e.note || '').slice(0, 140) })) : [],
      warmup: String(d.warmup || fb.warmup || '').slice(0, 140), notes: String(d.notes || '').slice(0, 200),
    };
  });
  const n = parsed.nutrition || {}; const fn = fallback.nutrition;
  const num = (v, f) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : f);
  return {
    summary: String(parsed.summary || fallback.summary).slice(0, 240),
    days,
    nutrition: {
      trainingDayCalories: num(n.trainingDayCalories, fn.trainingDayCalories), restDayCalories: num(n.restDayCalories, fn.restDayCalories), protein: num(n.protein, fn.protein), carbs: num(n.carbs, fn.carbs), fat: num(n.fat, fn.fat), waterMl: num(n.waterMl, fn.waterMl),
      mealStructure: Array.isArray(n.mealStructure) && n.mealStructure.length ? n.mealStructure.slice(0, 6).map((m) => ({ meal: String(m.meal || '').slice(0, 20), protein: num(m.protein, 0), idea: String(m.idea || '').slice(0, 120) })) : fn.mealStructure,
      tips: Array.isArray(n.tips) ? n.tips.map(String).slice(0, 5) : fn.tips,
    },
    coachNotes: Array.isArray(parsed.coachNotes) ? parsed.coachNotes.map((x) => String(x).slice(0, 220)).slice(0, 5) : fallback.coachNotes,
    source: 'gemini',
  };
}

/** Build (or reuse) this week's programme: one model call per user per week at most. */
export async function getWeeklyPlan(user, { force = false } = {}) {
  const key = weekKey();
  const existing = await AIRecommendation.findOne({ user: user._id, scope: 'weekly_plan', dateKey: key }).lean();
  if (existing && !force && !(existing.source === 'rules' && geminiEnabled())) return { ...existing.content, weekStart: key, generatedAt: existing.updatedAt };

  const [ctx, plans, history] = await Promise.all([
    buildUserContext(user, { days: 28 }),
    WorkoutPlan.find({ isActive: true, $or: [{ user: user._id }, { isPublic: true }] }).sort({ user: -1, updatedAt: -1 }).lean(),
    exerciseHistory(user),
  ]);
  const own = plans.filter((p) => p.user && String(p.user) === String(user._id));
  const fallback = rulesWeek(user, ctx, own.length ? own : plans, history);
  let content = fallback;
  if (geminiEnabled()) {
    try {
      const library = await Exercise.find({ isActive: true }).select('name primaryMuscle type difficulty').lean();
      const prompt = `<user_data>
${contextToText(ctx)}
Strength history (last 90 days):
${historyText(history)}
The user's own plans: ${JSON.stringify(own.slice(0, 6).map((p) => ({ name: p.name, focus: p.focus, exercises: p.exercises.map((e) => `${e.exerciseName} ${e.sets}x${e.reps}`) })))}
</user_data>
You are a strength & conditioning coach with 10+ years of experience. Programme THIS week (Monday-Sunday) for this user: ${user.workoutDaysPerWeek} training days spread sensibly with rest days, matching their goal (${user.fitnessGoal}), level (${user.experienceLevel}) and what they actually did recently. Use their own plans where they fit, otherwise exercises from this library only: ${library.map((e) => e.name).join(', ')}.
For every strength exercise give a concrete starting weight in kg (per hand for dumbbells) based on their history (progress ~2.5-5% when they hit the top of the rep range; repeat the load otherwise; conservative estimates from body weight when there is no history). Cardio gets minutes. Keep sessions 45-60 minutes.
Nutrition: daily calories for training vs rest days, protein/carbs/fat, water, and how to split protein across meals for their diet preference (${user.dietaryPreference}).
Return JSON only: {"summary": string, "days": [{"day": "monday".."sunday", "type": "training"|"rest", "focus": string, "muscleGroups": string[], "warmup": string, "exercises": [{"name": string, "sets": number, "reps": number, "weightKg": number, "durationMin": number, "note": string}], "notes": string}], "nutrition": {"trainingDayCalories": number, "restDayCalories": number, "protein": number, "carbs": number, "fat": number, "waterMl": number, "mealStructure": [{"meal": string, "protein": number, "idea": string}], "tips": string[]}, "coachNotes": string[] (3-5 specific observations from their data)}`;
      const text = await generate({ userId: user._id, system: COACH_SYSTEM, messages: [{ role: 'user', text: prompt }], json: true, temperature: 0.5, maxOutputTokens: 4000 });
      const parsed = parseJson(text);
      if (parsed?.days?.length) content = sanitizeWeek(parsed, fallback);
    } catch (e) { console.warn('[ai] weekly plan failed:', e.message?.slice(0, 160)); }
  }
  // upsert: one document per user per week, never duplicates
  const saved = await AIRecommendation.findOneAndUpdate({ user: user._id, scope: 'weekly_plan', dateKey: key }, { $set: { content, source: content.source, headline: content.summary } }, { upsert: true, new: true });
  return { ...content, weekStart: key, generatedAt: saved.updatedAt };
}

/**
 * Turn the week into real plans + schedule. Idempotent: plans are matched by name for this week,
 * so applying twice updates instead of creating duplicates.
 */
export async function applyWeeklyPlan(user) {
  const week = await getWeeklyPlan(user);
  const exercises = await Exercise.find({ isActive: true }).populate('equipment', 'name').lean();
  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));
  const schedule = {};
  const created = [];
  for (const d of week.days) {
    if (d.type !== 'training' || !d.exercises.length) { schedule[d.day] = null; continue; }
    // Friendly name (the focus); the week is kept in the description and used to match existing plans
    const name = String(d.focus || 'Workout').slice(0, 60);
    const description = `Coach plan · week of ${week.weekStart} (${d.day})`;
    const exList = d.exercises.map((e, i) => {
      const doc = byName.get(e.name.toLowerCase());
      return { exercise: doc?._id, exerciseName: doc?.name || e.name, equipment: doc?.equipment?._id, equipmentName: doc?.equipment?.name, muscleGroup: doc?.primaryMuscle, type: e.type === 'cardio' || e.durationMin > 0 ? 'cardio' : 'strength', sets: e.sets, reps: e.reps, weight: e.weightKg || 0, duration: e.durationMin || 0, restSeconds: user.experienceLevel === 'beginner' ? 90 : 60, notes: e.note, order: i };
    });
    const estimatedMinutes = Math.round(exList.reduce((a, e) => a + (e.type === 'cardio' ? e.duration : (e.sets * (e.restSeconds + 40)) / 60), 0));
    const plan = await WorkoutPlan.findOneAndUpdate(
      { user: user._id, description, isActive: true },
      { $set: { name, focus: d.focus, muscleGroups: d.muscleGroups.filter((m) => /^[a-z_]+$/.test(m)), exercises: exList, estimatedMinutes, generatedByAI: week.source === 'gemini', isTemplate: false, isPublic: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    schedule[d.day] = String(plan._id);
    created.push(plan);
  }
  // one plan per weekday: clear old assignments, then set the new ones; retire plans from the old naming scheme
  await WorkoutPlan.updateMany({ user: user._id }, { $set: { scheduledDays: [] } });
  await WorkoutPlan.updateMany({ user: user._id, name: new RegExp(`^Week ${week.weekStart} · `), _id: { $nin: created.map((p) => p._id) } }, { $set: { isActive: false } });
  for (const p of created) {
    const days = Object.entries(schedule).filter(([, id]) => id === String(p._id)).map(([day]) => day);
    await WorkoutPlan.updateOne({ _id: p._id }, { $set: { scheduledDays: days } });
  }
  return { schedule, plans: created.length };
}
