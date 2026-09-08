import { Meal, DietPlan, Food } from '../models/index.js';
import { generate, parseJson, geminiEnabled, COACH_SYSTEM } from './gemini.js';
import { startOfDay, endOfDay } from '../utils/dates.js';

const cache = new Map(); // key -> { at, result }
const TTL = 30 * 60 * 1000;
const r1 = (n) => Math.round(n * 10) / 10;

function allowedForDiet(pref, food) {
  const tags = food.dietTags || [];
  if (/vegan/.test(pref)) return tags.includes('vegan');
  if (/vegetarian|veg$/.test(pref) && !/non/.test(pref)) return !tags.includes('non_veg') && !tags.includes('eggetarian');
  if (/egg/.test(pref)) return !tags.includes('non_veg');
  return true;
}
const macrosFor = (food, grams) => { const k = grams / 100; return { calories: Math.round(food.per100g.calories * k), protein: r1(food.per100g.protein * k), carbs: r1(food.per100g.carbs * k), fat: r1(food.per100g.fat * k) }; };
const serving = (food) => food.servings?.[0] || { label: '100 g', grams: 100 };

/** Deterministic fallback built from the food library when Gemini is unavailable. */
function rulesSuggestions(user, remaining, nextMeal, foods) {
  const ok = foods.filter((f) => allowedForDiet(user.dietaryPreference || '', f));
  const indian = /indian/.test(user.dietaryPreference || '');
  const byCat = (cats) => ok.filter((f) => cats.includes(f.category)).sort((a, b) => (indian ? Number(b.cuisine === 'indian') - Number(a.cuisine === 'indian') : 0) || b.per100g.protein / Math.max(1, b.per100g.calories) - a.per100g.protein / Math.max(1, a.per100g.calories));
  const proteins = byCat(['protein', 'dairy', 'legume', 'supplement']);
  const grains = byCat(['grains']).sort((a, b) => a.per100g.fat - b.per100g.fat);
  const veg = byCat(['vegetable']);
  const fruit = byCat(['fruit']);
  const build = (name, description, parts) => {
    const items = []; const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const [food, n] of parts) { if (!food) continue; const s = serving(food); const m = macrosFor(food, s.grams * n); items.push(`${n} × ${s.label} ${food.name}`); for (const k of Object.keys(total)) total[k] = r1(total[k] + m[k]); }
    return { name, description, items, ...total, calories: Math.round(total.calories) };
  };
  const proteinNeed = remaining.protein;
  const p1 = proteins[0]; const p1n = p1 ? Math.max(1, Math.min(3, Math.round((proteinNeed * 0.5) / Math.max(5, macrosFor(p1, serving(p1).grams).protein)))) : 1;
  const out = [
    build('High-protein plate', `Covers about half of the ${Math.round(proteinNeed)} g protein you still need today.`, [[p1, p1n], [grains[0], remaining.carbs > 40 ? 1 : 0], [veg[0], 1]]),
    build('Balanced plate', `A steady ${nextMeal} with grain, protein and vegetables.`, [[grains[1] || grains[0], 1], [proteins[1] || proteins[0], 1], [veg[1] || veg[0], 1]]),
    build('Light option', remaining.calories < 400 ? 'You are close to your calorie target - keep it light.' : 'A quick snack-sized option.', [[fruit[0], 1], [proteins.find((f) => f.category === 'dairy') || proteins[2] || proteins[0], 1]]),
  ];
  return out.filter((s) => s.items.length);
}

/**
 * "What should I eat next?" - remaining macros for the day, next meal slot and up to three concrete
 * suggestions (Gemini when configured, otherwise built from the food library), personalised to the
 * user's goal, diet preference and active diet plan.
 */
