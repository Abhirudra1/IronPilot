import { z } from 'zod';
import { isSafeImageUrl } from '../utils/security.js';
import { User, WorkoutPlan, WorkoutSession, WaterLog, WeightHistory } from '../models/index.js';
import { macroTargets, bmi, bmiCategory } from '../utils/fitness.js';
import { startOfDay, endOfDay, dayName } from '../utils/dates.js';
import { effectiveStreak } from '../services/streak.js';
import { suggestTodayPlan } from '../services/todayPlan.js';
import { FITNESS_GOALS, EXPERIENCE_LEVELS, DIETARY_PREFERENCES, GENDERS, ACTIVITY_LEVELS } from '../utils/constants.js';

export const profileSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  avatarUrl: z.string().max(500000).refine(isSafeImageUrl, 'avatar must be an image data URL or http(s) URL').optional().nullable(),
  gender: z.enum(GENDERS).optional(),
  age: z.coerce.number().min(10).max(100).optional(),
  height: z.coerce.number().min(80).max(260).optional(),
  weight: z.coerce.number().min(20).max(400).optional(),
  currentWeight: z.coerce.number().min(20).max(400).optional(),
  targetWeight: z.coerce.number().min(20).max(400).optional(),
  measurements: z.object({ chest: z.number().optional(), waist: z.number().optional(), hips: z.number().optional(), arms: z.number().optional(), thighs: z.number().optional(), neck: z.number().optional(), shoulders: z.number().optional() }).partial().optional(),
  fitnessGoal: z.enum(FITNESS_GOALS).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  workoutDaysPerWeek: z.coerce.number().min(1).max(7).optional(),
  dietaryPreference: z.enum(DIETARY_PREFERENCES).optional(),
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
  medicalNotes: z.string().max(2000).optional().nullable(),
  waterGoalMl: z.coerce.number().min(500).max(8000).optional(),
  calorieTarget: z.coerce.number().min(800).max(6000).optional(),
  proteinTarget: z.coerce.number().min(20).max(400).optional(),
  carbTarget: z.coerce.number().min(20).max(800).optional(),
  fatTarget: z.coerce.number().min(10).max(300).optional(),
  preferences: z.any().optional(),
});

export async function updateProfile(req, res) {
  const user = req.user;
  const body = req.body;
  const recompute = ['weight', 'currentWeight', 'height', 'age', 'gender', 'fitnessGoal', 'activityLevel'].some((k) => body[k] !== undefined);
  Object.assign(user, body);
  if (body.preferences) user.preferences = { ...user.preferences.toObject?.() ?? user.preferences, ...body.preferences };
  if (recompute && !body.calorieTarget) {
    const t = macroTargets(user);
    user.calorieTarget = t.calories; user.proteinTarget = t.protein; user.carbTarget = t.carbs; user.fatTarget = t.fat;
    if (!body.waterGoalMl) user.waterGoalMl = t.water;
  }
  await user.save();
  res.json({ success: true, user: user.toSafeJSON() });
}

export async function toggleFavorite(req, res) {
  const id = req.params.exerciseId;
  const idx = req.user.favoriteExercises.findIndex((e) => e.toString() === id);
  if (idx >= 0) req.user.favoriteExercises.splice(idx, 1); else req.user.favoriteExercises.push(id);
  await req.user.save();
  res.json({ success: true, favorites: req.user.favoriteExercises });
}

export async function targets(req, res) {
  const t = macroTargets(req.user);
  res.json({ success: true, computed: t, current: { calories: req.user.calorieTarget, protein: req.user.proteinTarget, carbs: req.user.carbTarget, fat: req.user.fatTarget, water: req.user.waterGoalMl } });
}

export async function dashboard(req, res) {
  const user = req.user;
  const today = { $gte: startOfDay(), $lte: endOfDay() };
  const [plans, sessionsToday, activeSession, water, lastWeight, suggestion] = await Promise.all([
    WorkoutPlan.find({ user: user._id, isActive: true, scheduledDays: dayName() }).lean(),
    WorkoutSession.find({ user: user._id, status: 'completed', startedAt: today }).lean(),
    WorkoutSession.findOne({ user: user._id, status: { $in: ['active', 'paused'] } }).select('_id planName focus startedAt').lean(),
    WaterLog.find({ user: user._id, date: today }).lean(),
    WeightHistory.findOne({ user: user._id }).sort({ date: -1 }).lean(),
    suggestTodayPlan(user).catch(() => null),
  ]);
  const waterMl = water.reduce((a, w) => a + w.amountMl, 0);
  const currentWeight = lastWeight?.weight ?? user.currentWeight ?? user.weight;
  let goalProgress = 0;
  if (user.targetWeight && user.weight) {
    const total = Math.abs(user.targetWeight - user.weight);
    const done = user.targetWeight < user.weight ? user.weight - currentWeight : currentWeight - user.weight;
    goalProgress = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }
  const b = bmi(currentWeight, user.height);
  res.json({
    success: true,
    suggestion,
    today: {
      day: dayName(),
      plans: plans.map((p) => ({ _id: p._id, name: p.name, focus: p.focus, exerciseCount: p.exercises.length, estimatedMinutes: p.estimatedMinutes })),
      workouts: sessionsToday.length,
      caloriesBurned: sessionsToday.reduce((a, s) => a + (s.totalCalories || 0), 0),
      workoutMinutes: Math.round(sessionsToday.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60),
      waterMl, waterGoalMl: user.waterGoalMl, waterRemainingMl: Math.max(0, user.waterGoalMl - waterMl),
      currentWeight, targetWeight: user.targetWeight, startWeight: user.weight, goalProgress, bmi: b, bmiCategory: bmiCategory(b),
      streak: effectiveStreak(user), longestStreak: user.streak?.longest || 0,
      points: user.points, level: user.level, totalWorkouts: user.totalWorkouts,
    },
    activeSession,
  });
}

export async function deleteAccount(req, res) {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  res.json({ success: true });
}
