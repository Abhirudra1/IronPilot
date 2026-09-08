import mongoose from 'mongoose';

const workoutLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutSession' },
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  exerciseName: { type: String, required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  equipmentName: String,
  muscleGroup: String,
  type: { type: String, enum: ['strength', 'cardio', 'flexibility'], default: 'strength' },
  sets: Number,
  reps: Number,
  weight: Number,
  volume: Number,
  durationSeconds: Number,
  distanceKm: Number,
  speedKmh: Number,
  caloriesBurned: { type: Number, default: 0 },
  notes: String,
  performedAt: { type: Date, default: Date.now, index: true },
  source: { type: String, enum: ['session', 'manual', 'voice', 'offline'], default: 'session' },
}, { timestamps: true });

workoutLogSchema.index({ user: 1, performedAt: -1 });
workoutLogSchema.index({ exerciseName: 'text', equipmentName: 'text', notes: 'text' });

workoutLogSchema.index({ user: 1, exerciseName: 1, performedAt: -1 });
workoutLogSchema.index({ session: 1 });

export const WorkoutLog = mongoose.model('WorkoutLog', workoutLogSchema);
