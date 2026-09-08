import { WorkoutSession, WorkoutLog, WeightHistory, WaterLog, Meal } from '../models/index.js';
import { startOfDay, endOfDay, daysAgo, dateKey } from '../utils/dates.js';
import { bmi } from '../utils/fitness.js';

const uid = (user) => user._id;

export async function dailyAnalytics(user, date = new Date()) {
  const range = { $gte: startOfDay(date), $lte: endOfDay(date) };
  const [sessions, water, meals] = await Promise.all([
    WorkoutSession.find({ user: uid(user), status: 'completed', startedAt: range }).lean(),
    WaterLog.find({ user: uid(user), date: range }).lean(),
    Meal.find({ user: uid(user), date: range }).lean(),
  ]);
  const workoutSeconds = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
  const calories = sessions.reduce((a, s) => a + (s.totalCalories || 0), 0);
  const waterMl = water.reduce((a, w) => a + w.amountMl, 0);
  const intake = meals.reduce((a, m) => ({
    calories: a.calories + (m.calories || 0), protein: a.protein + (m.protein || 0),
    carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  // Steps are estimated from cardio distance (no wearable integration yet)
  const cardioKm = sessions.flatMap((s) => s.exercises).reduce((a, e) => a + (e.distanceKm || 0), 0);
  return {
    date: dateKey(date), workouts: sessions.length, workoutMinutes: Math.round(workoutSeconds / 60),
    caloriesBurned: calories, waterMl, waterGoalMl: user.waterGoalMl, steps: Math.round(cardioKm * 1300),
    intake,
  };
}

export async function weeklyAnalytics(user, weeks = 1) {
  const since = daysAgo(7 * weeks - 1);
  const [sessions, logs] = await Promise.all([
    WorkoutSession.find({ user: uid(user), status: 'completed', startedAt: { $gte: since } }).lean(),
    WorkoutLog.find({ user: uid(user), performedAt: { $gte: since } }).lean(),
  ]);
  const days = [];
  for (let i = 7 * weeks - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = dateKey(d);
    const s = sessions.filter((x) => dateKey(x.startedAt) === key);
    days.push({
      date: key, day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      workouts: s.length, minutes: Math.round(s.reduce((a, x) => a + (x.durationSeconds || 0), 0) / 60),
      calories: s.reduce((a, x) => a + (x.totalCalories || 0), 0),
      volume: Math.round(s.reduce((a, x) => a + (x.totalVolume || 0), 0)),
    });
  }
  const muscleGroups = {};
  for (const l of logs) if (l.muscleGroup) muscleGroups[l.muscleGroup] = (muscleGroups[l.muscleGroup] || 0) + 1;
  const activeDays = days.filter((d) => d.workouts > 0).length;
  const consistencyScore = Math.min(100, Math.round((activeDays / (user.workoutDaysPerWeek * weeks)) * 100));
  return {
    days, activeDays, targetDays: user.workoutDaysPerWeek * weeks,
    totalMinutes: days.reduce((a, d) => a + d.minutes, 0),
    totalCalories: days.reduce((a, d) => a + d.calories, 0),
    totalVolume: days.reduce((a, d) => a + d.volume, 0),
    consistencyScore,
    muscleGroups: Object.entries(muscleGroups).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

export async function monthlyAnalytics(user) {
  const since = daysAgo(29);
  const [sessions, weights, logs] = await Promise.all([
    WorkoutSession.find({ user: uid(user), status: 'completed', startedAt: { $gte: since } }).lean(),
    WeightHistory.find({ user: uid(user), date: { $gte: since } }).sort({ date: 1 }).lean(),
    WorkoutLog.find({ user: uid(user), performedAt: { $gte: since }, type: 'strength' }).lean(),
  ]);
  const plannedWorkouts = Math.round((user.workoutDaysPerWeek / 7) * 30);
  const completionRate = Math.min(100, Math.round((sessions.length / Math.max(1, plannedWorkouts)) * 100));
  const startW = weights[0]?.weight ?? user.currentWeight ?? user.weight;
  const endW = weights[weights.length - 1]?.weight ?? user.currentWeight ?? user.weight;
  const weightChange = Math.round((endW - startW) * 10) / 10;

  // Goal progress: % of distance from start weight to target weight covered
  let goalProgress = 0;
  if (user.targetWeight && user.weight && user.currentWeight) {
    const total = Math.abs(user.targetWeight - user.weight);
    const done = Math.abs(user.currentWeight - user.weight);
    goalProgress = total === 0 ? 100 : Math.min(100, Math.round((done / total) * 100));
    if ((user.targetWeight < user.weight && user.currentWeight > user.weight) || (user.targetWeight > user.weight && user.currentWeight < user.weight)) goalProgress = 0;
  }
  // Strength progress: compare avg volume first half vs second half
  const mid = daysAgo(14);
  const first = logs.filter((l) => l.performedAt < mid); const second = logs.filter((l) => l.performedAt >= mid);
  const avg = (arr) => (arr.length ? arr.reduce((a, l) => a + (l.volume || 0), 0) / arr.length : 0);
  const strengthChange = avg(first) ? Math.round(((avg(second) - avg(first)) / avg(first)) * 100) : 0;
  const progressScore = Math.round(completionRate * 0.5 + Math.min(100, goalProgress) * 0.3 + Math.min(100, Math.max(0, 50 + strengthChange)) * 0.2);

  // weekly buckets for chart
  const weeksArr = [];
  for (let w = 3; w >= 0; w--) {
    const from = daysAgo(w * 7 + 6); const to = endOfDay(daysAgo(w * 7));
    const s = sessions.filter((x) => x.startedAt >= from && x.startedAt <= to);
    weeksArr.push({ label: `W${4 - w}`, workouts: s.length, minutes: Math.round(s.reduce((a, x) => a + (x.durationSeconds || 0), 0) / 60), calories: s.reduce((a, x) => a + (x.totalCalories || 0), 0) });
  }
  return { workouts: sessions.length, plannedWorkouts, completionRate, weightChange, goalProgress, strengthChange, progressScore, weeks: weeksArr,
    weightSeries: weights.map((w) => ({ date: dateKey(w.date), weight: w.weight, bmi: w.bmi || bmi(w.weight, user.height) })) };
}

export async function equipmentAnalytics(user) {
  const logs = await WorkoutLog.find({ user: uid(user) }).lean();
  const eq = {}; const ex = {};
  for (const l of logs) {
    if (l.equipmentName) eq[l.equipmentName] = (eq[l.equipmentName] || 0) + 1;
    ex[l.exerciseName] = (ex[l.exerciseName] || 0) + 1;
  }
  const sorted = Object.entries(eq).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const exSorted = Object.entries(ex).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const sessions = await WorkoutSession.find({ user: uid(user), status: 'completed' }).select('durationSeconds').lean();
  const avgDuration = sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / sessions.length / 60) : 0;
  return { mostUsed: sorted.slice(0, 5), leastUsed: sorted.slice(-5).reverse(), favoriteExercise: exSorted[0] || null, topExercises: exSorted.slice(0, 5), avgWorkoutMinutes: avgDuration, totalLogs: logs.length };
}
