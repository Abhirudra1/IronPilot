import mongoose from 'mongoose';

const aiRecommendationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scope: { type: String, enum: ['daily', 'weekly', 'monthly', 'session_summary', 'chat', 'diet', 'workout_plan', 'weekly_plan'], required: true },
  dateKey: String,
  headline: String,
  recommendations: [String],
  content: mongoose.Schema.Types.Mixed,
  prompt: String,
  response: String,
  model: String,
  source: { type: String, enum: ['gemini', 'rules'], default: 'gemini' },
}, { timestamps: true });

aiRecommendationSchema.index({ user: 1, scope: 1, dateKey: 1 });

export const AIRecommendation = mongoose.model('AIRecommendation', aiRecommendationSchema);
