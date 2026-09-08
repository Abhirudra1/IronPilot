// Food library: macros per 100 g (approximate, from USDA / IFCT tables) + household servings in grams.
// f(name, category, cuisine, dietTags, [kcal, protein, carbs, fat], servings, aliases)
const f = (name, category, cuisine, dietTags, [calories, protein, carbs, fat], servings, aliases = []) => ({
  name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), category, cuisine, dietTags,
  per100g: { calories, protein, carbs, fat }, servings, aliases,
});
const VEG = ['vegetarian', 'vegan'];
const VEGD = ['vegetarian'];
const EGG = ['eggetarian'];
const NV = ['non_veg'];

export const FOODS = [
  /* ---- grains & staples ---- */
  f('Roti / Chapati (whole wheat)', 'grains', 'indian', VEG, [297, 9.6, 58, 4.2], [{ label: 'roti', grams: 40 }], ['chapati', 'phulka']),
  f('Paratha (plain)', 'grains', 'indian', VEGD, [326, 6.4, 45, 13], [{ label: 'paratha', grams: 80 }]),
  f('Rice, white (cooked)', 'grains', 'general', VEG, [130, 2.7, 28, 0.3], [{ label: 'cup', grams: 160 }, { label: 'katori', grams: 120 }], ['steamed rice', 'chawal']),
  f('Rice, brown (cooked)', 'grains', 'general', VEG, [123, 2.7, 26, 1], [{ label: 'cup', grams: 160 }]),
  f('Oats (dry)', 'grains', 'general', VEG, [389, 16.9, 66, 6.9], [{ label: 'cup', grams: 80 }, { label: 'tbsp', grams: 10 }], ['oatmeal', 'rolled oats']),
  f('Poha (cooked)', 'grains', 'indian', VEG, [158, 2.6, 30, 3.2], [{ label: 'plate', grams: 200 }, { label: 'katori', grams: 120 }], ['flattened rice']),
  f('Upma', 'grains', 'indian', VEG, [155, 3.5, 24, 5], [{ label: 'plate', grams: 200 }, { label: 'katori', grams: 120 }]),
  f('Idli', 'grains', 'indian', VEG, [132, 3.6, 27, 0.4], [{ label: 'idli', grams: 45 }]),
  f('Dosa (plain)', 'grains', 'indian', VEG, [168, 3.9, 27, 4.8], [{ label: 'dosa', grams: 110 }]),
  f('Bread, whole wheat', 'grains', 'general', VEG, [247, 13, 41, 3.4], [{ label: 'slice', grams: 30 }], ['brown bread']),
  f('Bread, white', 'grains', 'general', VEG, [265, 9, 49, 3.2], [{ label: 'slice', grams: 28 }]),
  f('Pasta (cooked)', 'grains', 'general', VEG, [157, 5.8, 31, 0.9], [{ label: 'cup', grams: 140 }]),
  f('Quinoa (cooked)', 'grains', 'general', VEG, [120, 4.4, 21, 1.9], [{ label: 'cup', grams: 185 }]),
  f('Potato (boiled)', 'vegetable', 'general', VEG, [87, 1.9, 20, 0.1], [{ label: 'medium potato', grams: 150 }], ['aloo']),
  f('Sweet potato (boiled)', 'vegetable', 'general', VEG, [86, 1.6, 20, 0.1], [{ label: 'medium', grams: 150 }]),
  f('Khichdi', 'meal', 'indian', VEG, [120, 4.5, 20, 2.5], [{ label: 'bowl', grams: 250 }]),
  f('Vegetable Biryani', 'meal', 'indian', VEGD, [165, 3.8, 26, 5.2], [{ label: 'plate', grams: 300 }]),
  f('Chicken Biryani', 'meal', 'indian', NV, [180, 10, 22, 6], [{ label: 'plate', grams: 300 }]),

  /* ---- legumes ---- */
  f('Dal (cooked lentils)', 'legume', 'indian', VEG, [105, 6.5, 16, 2], [{ label: 'katori', grams: 150 }, { label: 'bowl', grams: 250 }], ['toor dal', 'moong dal', 'masoor dal', 'lentil soup']),
  f('Rajma (kidney bean curry)', 'legume', 'indian', VEG, [127, 6.5, 17, 3.5], [{ label: 'katori', grams: 150 }]),
  f('Chole (chickpea curry)', 'legume', 'indian', VEG, [150, 7, 19, 5], [{ label: 'katori', grams: 150 }], ['chana masala']),
  f('Chickpeas (boiled)', 'legume', 'general', VEG, [164, 8.9, 27, 2.6], [{ label: 'cup', grams: 165 }], ['chana', 'garbanzo']),
  f('Sambar', 'legume', 'indian', VEG, [60, 3, 8, 1.5], [{ label: 'katori', grams: 150 }]),
  f('Soya chunks (cooked)', 'protein', 'indian', VEG, [140, 20, 12, 1], [{ label: 'katori', grams: 100 }], ['soy nuggets']),
  f('Tofu', 'protein', 'general', VEG, [76, 8, 1.9, 4.8], [{ label: '100 g', grams: 100 }]),

  /* ---- protein ---- */
  f('Chicken breast (cooked)', 'protein', 'general', NV, [165, 31, 0, 3.6], [{ label: '100 g', grams: 100 }, { label: 'medium breast', grams: 150 }], ['grilled chicken']),
  f('Chicken thigh (cooked)', 'protein', 'general', NV, [209, 26, 0, 11], [{ label: 'thigh', grams: 90 }]),
  f('Chicken curry', 'meal', 'indian', NV, [150, 14, 4, 9], [{ label: 'katori', grams: 150 }]),
  f('Egg (whole, boiled)', 'protein', 'general', EGG, [155, 13, 1.1, 11], [{ label: 'egg', grams: 50 }], ['boiled egg', 'anda']),
  f('Egg white', 'protein', 'general', EGG, [52, 11, 0.7, 0.2], [{ label: 'egg white', grams: 33 }]),
  f('Omelette (2 eggs)', 'protein', 'general', EGG, [154, 11, 1.5, 12], [{ label: 'omelette', grams: 120 }]),
  f('Fish, salmon (cooked)', 'protein', 'general', NV, [206, 22, 0, 12], [{ label: 'fillet', grams: 150 }]),
  f('Fish, rohu / white fish (cooked)', 'protein', 'indian', NV, [110, 20, 0, 3], [{ label: 'piece', grams: 100 }], ['fish curry']),
  f('Tuna (canned in water)', 'protein', 'general', NV, [116, 26, 0, 1], [{ label: 'can', grams: 140 }]),
  f('Prawns (cooked)', 'protein', 'general', NV, [99, 24, 0.2, 0.3], [{ label: '100 g', grams: 100 }], ['shrimp']),
  f('Mutton (cooked)', 'protein', 'indian', NV, [258, 25, 0, 17], [{ label: '100 g', grams: 100 }], ['lamb', 'goat']),
  f('Beef, lean (cooked)', 'protein', 'general', NV, [250, 26, 0, 15], [{ label: '100 g', grams: 100 }]),
  f('Paneer', 'dairy', 'indian', VEGD, [265, 18, 1.2, 21], [{ label: '100 g', grams: 100 }, { label: 'cube', grams: 20 }], ['cottage cheese']),
  f('Paneer bhurji / curry', 'meal', 'indian', VEGD, [190, 11, 6, 14], [{ label: 'katori', grams: 150 }]),
  f('Whey protein (1 scoop)', 'supplement', 'general', VEGD, [400, 80, 8, 6], [{ label: 'scoop', grams: 30 }], ['protein shake', 'protein powder']),
  f('Peanut butter', 'fat_oil', 'general', VEG, [588, 25, 20, 50], [{ label: 'tbsp', grams: 16 }]),
  f('Almonds', 'snack', 'general', VEG, [579, 21, 22, 50], [{ label: 'almond', grams: 1.2 }, { label: 'handful', grams: 28 }], ['badam']),
  f('Walnuts', 'snack', 'general', VEG, [654, 15, 14, 65], [{ label: 'walnut half', grams: 4 }, { label: 'handful', grams: 28 }]),
  f('Peanuts (roasted)', 'snack', 'general', VEG, [567, 26, 16, 49], [{ label: 'handful', grams: 28 }], ['moongfali', 'groundnut']),

  /* ---- dairy ---- */
  f('Milk, whole', 'dairy', 'general', VEGD, [61, 3.2, 4.8, 3.3], [{ label: 'glass', grams: 250 }, { label: 'cup', grams: 240 }], ['doodh']),
  f('Milk, skimmed', 'dairy', 'general', VEGD, [34, 3.4, 5, 0.1], [{ label: 'glass', grams: 250 }], ['toned milk']),
  f('Curd / Yogurt (plain)', 'dairy', 'indian', VEGD, [60, 3.5, 4.7, 3.3], [{ label: 'katori', grams: 150 }, { label: 'cup', grams: 245 }], ['dahi', 'yoghurt']),
  f('Greek yogurt (plain)', 'dairy', 'general', VEGD, [59, 10, 3.6, 0.4], [{ label: 'cup', grams: 200 }]),
  f('Cheese, cheddar', 'dairy', 'general', VEGD, [403, 25, 1.3, 33], [{ label: 'slice', grams: 20 }]),
  f('Butter', 'fat_oil', 'general', VEGD, [717, 0.9, 0.1, 81], [{ label: 'tsp', grams: 5 }, { label: 'tbsp', grams: 14 }]),
  f('Ghee', 'fat_oil', 'indian', VEGD, [900, 0, 0, 100], [{ label: 'tsp', grams: 5 }, { label: 'tbsp', grams: 13 }]),
  f('Olive oil', 'fat_oil', 'general', VEG, [884, 0, 0, 100], [{ label: 'tsp', grams: 4.5 }, { label: 'tbsp', grams: 13.5 }]),

  /* ---- fruit ---- */
  f('Banana', 'fruit', 'general', VEG, [89, 1.1, 23, 0.3], [{ label: 'medium banana', grams: 118 }], ['kela']),
  f('Apple', 'fruit', 'general', VEG, [52, 0.3, 14, 0.2], [{ label: 'medium apple', grams: 180 }]),
  f('Orange', 'fruit', 'general', VEG, [47, 0.9, 12, 0.1], [{ label: 'orange', grams: 130 }]),
  f('Mango', 'fruit', 'general', VEG, [60, 0.8, 15, 0.4], [{ label: 'cup sliced', grams: 165 }, { label: 'medium mango', grams: 200 }]),
  f('Papaya', 'fruit', 'general', VEG, [43, 0.5, 11, 0.3], [{ label: 'cup', grams: 145 }]),
  f('Grapes', 'fruit', 'general', VEG, [69, 0.7, 18, 0.2], [{ label: 'cup', grams: 150 }]),
  f('Watermelon', 'fruit', 'general', VEG, [30, 0.6, 7.6, 0.2], [{ label: 'cup', grams: 150 }]),
  f('Berries (mixed)', 'fruit', 'general', VEG, [50, 0.7, 12, 0.3], [{ label: 'cup', grams: 150 }], ['strawberries', 'blueberries']),
  f('Dates', 'fruit', 'general', VEG, [277, 1.8, 75, 0.2], [{ label: 'date', grams: 8 }], ['khajoor']),
  f('Avocado', 'fruit', 'general', VEG, [160, 2, 8.5, 15], [{ label: 'half avocado', grams: 70 }]),

  /* ---- vegetables ---- */
  f('Mixed vegetable sabzi', 'vegetable', 'indian', VEG, [90, 2.5, 9, 5], [{ label: 'katori', grams: 150 }], ['sabji', 'vegetable curry']),
  f('Palak paneer', 'meal', 'indian', VEGD, [150, 8, 6, 11], [{ label: 'katori', grams: 150 }]),
  f('Salad (mixed greens)', 'vegetable', 'general', VEG, [20, 1.5, 3.5, 0.2], [{ label: 'bowl', grams: 150 }]),
  f('Broccoli (steamed)', 'vegetable', 'general', VEG, [35, 2.4, 7, 0.4], [{ label: 'cup', grams: 90 }]),
  f('Spinach (cooked)', 'vegetable', 'general', VEG, [23, 3, 3.8, 0.3], [{ label: 'cup', grams: 180 }], ['palak']),
  f('Cucumber', 'vegetable', 'general', VEG, [15, 0.7, 3.6, 0.1], [{ label: 'medium', grams: 200 }]),
  f('Carrot', 'vegetable', 'general', VEG, [41, 0.9, 10, 0.2], [{ label: 'medium', grams: 60 }]),

  /* ---- snacks & beverages ---- */
  f('Samosa', 'snack', 'indian', VEG, [262, 4, 24, 17], [{ label: 'samosa', grams: 100 }]),
  f('Protein bar', 'snack', 'general', VEGD, [380, 30, 40, 12], [{ label: 'bar', grams: 60 }]),
  f('Dark chocolate', 'snack', 'general', VEG, [546, 4.9, 61, 31], [{ label: 'square', grams: 10 }]),
  f('Biscuits (Marie)', 'snack', 'indian', VEGD, [440, 7, 76, 12], [{ label: 'biscuit', grams: 7 }]),
  f('Chai (tea with milk & sugar)', 'beverage', 'indian', VEGD, [40, 1.2, 6, 1.2], [{ label: 'cup', grams: 150 }], ['tea']),
  f('Coffee, black', 'beverage', 'general', VEG, [2, 0.3, 0, 0], [{ label: 'cup', grams: 240 }]),
  f('Coffee with milk (latte)', 'beverage', 'general', VEGD, [45, 2.5, 4, 2], [{ label: 'cup', grams: 240 }]),
  f('Coconut water', 'beverage', 'general', VEG, [19, 0.7, 3.7, 0.2], [{ label: 'glass', grams: 250 }]),
  f('Fruit juice (orange)', 'beverage', 'general', VEG, [45, 0.7, 10, 0.2], [{ label: 'glass', grams: 250 }]),
  f('Buttermilk (chaas)', 'beverage', 'indian', VEGD, [25, 1.5, 2.5, 0.8], [{ label: 'glass', grams: 250 }], ['chaas', 'lassi']),
  f('Sugar', 'snack', 'general', VEG, [387, 0, 100, 0], [{ label: 'tsp', grams: 4 }]),
  f('Honey', 'snack', 'general', VEGD, [304, 0.3, 82, 0], [{ label: 'tsp', grams: 7 }, { label: 'tbsp', grams: 21 }]),
];
