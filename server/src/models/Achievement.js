import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  icon: { type: String, default: '🏅' },
  points: { type: Number, default: 50 },
  category: { type: String, enum: ['workout', 'streak', 'volume', 'nutrition', 'weight', 'special'], default: 'workout' },
  criteria: { metric: String, threshold: Number },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Achievement = mongoose.model('Achievement', achievementSchema);
