import mongoose from 'mongoose';
import { MUSCLE_GROUPS, EXPERIENCE_LEVELS, EXERCISE_TYPES } from '../utils/constants.js';

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: EXERCISE_TYPES, default: 'strength' },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  equipmentSlug: String,
  primaryMuscle: { type: String, enum: MUSCLE_GROUPS, required: true },
  secondaryMuscles: [{ type: String, enum: MUSCLE_GROUPS }],
  difficulty: { type: String, enum: EXPERIENCE_LEVELS, default: 'beginner' },
  instructions: [String],
  tips: [String],
  imageUrl: String,
  videoUrl: String,
  metActivity: { type: String, default: 'strength' },
  defaultSets: { type: Number, default: 3 },
  defaultReps: { type: Number, default: 10 },
  defaultDuration: Number,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

exerciseSchema.index({ name: 'text' });
exerciseSchema.index({ primaryMuscle: 1, type: 1 });

export const Exercise = mongoose.model('Exercise', exerciseSchema);