export async function suggestMeals(user, date = new Date()) {
  const [meals, plan] = await Promise.all([
    Meal.find({ user: user._id, date: { $gte: startOfDay(date), $lte: endOfDay(date) } }).lean(),
    DietPlan.findOne({ user: user._id, isActive: true }).lean(),
  ]);
  const totals = meals.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const targets = { calories: user.calorieTarget || 2000, protein: user.proteinTarget || 120, carbs: user.carbTarget || 220, fat: user.fatTarget || 60 };
  const remaining = Object.fromEntries(Object.keys(targets).map((k) => [k, Math.max(0, r1(targets[k] - totals[k]))]));
  const hour = new Date().getHours();
  const logged = new Set(meals.map((m) => m.type));
  const nextMeal = hour < 10 && !logged.has('breakfast') ? 'breakfast' : hour < 15 && !logged.has('lunch') ? 'lunch' : hour < 18 && !logged.has('snack') ? 'snack' : !logged.has('dinner') ? 'dinner' : 'snack';
  const key = `${user._id}:${date.toISOString().slice(0, 10)}:${nextMeal}:${Math.round(totals.calories)}:${Math.round(totals.protein)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL && !(hit.result.source === 'rules' && geminiEnabled())) return hit.result;

  let suggestions = null; let source = 'rules'; let note = '';
  const planMeal = plan?.meals?.find((m) => m.type === nextMeal);
  if (geminiEnabled()) {
    try {
      const foods = await Food.find({ isActive: true }).select('name category cuisine dietTags').lean();
      const usable = foods.filter((f) => allowedForDiet(user.dietaryPreference || '', f)).map((f) => f.name).slice(0, 80);
      const prompt = `<user_data>
User: ${user.fullName}, goal ${user.fitnessGoal}, diet preference ${user.dietaryPreference}, ${user.age}y ${user.gender}, ${user.currentWeight || user.weight} kg.
Today so far: ${Math.round(totals.calories)} kcal, ${r1(totals.protein)} g protein, ${r1(totals.carbs)} g carbs, ${r1(totals.fat)} g fat (${meals.map((m) => `${m.type}: ${m.name}`).join('; ') || 'nothing logged'}).
Daily targets: ${targets.calories} kcal, ${targets.protein} g protein, ${targets.carbs} g carbs, ${targets.fat} g fat. Remaining: ${remaining.calories} kcal, ${remaining.protein} g protein, ${remaining.carbs} g carbs, ${remaining.fat} g fat.
</user_data>
Next meal slot: ${nextMeal}.${planMeal ? ` Their active diet plan (${plan.name}) suggests for ${nextMeal}: ${planMeal.name} (${planMeal.calories} kcal, ${planMeal.protein} g protein).` : ''}
Suggest exactly 3 realistic ${nextMeal} options that move them toward the remaining targets without exceeding remaining calories. Prefer foods like: ${usable.join(', ')}. Match their diet preference strictly.
Return JSON only: {"suggestions":[{"name":"","description":"one short sentence why","items":["2 roti","1 katori dal"],"calories":0,"protein":0,"carbs":0,"fat":0}],"note":"one short sentence about today's remaining targets"}`;
      const text = await generate({ userId: user._id, system: COACH_SYSTEM, messages: [{ role: 'user', text: prompt }], json: true, temperature: 0.4, maxOutputTokens: 1200 });
      const parsed = parseJson(text);
      if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length) {
        suggestions = parsed.suggestions.slice(0, 3).map((s) => ({ name: String(s.name || 'Option').slice(0, 80), description: String(s.description || '').slice(0, 200), items: (Array.isArray(s.items) ? s.items : []).map((i) => String(i).slice(0, 80)).slice(0, 8), calories: Math.max(0, Math.round(Number(s.calories) || 0)), protein: r1(Math.max(0, Number(s.protein) || 0)), carbs: r1(Math.max(0, Number(s.carbs) || 0)), fat: r1(Math.max(0, Number(s.fat) || 0)) }));
        note = String(parsed.note || '').slice(0, 200); source = 'gemini';
      }
    } catch (e) { console.warn('[ai] meal suggestions failed:', e.message?.slice(0, 160)); }
  }
  if (!suggestions) {
    const foods = await Food.find({ isActive: true }).lean();
    suggestions = rulesSuggestions(user, remaining, nextMeal, foods);
    note = remaining.protein > 0 ? `You still need ${Math.round(remaining.protein)} g protein and ${Math.round(remaining.calories)} kcal today.` : 'Protein target reached - keep the rest of the day light.';
  }
  const result = { nextMeal, totals, targets, remaining, suggestions, source, note, planName: plan?.name || null, planMeal: planMeal ? { name: planMeal.name, calories: planMeal.calories, protein: planMeal.protein, items: planMeal.items } : null };
  cache.set(key, { at: Date.now(), result });
  return result;
}
