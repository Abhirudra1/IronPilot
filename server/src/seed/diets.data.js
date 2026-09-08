const meal = (type, name, description, calories, protein, carbs, fat, items) => ({ type, name, description, calories, protein, carbs, fat, items });

export const DIET_TEMPLATES = [
  {
    name: 'Muscle Gain Diet', planType: 'muscle_gain', dailyCalories: 2800, proteinTarget: 170, carbTarget: 330, fatTarget: 85, waterMl: 3000,
    meals: [
      meal('breakfast', 'Oats, eggs & fruit', 'Slow carbs plus complete protein to start the day.', 650, 38, 80, 18, ['80 g oats with milk', '3 whole eggs', '1 banana']),
      meal('lunch', 'Chicken, rice & vegetables', 'Classic muscle-building plate.', 800, 55, 95, 18, ['200 g grilled chicken breast', '200 g cooked rice', 'Mixed vegetables with olive oil']),
      meal('snack', 'Greek yogurt & nuts', 'Protein and healthy fats between meals.', 400, 25, 30, 18, ['200 g Greek yogurt', '30 g almonds', '1 tbsp honey']),
      meal('dinner', 'Salmon, sweet potato & greens', 'Omega-3 rich recovery meal.', 750, 45, 70, 28, ['180 g salmon', '250 g sweet potato', 'Broccoli or spinach']),
      meal('snack', 'Casein or cottage cheese', 'Slow-digesting protein before bed.', 200, 25, 8, 6, ['200 g cottage cheese or 1 scoop casein']),
    ],
    tips: ['Eat every 3-4 hours.', 'Get 1.6-2.2 g protein per kg body weight.', 'Track progress weekly and add 100-150 kcal if weight stalls for two weeks.'],
    rationale: 'A ~300 kcal surplus with high protein maximises lean gains while limiting fat gain.', isTemplate: true,
  },
  {
    name: 'Weight Loss Diet', planType: 'weight_loss', dailyCalories: 1700, proteinTarget: 130, carbTarget: 160, fatTarget: 55, waterMl: 3000,
    meals: [
      meal('breakfast', 'Veggie omelette', 'High protein, low calorie start.', 350, 28, 15, 20, ['3 egg omelette with spinach, tomato & onion', '1 slice whole-grain toast']),
      meal('lunch', 'Grilled chicken salad', 'Lean protein with lots of fibre.', 500, 45, 30, 20, ['150 g grilled chicken', 'Large mixed salad', '1 tbsp olive oil & lemon dressing', '1/2 cup quinoa']),
      meal('snack', 'Fruit & protein shake', 'Keeps hunger away in the afternoon.', 250, 25, 30, 3, ['1 scoop whey in water', '1 apple']),
      meal('dinner', 'Fish with roasted vegetables', 'Light, filling and nutrient dense.', 500, 40, 45, 15, ['180 g white fish or tofu', 'Roasted vegetables', '150 g potato']),
      meal('snack', 'Greek yogurt', 'Protein before bed.', 100, 15, 6, 0, ['150 g 0% Greek yogurt']),
    ],
    tips: ['Fill half your plate with vegetables.', 'Drink 500 ml water before each meal.', 'Weigh yourself weekly, not daily fluctuations.'],
    rationale: 'A ~500 kcal deficit with high protein preserves muscle while losing roughly 0.5 kg per week.', isTemplate: true,
  },
  {
    name: 'Vegetarian Diet', planType: 'vegetarian', dailyCalories: 2200, proteinTarget: 120, carbTarget: 270, fatTarget: 70, waterMl: 2800,
    meals: [
      meal('breakfast', 'Paneer bhurji & toast', 'Protein-packed Indian breakfast.', 500, 30, 45, 22, ['100 g paneer bhurji', '2 slices whole-grain toast', '1 glass milk']),
      meal('lunch', 'Rajma chawal', 'Kidney beans and rice form a complete protein.', 650, 25, 100, 12, ['1 bowl rajma', '1 cup brown rice', 'Salad & curd']),
      meal('snack', 'Sprouts chaat', 'Fibre and protein.', 250, 15, 35, 4, ['1 cup mixed sprouts with onion, tomato, lemon']),
      meal('dinner', 'Tofu stir-fry with quinoa', 'Light but high protein.', 600, 35, 65, 20, ['150 g tofu', '1 cup quinoa', 'Stir-fried vegetables']),
      meal('snack', 'Peanut butter & banana', 'Healthy fats before bed.', 200, 8, 25, 9, ['1 banana', '1 tbsp peanut butter']),
    ],
    tips: ['Combine legumes with grains for complete protein.', 'Include dairy, soy or a plant protein powder to hit targets.', 'Add a vitamin B12 source.'],
    rationale: 'Balanced vegetarian plan with plenty of plant and dairy protein.', isTemplate: true,
  },
  {
    name: 'High Protein Diet', planType: 'high_protein', dailyCalories: 2300, proteinTarget: 190, carbTarget: 200, fatTarget: 70, waterMl: 3200,
    meals: [
      meal('breakfast', 'Egg white scramble & oats', 'Lean protein and slow carbs.', 500, 45, 50, 12, ['6 egg whites + 1 whole egg', '60 g oats']),
      meal('lunch', 'Turkey or chicken wrap', 'Portable protein.', 600, 50, 55, 18, ['200 g lean turkey/chicken', 'Whole-wheat wrap', 'Vegetables & hummus']),
      meal('snack', 'Protein shake', 'Quick top up.', 200, 30, 8, 3, ['1.5 scoop whey']),
      meal('dinner', 'Lean beef or paneer with rice', 'Recovery meal.', 700, 50, 65, 25, ['200 g lean beef or paneer', '150 g rice', 'Green beans']),
      meal('snack', 'Cottage cheese', 'Casein before bed.', 300, 30, 12, 12, ['250 g cottage cheese']),
    ],
    tips: ['Spread protein evenly across 4-5 meals.', 'Prioritise lean sources to keep calories controlled.'],
    rationale: 'High protein improves satiety, muscle retention and recovery.', isTemplate: true,
  },
  {
    name: 'Indian Diet Plan', planType: 'indian', dailyCalories: 2100, proteinTarget: 120, carbTarget: 260, fatTarget: 65, waterMl: 2800,
    meals: [
      meal('breakfast', 'Moong dal chilla', 'High-protein savoury pancakes.', 450, 25, 55, 12, ['3 moong dal chillas', 'Mint chutney', '1 glass buttermilk']),
      meal('lunch', 'Roti, dal, sabzi & curd', 'The balanced Indian thali.', 650, 30, 90, 15, ['2 rotis', '1 bowl dal', '1 bowl vegetable sabzi', '1 bowl curd']),
      meal('snack', 'Roasted chana & fruit', 'Crunchy protein snack.', 250, 12, 35, 5, ['1 cup roasted chana', '1 seasonal fruit']),
      meal('dinner', 'Grilled chicken/paneer tikka with salad', 'Light high-protein dinner.', 550, 45, 35, 22, ['200 g chicken or paneer tikka', 'Large salad', '1 roti']),
      meal('snack', 'Warm milk with turmeric', 'Aids recovery and sleep.', 150, 8, 12, 6, ['1 glass milk with turmeric']),
    ],
    tips: ['Use less oil; grill, roast or steam.', 'Choose whole grains like brown rice, jowar and bajra.', 'Keep sweets to weekends.'],
    rationale: 'Traditional Indian foods arranged for a balanced macro split.', isTemplate: true,
  },
];
