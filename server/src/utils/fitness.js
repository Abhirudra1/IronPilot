// MET values (Compendium of Physical Activities) for calorie estimation
const MET = {
  treadmill: 7.0, manual_treadmill: 8.0, cycling: 6.8, cross_trainer: 5.0, stair_climber: 8.8,
  rowing: 7.0, walking: 3.5, running: 9.8, strength: 5.0, bodyweight: 4.0, flexibility: 2.5, default: 5.0,
};

export function caloriesBurned({ activity = 'default', minutes = 0, weightKg = 70, intensity = 1 }) {
  const met = (MET[activity] ?? MET.default) * intensity;
  return Math.round((met * 3.5 * weightKg) / 200 * minutes);
}

export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiCategory(v) {
  if (v == null) return 'unknown';
  if (v < 18.5) return 'underweight';
  if (v < 25) return 'normal';
  if (v < 30) return 'overweight';
  return 'obese';
}

// Mifflin-St Jeor BMR
export function bmr({ gender, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

const ACTIVITY_MULTIPLIER = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
export function tdee(user) {
  const b = bmr({ gender: user.gender, weightKg: user.currentWeight || user.weight, heightCm: user.height, age: user.age });
  return Math.round(b * (ACTIVITY_MULTIPLIER[user.activityLevel] || 1.375));
}

// Goal-driven macro targets
export function macroTargets(user) {
  const maintenance = tdee(user);
  const goal = user.fitnessGoal;
  let calories = maintenance;
  if (['weight_loss', 'fat_loss'].includes(goal)) calories = maintenance - 500;
  else if (goal === 'muscle_gain') calories = maintenance + 300;
  else if (goal === 'strength_gain') calories = maintenance + 200;
  else if (goal === 'body_recomposition') calories = maintenance - 150;
  calories = Math.max(1200, Math.round(calories));
  const weight = user.currentWeight || user.weight || 70;
  const proteinPerKg = ['muscle_gain', 'strength_gain', 'body_recomposition'].includes(goal) ? 2.0 : 1.6;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.round(weight * 35); // ml/day
  return { calories, protein, carbs, fat, water, maintenance };
}
