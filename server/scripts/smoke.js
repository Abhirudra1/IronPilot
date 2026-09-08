/**
 * End-to-end smoke test: boots an in-memory MongoDB, seeds it, starts the API and walks through
 * the main user journey (register -> plan -> session -> tracking -> analytics -> admin).
 * Run: npm run smoke
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import assert from 'assert';

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('fitcoach_smoke');
process.env.JWT_SECRET = 'smoke_secret';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.GEMINI_API_KEY = ''; // keep the test deterministic and avoid burning real quota
process.env.SMTP_HOST = '';

const { createApp } = await import('../src/app.js');
const { connectDB } = await import('../src/config/db.js');
const { ensureSeeded } = await import('../src/seed/seed.js');
const mongoose = (await import('mongoose')).default;
await connectDB();
assert.strictEqual(await ensureSeeded(), true, 'auto-seed runs on an empty db');
assert.strictEqual(await ensureSeeded(), false, 'auto-seed is a no-op afterwards');
const server = createApp().listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

let token = '';
const call = async (method, path, body, opts = {}) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(opts.token ?? token ? { Authorization: `Bearer ${opts.token ?? token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!opts.allowFail) assert.ok(res.ok, `${method} ${path} -> ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return { status: res.status, data };
};
const step = (name) => console.log(`  ✓ ${name}`);

try {
  console.log('Smoke test');
  assert.ok((await call('GET', '/health')).data.ok); step('health');

  // Auth
  const reg = await call('POST', '/auth/register', { fullName: 'Test User', email: 'test@fitcoach.ai', password: 'secret123', gender: 'male', age: 28, height: 178, weight: 82, targetWeight: 75, fitnessGoal: 'fat_loss', experienceLevel: 'beginner', workoutDaysPerWeek: 4, dietaryPreference: 'indian' });
  token = reg.data.token; assert.ok(reg.data.user.calorieTarget > 1000); step('register + computed targets');
  assert.strictEqual((await call('POST', '/auth/login', { email: 'test@fitcoach.ai', password: 'wrong' }, { allowFail: true })).status, 401);
  token = (await call('POST', '/auth/login', { email: 'test@fitcoach.ai', password: 'secret123', remember: true })).data.token; step('login');
  const forgot = await call('POST', '/auth/forgot-password', { email: 'test@fitcoach.ai' });
  const resetToken = forgot.data.resetUrl.split('/').pop();
  await call('POST', '/auth/reset-password', { token: resetToken, password: 'secret456' });
  token = (await call('POST', '/auth/login', { email: 'test@fitcoach.ai', password: 'secret456' })).data.token;
  await new Promise((r) => setTimeout(r, 1100)); // JWT iat has second granularity
  const changed = await call('POST', '/auth/change-password', { currentPassword: 'secret456', newPassword: 'secret123' });
  assert.strictEqual((await call('GET', '/auth/me', null, { allowFail: true })).status, 401, 'old token rejected after password change');
  token = changed.data.token; step('forgot / reset / change password (old token invalidated)');
  assert.strictEqual(forgot.data.emailed, false, 'no SMTP configured -> not emailed');
  assert.strictEqual((await call('POST', '/auth/google', { credential: 'x'.repeat(40) }, { allowFail: true })).status, 400); step('google sign-in rejects when not configured');
  const cp = await call('POST', '/auth/complete-profile', { gender: 'female', age: 30, height: 165, weight: 60, fitnessGoal: 'muscle_gain', experienceLevel: 'intermediate', workoutDaysPerWeek: 5, dietaryPreference: 'vegetarian' });
  assert.ok(cp.data.user.profileComplete && cp.data.user.proteinTarget >= 100); step('complete profile (onboarding)');
  const foods = await call('GET', '/library/foods?search=roti');
  assert.ok(foods.data.items.length >= 1 && foods.data.items[0].servings[0].grams > 0 && foods.data.items[0].per100g.calories > 0); step('food library search');
  const tp = await call('GET', '/ai/today-plan'); assert.ok(tp.data.plan && tp.data.reason, 'today plan pick'); step('today plan suggestion');
  const ms = await call('GET', '/ai/meal-suggestions'); assert.ok(ms.data.suggestions.length >= 1 && ms.data.remaining.protein >= 0 && ms.data.nextMeal, 'meal suggestions'); step('meal suggestions');
  const wk = await call('GET', '/ai/weekly-plan'); assert.strictEqual(wk.data.item.days.length, 7); assert.ok(wk.data.item.nutrition.protein > 50 && wk.data.item.coachNotes.length >= 1, 'weekly plan'); step('weekly plan');
  const ap1 = await call('POST', '/ai/weekly-plan/apply'); const ap2 = await call('POST', '/ai/weekly-plan/apply', { again: true });
  assert.strictEqual(ap2.data.plans, ap1.data.plans, 'applying the week twice creates no duplicate plans');
  const plansNow = (await call('GET', '/plans')).data.items; assert.ok(plansNow.filter((p) => (p.description || '').startsWith('Coach plan')).length === ap1.data.plans, 'week plans not duplicated'); step('apply weekly plan (idempotent)');
  const wa1 = await call('POST', '/tracking/water', { amountMl: 123 }); const wa2 = await call('POST', '/tracking/water', { amountMl: 123 });
  assert.strictEqual(wa2.data.item._id, wa1.data.item._id, 'double-submitted water log is replayed, not duplicated'); await call('DELETE', `/tracking/water/${wa1.data.item._id}`); step('idempotent writes');
  const wt1 = await call('POST', '/tracking/weight', { weight: 80.5 }); const wt2 = await call('POST', '/tracking/weight', { weight: 80.2 });
  assert.strictEqual(wt2.data.item._id, wt1.data.item._id, 'same-day weigh-in updates the existing entry'); await call('DELETE', `/tracking/weight/${wt1.data.item._id}`); step('one weigh-in per day');
  const genPlan = await call('POST', '/plans/generate', { focus: 'chest', minutes: 45, save: false });
  assert.ok(genPlan.data.item.exercises.filter((e) => e.type !== 'cardio').every((e) => e.weight > 0 || /body weight/i.test(e.notes || '')), 'generated plans carry starting weights'); step('starting loads on generated plan');
  await call('POST', '/auth/complete-profile', { gender: 'male', age: 28, height: 178, weight: 82, targetWeight: 75, fitnessGoal: 'fat_loss', experienceLevel: 'beginner', workoutDaysPerWeek: 4, dietaryPreference: 'indian' });

  // Library
  const eq = await call('GET', '/library/equipment'); assert.ok(eq.data.items.length >= 20, 'equipment seeded');
  const ex = await call('GET', '/library/exercises'); assert.ok(ex.data.items.length >= 40, 'exercises seeded');
  const treadmill = await call('GET', '/library/equipment/treadmill'); assert.ok(treadmill.data.exercises.length > 0); step(`library (${eq.data.items.length} equipment, ${ex.data.items.length} exercises)`);
  await call('POST', `/users/favorites/${ex.data.items[0]._id}`); step('favorites');

  // Plans
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const gen = await call('POST', '/plans/generate', { focus: 'chest', minutes: 45, save: true, scheduledDays: [today] });
  assert.ok(gen.data.item.exercises.length >= 3); step(`plan generated (${gen.data.item.exercises.length} exercises, source=${gen.data.item.generatedByAI ? 'gemini' : 'rules'})`);
  const templates = await call('GET', '/plans?templates=true'); assert.ok(templates.data.items.length >= 6);
  const dup = await call('POST', `/plans/${templates.data.items[0]._id}/duplicate`); step('templates + duplicate');
  const sched = await call('GET', '/plans/schedule'); assert.ok(sched.data.plans.length >= 2);
  await call('PUT', '/plans/schedule', { schedule: { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null, [today]: gen.data.item._id, [today === 'monday' ? 'thursday' : 'monday']: dup.data.item._id } }); step('schedule');
  const custom = await call('POST', '/plans', { name: 'Custom', exercises: [{ exerciseName: 'Treadmill Walk/Run', exercise: ex.data.items.find((e) => e.slug === 'treadmill-walk-run')._id, type: 'cardio', duration: 10 }, { exerciseName: 'Goblet Squat', exercise: ex.data.items.find((e) => e.slug === 'goblet-squat')._id, sets: 3, reps: 12, weight: 12 }] });
  step('custom plan');

  // Session journey
  const dash0 = await call('GET', '/users/dashboard'); assert.ok(dash0.data.today.plans.length >= 1, 'today plan on dashboard');
  const s = (await call('POST', '/sessions/start', { planId: custom.data.item._id })).data.item;
  assert.strictEqual(s.exercises.length, 2);
  const [cardio, strength] = s.exercises;
  await call('POST', `/sessions/${s._id}/exercises/${cardio._id}/cardio`, { durationSeconds: 600, distanceKm: 1 });
  const set1 = await call('POST', `/sessions/${s._id}/exercises/${strength._id}/sets`, { setNumber: 1, reps: 12, weight: 12 });
  assert.strictEqual(set1.data.restSeconds, 60);
  await call('POST', `/sessions/${s._id}/exercises/${strength._id}/sets`, { setNumber: 2, reps: 12, weight: 14 });
  await call('POST', `/sessions/${s._id}/exercises/${strength._id}/sets`, { setNumber: 3, reps: 10, weight: 14 });
  await call('POST', `/sessions/${s._id}/exercises/${strength._id}/complete`, {});
  await call('POST', `/sessions/${s._id}/exercises`, { exerciseName: 'Plank' });
  await call('PATCH', `/sessions/${s._id}/status`, { status: 'paused' });
  await call('PATCH', `/sessions/${s._id}/status`, { status: 'active' });
  const fin = await call('POST', `/sessions/${s._id}/finish`, { rating: 5, durationSeconds: 1500 });
  assert.strictEqual(fin.data.item.status, 'completed');
  assert.ok(fin.data.item.totalCalories > 0, 'calories computed');
  assert.ok(fin.data.item.totalVolume === 12 * 12 + 12 * 14 + 10 * 14, `volume ${fin.data.item.totalVolume}`);
  assert.ok(fin.data.item.aiSummary.length > 20);
  assert.ok(fin.data.newAchievements.some((a) => a.key === 'first_workout'), 'first workout achievement');
  step(`session finished (${fin.data.item.totalCalories} kcal, ${fin.data.item.totalVolume} kg, +${fin.data.newAchievements.length} achievements)`);
  const shared = await call('GET', `/sessions/shared/${fin.data.item.shareCode}`, null, { token: '' }); assert.strictEqual(shared.data.item.user.fullName, 'Test User'); step('public share link');
  const s2 = await call('POST', '/sessions/start', {});
  const exList = await call('GET', '/library/exercises?search=curl');
  const s2b = await call('POST', `/sessions/${s2.data.item._id}/exercises`, { exerciseId: exList.data.items[0]._id });
  const exId2 = s2b.data.item.exercises[s2b.data.item.exercises.length - 1]._id; // start may preload the scheduled plan
  await call('POST', `/sessions/${s2.data.item._id}/exercises/${exId2}/sets`, { setNumber: 1, reps: 10, weight: 10 });
  const undone = await call('DELETE', `/sessions/${s2.data.item._id}/exercises/${exId2}/sets/last`);
  assert.strictEqual(undone.data.exercise.sets.length, 0, 'undo removes the last set');
  const removedEx = await call('DELETE', `/sessions/${s2.data.item._id}/exercises/${exId2}`);
  assert.strictEqual(removedEx.data.item.exercises.length, s2b.data.item.exercises.length - 1, 'exercise removed from session');
  const edited = await call('PATCH', `/sessions/${fin.data.item._id}`, { rating: 4, notes: 'Felt strong' });
  assert.strictEqual(edited.data.item.rating, 4);
  await call('DELETE', `/sessions/${s2.data.item._id}`);
  assert.strictEqual((await call('GET', '/sessions/active')).data.item, null, 'discarded session is gone'); step('session edit / undo set / remove exercise / delete');
  assert.strictEqual((await call('GET', '/sessions/active')).data.item, null);
  const hist = await call('GET', '/sessions/history?search=squat'); assert.strictEqual(hist.data.total, 1); step('history search');

  // Tracking
  await call('POST', '/tracking/logs', { exerciseName: 'Farmer walk', sets: 3, reps: 1, weight: 30, source: 'manual' });
  await call('POST', '/tracking/logs/sync', { logs: [{ exerciseName: 'Treadmill', type: 'cardio', durationSeconds: 900, source: 'offline', performedAt: new Date().toISOString() }] });
  const logs = await call('GET', '/tracking/logs'); assert.ok(logs.data.total >= 4); step(`workout logs (${logs.data.total})`);
  const w1 = await call('POST', '/tracking/weight', { weight: 81.4 }); assert.strictEqual(w1.data.currentWeight, 81.4);
  await call('POST', '/tracking/weight', { weight: 80.9, date: new Date().toISOString(), measurements: { waist: 90 }, photoLabel: 'before', photoUrl: 'data:image/png;base64,iVBORw0KGgo=' });
  const wh = await call('GET', '/tracking/weight?range=daily'); assert.ok(wh.data.series.length >= 1 && wh.data.photos.length === 1); step('weight + photos');
  const water = await call('POST', '/tracking/water', { amountMl: 500 }); assert.strictEqual(water.data.totalMl, 500);
  await call('POST', '/tracking/meals', { type: 'lunch', name: 'Dal rice', calories: 600, protein: 25, carbs: 90, fat: 12 });
  const meals = await call('GET', '/tracking/meals'); assert.strictEqual(meals.data.totals.calories, 600); assert.ok(meals.data.remaining.calories > 0); step('water + meals');
  const diet = await call('POST', '/tracking/diet/generate', { planType: 'indian' }); assert.ok(diet.data.item.meals.length >= 4);
  const diets = await call('GET', '/tracking/diet'); assert.ok(diets.data.templates.length >= 5 && diets.data.active);
  await call('POST', `/tracking/diet/${diets.data.templates[0]._id}/activate`); step('diet plans');

  // AI + analytics + notifications
  const recs = await call('GET', '/ai/recommendations'); assert.ok(recs.data.daily.headline && recs.data.weekly.recommendations.length); step(`ai recommendations (source=${recs.data.daily.source})`);
  const chat = await call('POST', '/ai/chat', { message: 'What should I eat?' }); assert.ok(chat.data.reply.content.length > 10);
  assert.strictEqual((await call('GET', '/ai/chat')).data.items.length, 2); step('ai chat');
  await call('POST', '/ai/chat', { message: 'How much water should I drink?', conversationId: 'conv-b' });
  assert.strictEqual((await call('GET', '/ai/chat?conversation=conv-b')).data.items.length, 2, 'conversation filter');
  assert.ok((await call('GET', '/ai/chat/conversations')).data.items.length >= 2, 'conversation list');
  await call('DELETE', '/ai/chat?conversation=conv-b');
  assert.strictEqual((await call('GET', '/ai/chat?conversation=conv-b')).data.items.length, 0); step('chat conversations');
  const ov = await call('GET', '/analytics/overview');
  assert.strictEqual(ov.data.daily.workouts, 1); assert.ok(ov.data.weekly.consistencyScore > 0); assert.ok(ov.data.equipment.mostUsed.length >= 1); step('analytics overview');
  await call('POST', '/analytics/reports', { period: 'weekly' });
  const ach = await call('GET', '/analytics/achievements'); assert.ok(ach.data.earnedCount >= 1); step('achievements');
  const notif = await call('GET', '/analytics/notifications'); assert.ok(Array.isArray(notif.data.items)); step('notifications');
  const dash = await call('GET', '/users/dashboard'); assert.strictEqual(dash.data.today.streak, 1); assert.strictEqual(dash.data.today.workouts, 1); step('dashboard');
  await call('PATCH', '/users/profile', { targetWeight: 74, preferences: { restTimerDefault: 90 } }); step('profile update');

  // Admin
  assert.strictEqual((await call('GET', '/admin/stats', null, { allowFail: true })).status, 403);
  const admin = await call('POST', '/auth/login', { email: process.env.ADMIN_EMAIL || 'admin@ironpilot.app', password: process.env.ADMIN_PASSWORD || 'Admin@12345' });
  const at = admin.data.token;
  const stats = await call('GET', '/admin/stats', null, { token: at }); assert.strictEqual(stats.data.data.users, 2);
  const users = await call('GET', '/admin/users', null, { token: at }); assert.strictEqual(users.data.total, 2);
  await call('POST', '/admin/notifications', { title: 'Hello', message: 'Broadcast' }, { token: at });
  assert.ok((await call('GET', '/analytics/notifications')).data.items.some((n) => n.title === 'Hello'));
  const newEq = await call('POST', '/library/equipment', { name: 'Battle Ropes', category: 'other', description: 'Heavy ropes for conditioning.', targetMuscles: ['shoulders', 'core'] }, { token: at });
  await call('PATCH', `/library/equipment/${newEq.data.item._id}`, { difficulty: 'intermediate' }, { token: at });
  await call('POST', '/library/exercises', { name: 'Rope Slams', primaryMuscle: 'shoulders', equipment: newEq.data.item._id, instructions: ['Slam'] }, { token: at });
  await call('POST', '/admin/diet-templates', { name: 'Keto Starter', planType: 'keto', dailyCalories: 1800, proteinTarget: 130, carbTarget: 30, fatTarget: 130 }, { token: at });
  step('admin: stats, users, notifications, equipment/exercise/diet CRUD');

  console.log('\nALL SMOKE TESTS PASSED');
} catch (e) {
  console.error('\nSMOKE TEST FAILED:', e.message);
  process.exitCode = 1;
} finally {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
}
