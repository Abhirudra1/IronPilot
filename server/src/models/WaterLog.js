import mongoose from 'mongoose';

const waterLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amountMl: { type: Number, required: true, min: 1, max: 5000 },
  date: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

waterLogSchema.index({ user: 1, date: -1 });

export const WaterLog = mongoose.model('WaterLog', waterLogSchema);
