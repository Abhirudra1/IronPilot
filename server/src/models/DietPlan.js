import mongoose from 'mongoose';

const mealSuggestionSchema = new mongoose.Schema({
  type: String, name: String, description: String,
  calories: Number, protein: Number, carbs: Number, fat: Number, items: [String],
}, { _id: false });

const dietPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  planType: String,
  dailyCalories: Number,
  proteinTarget: Number,
  carbTarget: Number,
  fatTarget: Number,
  waterMl: Number,
  meals: [mealSuggestionSchema],
  tips: [String],
  rationale: String,
  isTemplate: { type: Boolean, default: false },
  generatedByAI: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const DietPlan = mongoose.model('DietPlan', dietPlanSchema);
