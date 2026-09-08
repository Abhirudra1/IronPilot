import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], required: true },
  from: Date,
  to: Date,
  data: mongoose.Schema.Types.Mixed,
  summary: String,
}, { timestamps: true });

export const Report = mongoose.model('Report', reportSchema);
