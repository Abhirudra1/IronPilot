import mongoose from 'mongoose';
import { MEAL_TYPES } from '../utils/constants.js';

const mealSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: MEAL_TYPES, required: true },
  name: { type: String, required: true, trim: true },
  calories: { type: Number, default: 0, min: 0 },
  protein: { type: Number, default: 0, min: 0 },
  carbs: { type: Number, default: 0, min: 0 },
  fat: { type: Number, default: 0, min: 0 },
  quantity: String,
  notes: String,
  date: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

mealSchema.index({ user: 1, date: -1 });

export const Meal = mongoose.model('Meal', mealSchema);
