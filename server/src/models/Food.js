import mongoose from 'mongoose';

/**
 * Food library entry. Macros are stored per 100 g; `servings` lists household measures
 * (e.g. "1 roti" = 40 g) so the client can turn "2 × roti" into grams and macros.
 */
const foodSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  aliases: [String],
  category: { type: String, enum: ['grains', 'protein', 'dairy', 'fruit', 'vegetable', 'legume', 'snack', 'beverage', 'fat_oil', 'meal', 'supplement'], default: 'meal' },
  cuisine: { type: String, default: 'general' },
  dietTags: [{ type: String, enum: ['vegetarian', 'vegan', 'non_veg', 'eggetarian'] }],
  per100g: {
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fat: { type: Number, default: 0, min: 0 },
  },
  servings: [{ label: { type: String, required: true }, grams: { type: Number, required: true, min: 1 } }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

foodSchema.index({ name: 'text', aliases: 'text' });

export const Food = mongoose.model('Food', foodSchema);
