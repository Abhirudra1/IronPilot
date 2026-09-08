import mongoose from 'mongoose';

const weightHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weight: { type: Number, required: true, min: 20, max: 400 },
  bodyFat: Number,
  bmi: Number,
  measurements: { chest: Number, waist: Number, hips: Number, arms: Number, thighs: Number },
  photoUrl: String,
  photoLabel: { type: String, enum: ['before', 'progress', 'after'], default: 'progress' },
  notes: String,
  date: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

weightHistorySchema.index({ user: 1, date: -1 });

export const WeightHistory = mongoose.model('WeightHistory', weightHistorySchema);
