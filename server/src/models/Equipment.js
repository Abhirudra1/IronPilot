import mongoose from 'mongoose';
import { EQUIPMENT_CATEGORIES, MUSCLE_GROUPS, EXPERIENCE_LEVELS } from '../utils/constants.js';

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  category: { type: String, enum: EQUIPMENT_CATEGORIES, required: true },
  imageUrl: String,
  videoUrl: String,
  description: { type: String, required: true },
  purpose: String,
  targetMuscles: [{ type: String, enum: MUSCLE_GROUPS }],
  difficulty: { type: String, enum: EXPERIENCE_LEVELS, default: 'beginner' },
  howToUse: [String],
  beginnerTips: [String],
  safetyTips: [String],
  recommendedUsage: String,
  recommendedDuration: String,
  recommendedWeight: String,
  suggestedSpeed: String,
  metActivity: { type: String, default: 'strength' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

equipmentSchema.index({ name: 'text', description: 'text' });

export const Equipment = mongoose.model('Equipment', equipmentSchema);
