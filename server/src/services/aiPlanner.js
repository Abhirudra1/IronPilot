import { generate, parseJson, geminiEnabled, COACH_SYSTEM } from './gemini.js';
import { buildUserContext, contextToText } from './userContext.js';
import { Exercise, ChatMessage, AIRecommendation } from '../models/index.js';
import { macroTargets } from '../utils/fitness.js';
import { env } from '../config/env.js';
import { exerciseHistory, historyText } from './loads.js';

/* ------------------------- Diet plan ------------------------- */
const DIET_TEMPLATES = {
  vegetarian: ['Oats with milk, banana & peanut butter', 'Paneer bhurji with 2 rotis & salad', 'Dal, brown rice, mixed vegetable sabzi', 'Greek yogurt with almonds'],
  vegan: ['Tofu scramble with whole-grain toast', 'Chickpea quinoa bowl with tahini', 'Lentil curry with brown rice & greens', 'Roasted chana & fruit'],
  indian: ['Poha with peanuts & sprouts', 'Chicken/paneer curry, 2 rotis, cucumber raita', 'Dal tadka, jeera rice, sauteed vegetables', 'Roasted makhana & a banana'],
  default: ['Egg omelette with whole-grain toast & fruit', 'Grilled chicken breast, rice & steamed broccoli', 'Baked fish, sweet potato & salad', 'Cottage cheese with berries'],
};

function rulesDietPlan(user, planType) {
  const t = macroTargets(user);
  const pref = user.dietaryPreference;
  const key = ['vegetarian', 'eggetarian'].includes(pref) ? 'vegetarian' : pref === 'vegan' ? 'vegan' : pref === 'indian' ? 'indian' : 'default';
  const items = DIET_TEMPLATES[key];
  const split = [0.25, 0.35, 0.3, 0.1];
  const types = ['breakfast', 'lunch', 'dinner', 'snack'];
  return {
    name: `${planType.replace(/_/g, ' ')} plan`, planType,
    dailyCalories: t.calories, proteinTarget: t.protein, carbTarget: t.carbs, fatTarget: t.fat, waterMl: t.water,
    meals: types.map((type, i) => ({
      type, name: items[i], description: items[i], items: [items[i]],
      calories: Math.round(t.calories * split[i]), protein: Math.round(t.protein * split[i]),
      carbs: Math.round(t.carbs * split[i]), fat: Math.round(t.fat * split[i]),
    })),
    tips: ['Eat protein with every meal.', 'Drink water before meals.', 'Prepare meals in advance to stay consistent.'],
    rationale: `Targets computed from your BMR/TDEE and your goal (${user.fitnessGoal.replace(/_/g, ' ')}).`,
  };
}

export async function generateDietPlan(user, { planType = user.fitnessGoal, notes = '' } = {}) {
  const t = macroTargets(user);
  if (!geminiEnabled()) return { ...rulesDietPlan(user, planType), generatedByAI: false };
  try {
    const ctx = await buildUserContext(user, { days: 14 });
    const prompt = `<user_data>
${contextToText(ctx)}
</user_data>
Create a personalised one-day meal plan of type "${planType}" (respect dietary preference "${user.dietaryPreference}"). ${notes ? `User notes: ${notes}.` : ''}
Calculated targets you should stay close to: ${JSON.stringify(t)}.
Return JSON: {"name": string, "planType": "${planType}", "dailyCalories": number, "proteinTarget": number, "carbTarget": number, "fatTarget": number, "waterMl": number,
"meals": [{"type": "breakfast"|"lunch"|"dinner"|"snack", "name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "items": string[]}] (4-5 meals),
"tips": string[] (3-5), "rationale": string (2 sentences)}`;
    const text = await generate({ userId: user._id, system: COACH_SYSTEM, messages: [{ role: 'user', text: prompt }], json: true, temperature: 0.6, maxOutputTokens: 2500 });
    const parsed = parseJson(text);
    if (parsed?.meals?.length) return { ...parsed, generatedByAI: true };
  } catch (e) { console.warn('[ai] diet failed:', e.message); }
  return { ...rulesDietPlan(user, planType), generatedByAI: false };
}

/* ------------------------- Workout plan ------------------------- */
const SPLIT = {
  chest: ['chest', 'triceps'], back: ['back', 'biceps'], legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  shoulders: ['shoulders', 'core'], full_body: ['chest', 'back', 'quads', 'shoulders', 'core'], cardio: ['cardio'], core: ['core', 'cardio'],
};

async function rulesWorkoutPlan(user, focus) {
  const muscles = SPLIT[focus] || [focus];
  const difficulty = user.experienceLevel === 'beginner' ? ['beginner'] : ['beginner', 'intermediate', 'advanced'];
  const exercises = await Exercise.find({ isActive: true, primaryMuscle: { $in: muscles }, difficulty: { $in: difficulty } }).populate('equipment').lean();
  const picked = [];
  for (const m of muscles) {
    const pool = exercises.filter((e) => e.primaryMuscle === m);
    picked.push(...pool.slice(0, focus === 'full_body' ? 1 : 2));
  }
  if (focus !== 'cardio') {
    const cardio = await Exercise.findOne({ isActive: true, slug: 'treadmill-walk-run' }).populate('equipment').lean();
    if (cardio) picked.unshift(cardio);
  }
  const beginner = user.experienceLevel === 'beginner';
  return {
    name: `${focus.replace(/_/g, ' ')} day`, focus: focus.replace(/_/g, ' '), muscleGroups: muscles,
    exercises: picked.map((e, i) => ({
      exercise: e._id, exerciseName: e.name, equipment: e.equipment?._id, equipmentName: e.equipment?.name,
      muscleGroup: e.primaryMuscle, type: e.type,
      sets: e.type === 'cardio' ? 1 : beginner ? 3 : 4, reps: e.type === 'cardio' ? 0 : e.defaultReps || 10, weight: 0,
      duration: e.type === 'cardio' ? (beginner ? 10 : 15) : 0, restSeconds: beginner ? 90 : 60, order: i,
    })),
    generatedByAI: false,
  };
}

