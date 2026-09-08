import mongoose from 'mongoose';

const setSchema = new mongoose.Schema({
  setNumber: Number,
  reps: Number,
  weight: Number,
  durationSeconds: Number,
  completed: { type: Boolean, default: false },
  completedAt: Date,
}, { _id: false });

const sessionExerciseSchema = new mongoose.Schema({
  planExerciseId: mongoose.Schema.Types.ObjectId,
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  exerciseName: { type: String, required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  equipmentName: String,
  muscleGroup: String,
  type: { type: String, enum: ['strength', 'cardio', 'flexibility'], default: 'strength' },
  targetSets: Number,
  targetReps: Number,
  targetWeight: Number,
  targetDuration: Number,
  restSeconds: { type: Number, default: 60 },
  sets: [setSchema],
  durationSeconds: Number,
  distanceKm: Number,
  speedKmh: Number,
  caloriesBurned: { type: Number, default: 0 },
  notes: String,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
  startedAt: Date,
  completedAt: Date,
  order: Number,
}, { _id: true });

const workoutSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan' },
  planName: String,
  focus: String,
  status: { type: String, enum: ['active', 'paused', 'completed', 'abandoned'], default: 'active', index: true },
  exercises: [sessionExerciseSchema],
  currentExerciseIndex: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  durationSeconds: { type: Number, default: 0 },
  totalCalories: { type: Number, default: 0 },
  totalVolume: { type: Number, default: 0 },
  muscleGroups: [String],
  aiSummary: String,
  rating: { type: Number, min: 1, max: 5 },
  notes: String,
  checkInMethod: { type: String, enum: ['manual', 'qr'], default: 'manual' },
  gymCode: String,
  shareCode: { type: String, index: true, sparse: true },
  offlineId: String,
}, { timestamps: true });

workoutSessionSchema.index({ user: 1, startedAt: -1 });

workoutSessionSchema.index({ user: 1, status: 1 });

export const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);
