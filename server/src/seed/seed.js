import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { User, Equipment, Exercise, Achievement, DietPlan, WorkoutPlan, Food } from '../models/index.js';
import { EQUIPMENT } from './equipment.data.js';
import { EXERCISES } from './exercises.data.js';
import { DIET_TEMPLATES } from './diets.data.js';
import { FOODS } from './foods.data.js';
import { ACHIEVEMENT_CATALOG } from '../services/achievements.js';
import { macroTargets } from '../utils/fitness.js';

export async function runSeed() {

  // Equipment (upsert by slug)
  for (const e of EQUIPMENT) await Equipment.updateOne({ slug: e.slug }, { $set: e }, { upsert: true });
  const equipment = await Equipment.find({}).lean();
  const bySlug = new Map(equipment.map((e) => [e.slug, e]));
  console.log(`[seed] equipment: ${equipment.length}`);

  // Exercises
  for (const x of EXERCISES) {
    const eq = x.equipmentSlug ? bySlug.get(x.equipmentSlug) : null;
    const doc = { ...x, equipment: eq?._id, metActivity: x.metActivity || eq?.metActivity || (x.type === 'cardio' ? 'default' : 'strength') };
    await Exercise.updateOne({ slug: x.slug }, { $set: doc }, { upsert: true });
  }
  console.log(`[seed] exercises: ${await Exercise.countDocuments()}`);

  // Achievements
  for (const a of ACHIEVEMENT_CATALOG) await Achievement.updateOne({ key: a.key }, { $set: a }, { upsert: true });
  console.log(`[seed] achievements: ${ACHIEVEMENT_CATALOG.length}`);

  // Foods (nutrition library)
  for (const food of FOODS) await Food.updateOne({ slug: food.slug }, { $set: food }, { upsert: true });
  console.log(`[seed] foods: ${FOODS.length}`);

  // Diet templates
  for (const d of DIET_TEMPLATES) await DietPlan.updateOne({ name: d.name, isTemplate: true }, { $set: { ...d, user: null } }, { upsert: true });
  console.log(`[seed] diet templates: ${DIET_TEMPLATES.length}`);

  // Admin user
  let admin = await User.findOne({ email: env.adminEmail });
  if (!admin) {
    admin = new User({
      fullName: 'IronPilot Admin', email: env.adminEmail, password: env.adminPassword, role: 'admin', gender: 'other', age: 30, height: 175, weight: 75,
      currentWeight: 75, targetWeight: 72, fitnessGoal: 'general_fitness', experienceLevel: 'intermediate', workoutDaysPerWeek: 4, dietaryPreference: 'no_preference',
    });
    const t = macroTargets(admin);
    Object.assign(admin, { calorieTarget: t.calories, proteinTarget: t.protein, carbTarget: t.carbs, fatTarget: t.fat, waterGoalMl: t.water });
    await admin.save();
    console.log(`[seed] admin created: ${env.adminEmail} / ${env.adminPassword}`);
  }

  // Public workout templates
  const ex = (slug, sets, reps, duration = 0, rest = 60) => {
    const e = EXERCISES.find((x) => x.slug === slug);
    if (!e) throw new Error(`missing exercise ${slug}`);
    return { exerciseSlug: slug, exerciseName: e.name, equipmentSlug: e.equipmentSlug, muscleGroup: e.primaryMuscle, type: e.type, sets, reps, duration, restSeconds: rest };
  };
  const templates = [
    { name: 'Beginner Chest & Triceps', focus: 'Chest & Triceps', muscleGroups: ['chest', 'triceps'], exercises: [ex('treadmill-walk-run', 1, 0, 10), ex('chest-press-machine-exercise', 3, 12), ex('pec-deck-fly', 3, 12), ex('dumbbell-bench-press', 3, 10), ex('cable-rope-pushdown', 3, 12), ex('overhead-dumbbell-extension', 3, 12)] },
    { name: 'Beginner Back & Biceps', focus: 'Back & Biceps', muscleGroups: ['back', 'biceps'], exercises: [ex('stationary-cycling', 1, 0, 10), ex('lat-pulldown-exercise', 4, 10), ex('seated-cable-row', 3, 12), ex('one-arm-dumbbell-row', 3, 10), ex('dumbbell-bicep-curl', 3, 12), ex('hammer-curl', 3, 12)] },
    { name: 'Beginner Legs', focus: 'Legs', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'], exercises: [ex('treadmill-incline-walk', 1, 0, 10), ex('leg-press-exercise', 4, 10, 0, 90), ex('goblet-squat', 3, 12), ex('leg-extension-exercise', 3, 12), ex('lying-leg-curl', 3, 12), ex('standing-calf-raise', 4, 15)] },
    { name: 'Shoulders & Core', focus: 'Shoulders & Core', muscleGroups: ['shoulders', 'core'], exercises: [ex('cross-trainer-session', 1, 0, 10), ex('shoulder-press-machine-exercise', 3, 10), ex('lateral-raise', 3, 15), ex('face-pull', 3, 15), ex('plank', 3, 45), ex('cable-woodchop', 3, 12)] },
    { name: 'Cardio Blast', focus: 'Cardio', muscleGroups: ['cardio'], exercises: [ex('treadmill-walk-run', 1, 0, 15), ex('manual-treadmill-sprints', 1, 0, 12), ex('stationary-cycling', 1, 0, 15), ex('stair-climber-session', 1, 0, 10)] },
    { name: 'Full Body Express', focus: 'Full Body', muscleGroups: ['full_body'], exercises: [ex('rowing-session', 1, 0, 8), ex('goblet-squat', 3, 12), ex('push-ups', 3, 12), ex('one-arm-dumbbell-row', 3, 10), ex('dumbbell-shoulder-press', 3, 10), ex('kettlebell-swing', 3, 15), ex('plank', 3, 45)] },
  ];
  const exDocs = await Exercise.find({}).lean();
  const exBySlug = new Map(exDocs.map((e) => [e.slug, e]));
  for (const t of templates) {
    const exercises = t.exercises.map((e, i) => {
      const doc = exBySlug.get(e.exerciseSlug); const eq = e.equipmentSlug ? bySlug.get(e.equipmentSlug) : null;
      return { exercise: doc._id, exerciseName: e.exerciseName, equipment: eq?._id, equipmentName: eq?.name, muscleGroup: e.muscleGroup, type: e.type, sets: e.sets, reps: e.reps, duration: e.duration, restSeconds: e.restSeconds, order: i };
    });
    const estimatedMinutes = Math.round(exercises.reduce((a, e) => a + (e.type === 'cardio' ? e.duration : e.sets * (e.restSeconds + 40) / 60), 0));
    await WorkoutPlan.updateOne({ name: t.name, isPublic: true }, { $set: { ...t, exercises, estimatedMinutes, isPublic: true, isTemplate: true, user: null } }, { upsert: true });
  }
  console.log(`[seed] workout templates: ${templates.length}`);

  console.log('[seed] done');
}

/** Seed automatically when the library is empty (fresh database) so the app never shows blank screens. */
export async function ensureSeeded() {
  const [equipment, achievements, foods] = await Promise.all([Equipment.countDocuments(), Achievement.countDocuments(), Food.countDocuments()]);
  if (equipment > 0 && achievements > 0 && foods > 0) return false;
  console.log('[seed] empty library detected - seeding');
  await runSeed();
  return true;
}

// Run directly: node src/seed/seed.js
if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('src/seed/seed.js')) {
  connectDB().then(runSeed).then(() => mongoose.disconnect()).catch((e) => { console.error(e); process.exit(1); });
}