export async function generateWorkoutPlan(user, { focus = 'full_body', minutes = 60 } = {}) {
  const base = await rulesWorkoutPlan(user, focus);
  if (!geminiEnabled()) return base;
  try {
    const library = await Exercise.find({ isActive: true }).select('name slug type primaryMuscle equipmentSlug difficulty').lean();
    const ctx = await buildUserContext(user, { days: 14 });
    const history = await exerciseHistory(user);
    const prompt = `<user_data>
${contextToText(ctx)}
Strength history (last 90 days):
${historyText(history)}
</user_data>
You are a strength coach with 10+ years of experience: pick exercises for this user's level and goal and set a concrete starting weight in kg for every strength exercise (per hand for dumbbells) from their history - progress 2.5-5% when they hit the top of the rep range, repeat the load otherwise, conservative body-weight-based estimates when there is no history. Cardio gets minutes.
Build a ${minutes}-minute "${focus}" workout for this user using ONLY exercises from this library (use exact slug): ${JSON.stringify(library.map((e) => ({ slug: e.slug, muscle: e.primaryMuscle, type: e.type, level: e.difficulty })))}.
Return JSON: {"name": string, "focus": string, "exercises": [{"slug": string, "sets": number, "reps": number, "weight": number (kg, 0 if unknown), "duration": number (minutes, cardio only else 0), "restSeconds": number, "notes": string}]} (5-8 exercises, cardio first).`;
    const text = await generate({ userId: user._id, system: COACH_SYSTEM, messages: [{ role: 'user', text: prompt }], json: true, temperature: 0.6, maxOutputTokens: 2000 });
    const parsed = parseJson(text);
    if (parsed?.exercises?.length) {
      const docs = await Exercise.find({ slug: { $in: parsed.exercises.map((e) => e.slug) } }).populate('equipment').lean();
      const bySlug = new Map(docs.map((e) => [e.slug, e]));
      const exercises = parsed.exercises.filter((e) => bySlug.has(e.slug)).map((e, i) => {
        const ex = bySlug.get(e.slug);
        return {
          exercise: ex._id, exerciseName: ex.name, equipment: ex.equipment?._id, equipmentName: ex.equipment?.name,
          muscleGroup: ex.primaryMuscle, type: ex.type,
          sets: e.sets || 3, reps: e.reps || 10, weight: e.weight || 0, duration: e.duration || 0,
          restSeconds: e.restSeconds || 60, notes: e.notes, order: i,
        };
      });
      if (exercises.length >= 3) {
        return { name: parsed.name || base.name, focus: parsed.focus || base.focus, muscleGroups: base.muscleGroups, exercises, generatedByAI: true };
      }
    }
  } catch (e) { console.warn('[ai] plan failed:', e.message); }
  return base;
}

/* ------------------------- Chat ------------------------- */
const chatCache = new Map(); // `${userId}:${normalised question}` -> { at, reply }
const CHAT_CACHE_TTL = 15 * 60 * 1000;
const normalise = (m) => m.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');

export async function chat(user, message, conversationId = 'default') {
  const earlier = chatCache.get(`${user._id}:${normalise(message)}`);
  if (earlier && Date.now() - earlier.at < CHAT_CACHE_TTL) {
    const prev = await ChatMessage.findOne({ user: user._id, conversationId, role: 'assistant', content: earlier.reply }).sort({ createdAt: -1 }).lean();
    if (prev) return prev;
  }
  await ChatMessage.create({ user: user._id, role: 'user', content: message, conversationId });
  // Same question asked again within 15 minutes: reuse the answer instead of spending another model call.
  const cacheKey = `${user._id}:${normalise(message)}`;
  const cached = chatCache.get(cacheKey);
  let reply = cached && Date.now() - cached.at < CHAT_CACHE_TTL ? cached.reply : undefined;
  const history = reply ? [] : await ChatMessage.find({ user: user._id, conversationId }).sort({ createdAt: -1 }).limit(8).lean();
  const ordered = history.reverse().map((m) => ({ ...m, content: m.content.slice(0, 600) }));
  if (!reply && geminiEnabled()) {
    try {
      const ctx = await buildUserContext(user, { days: 30 });
      const system = `${COACH_SYSTEM}\n\nAnswer using this user's live app data:\n<user_data>
${contextToText(ctx)}
</user_data>\nKeep answers under 150 words unless a plan is requested. Use short paragraphs or bullet lists.`;
      reply = await generate({ userId: user._id, system, messages: ordered.map((m) => ({ role: m.role, text: m.content })), temperature: 0.5, maxOutputTokens: 700 });
      if (reply) chatCache.set(cacheKey, { at: Date.now(), reply });
    } catch (e) { console.warn('[ai] chat failed:', e.message); }
  }
  if (!reply) {
    const t = macroTargets(user);
    reply = `The AI coach is not available right now, so here are your computed targets: ${t.calories} kcal/day, ${t.protein} g protein, ${t.carbs} g carbs, ${t.fat} g fat and ${t.water} ml water. Use the Planner and Nutrition pages for guided plans meanwhile.`;
  }
  const saved = await ChatMessage.create({ user: user._id, role: 'assistant', content: reply.trim(), conversationId });
  await AIRecommendation.create({ user: user._id, scope: 'chat', prompt: message, response: reply, source: geminiEnabled() ? 'gemini' : 'rules', model: env.geminiModel });
  return saved;
}
