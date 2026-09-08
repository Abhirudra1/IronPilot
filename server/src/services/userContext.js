import { WorkoutSession, WorkoutLog, WeightHistory, Meal, WaterLog } from '../models/index.js';
import { daysAgo, startOfDay, endOfDay } from '../utils/dates.js';
import { macroTargets, bmi } from '../utils/fitness.js';

/** Build a compact snapshot of the user's data for AI prompts. */
export async function buildUserContext(user, { days = 30 } = {}) {
  const since = daysAgo(days);
  const [sessions, logs, weights, meals, water] = await Promise.all([
    WorkoutSession.find({ user: user._id, status: 'completed', startedAt: { $gte: since } }).sort({ startedAt: -1 }).lean(),
    WorkoutLog.find({ user: user._id, performedAt: { $gte: since } }).lean(),
    WeightHistory.find({ user: user._id, date: { $gte: daysAgo(90) } }).sort({ date: 1 }).lean(),
    Meal.find({ user: user._id, date: { $gte: daysAgo(7) } }).lean(),
    WaterLog.find({ user: user._id, date: { $gte: startOfDay(), $lte: endOfDay() } }).lean(),
  ]);

  const muscleCounts = {};
  const equipmentCounts = {};
  const exerciseCounts = {};
  let totalVolume = 0;
  for (const l of logs) {
    if (l.muscleGroup) muscleCounts[l.muscleGroup] = (muscleCounts[l.muscleGroup] || 0) + 1;
    if (l.equipmentName) equipmentCounts[l.equipmentName] = (equipmentCounts[l.equipmentName] || 0) + 1;
    exerciseCounts[l.exerciseName] = (exerciseCounts[l.exerciseName] || 0) + 1;
    totalVolume += l.volume || 0;
  }
  const top = (obj, n = 5) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`);

  const weekSessions = sessions.filter((s) => s.startedAt >= daysAgo(7));
  const totalMinutes = sessions.reduce((a, s) => a + Math.round((s.durationSeconds || 0) / 60), 0);
  const totalCalories = sessions.reduce((a, s) => a + (s.totalCalories || 0), 0);

  const weeklyMeals = meals.reduce((acc, m) => {
    acc.calories += m.calories || 0; acc.protein += m.protein || 0; return acc;
  }, { calories: 0, protein: 0 });
  const mealDays = new Set(meals.map((m) => m.date.toISOString().slice(0, 10))).size || 1;

  const targets = macroTargets(user);
  const firstW = weights[0]?.weight; const lastW = weights[weights.length - 1]?.weight;
  const currentBmi = bmi(user.currentWeight || user.weight, user.height);

  const todayWater = water.reduce((a, w) => a + w.amountMl, 0);

  return {
    profile: {
      name: user.fullName, gender: user.gender, age: user.age, heightCm: user.height,
      startWeightKg: user.weight, currentWeightKg: user.currentWeight || user.weight, targetWeightKg: user.targetWeight,
      bmi: currentBmi, goal: user.fitnessGoal, experience: user.experienceLevel, activityLevel: user.activityLevel,
      workoutDaysPerWeek: user.workoutDaysPerWeek, dietaryPreference: user.dietaryPreference,
      medicalNotes: user.medicalNotes || 'none',
    },
    targets,
    stats: {
      periodDays: days,
      workoutsInPeriod: sessions.length,
      workoutsLast7Days: weekSessions.length,
      totalMinutes, totalCalories, totalVolumeKg: Math.round(totalVolume),
      currentStreak: user.streak?.current || 0, longestStreak: user.streak?.longest || 0,
      lastWorkoutDate: user.streak?.lastWorkoutDate,
      musclesTrained: top(muscleCounts, 8),
      topEquipment: top(equipmentCounts),
      topExercises: top(exerciseCounts),
      weightTrend: weights.length ? `${firstW}kg -> ${lastW}kg over ${weights.length} entries (90d)` : 'no data',
      avgDailyCalories7d: Math.round(weeklyMeals.calories / mealDays),
      avgDailyProtein7d: Math.round(weeklyMeals.protein / mealDays),
      todayWaterMl: todayWater, waterGoalMl: user.waterGoalMl,
    },
    recentSessions: sessions.slice(0, 7).map((s) => ({
      date: s.startedAt.toISOString().slice(0, 10), focus: s.focus || s.planName,
      minutes: Math.round((s.durationSeconds || 0) / 60), calories: s.totalCalories,
      exercises: s.exercises.filter((e) => e.status === 'completed').map((e) => e.exerciseName),
    })),
  };
}

export function contextToText(ctx) {
  return `USER PROFILE: ${JSON.stringify(ctx.profile)}
DAILY TARGETS: ${JSON.stringify(ctx.targets)}
STATS: ${JSON.stringify(ctx.stats)}
RECENT SESSIONS: ${JSON.stringify(ctx.recentSessions)}`;
}
