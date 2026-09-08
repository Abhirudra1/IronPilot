import mongoose from 'mongoose';
import { DAYS } from '../utils/constants.js';

export const planExerciseSchema = new mongoose.Schema({
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  exerciseName: { type: String, required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  equipmentName: String,
  muscleGroup: String,
  type: { type: String, enum: ['strength', 'cardio', 'flexibility'], default: 'strength' },
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  weight: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  restSeconds: { type: Number, default: 60 },
  notes: String,
  order: { type: Number, default: 0 },
}, { _id: true });

const workoutPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true, trim: true },
  description: String,
  focus: String,
  muscleGroups: [String],
  scheduledDays: [{ type: String, enum: DAYS }],
  exercises: [planExerciseSchema],
  estimatedMinutes: Number,
  isTemplate: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  generatedByAI: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

workoutPlanSchema.index({ user: 1, isActive: 1, updatedAt: -1 });
workoutPlanSchema.index({ isPublic: 1, isActive: 1 });
workoutPlanSchema.index({ user: 1, scheduledDays: 1 });

export const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
