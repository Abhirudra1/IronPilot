import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { FITNESS_GOALS, EXPERIENCE_LEVELS, DIETARY_PREFERENCES, ACTIVITY_LEVELS, GENDERS } from '../utils/constants.js';

const measurementSchema = new mongoose.Schema({
  chest: Number, waist: Number, hips: Number, arms: Number, thighs: Number, neck: Number, shoulders: Number,
}, { _id: false });

const earnedAchievementSchema = new mongoose.Schema({
  achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
  key: String,
  earnedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, minlength: 6, select: false, required: function () { return this.authProvider !== 'google'; } },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, index: true, sparse: true },
  profileComplete: { type: Boolean, default: true },
  passwordChangedAt: { type: Date, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatarUrl: String,

  gender: { type: String, enum: GENDERS, default: 'other' },
  age: { type: Number, min: 10, max: 100 },
  height: { type: Number, min: 80, max: 260 },
  weight: { type: Number, min: 20, max: 400 },
  currentWeight: { type: Number, min: 20, max: 400 },
  targetWeight: { type: Number, min: 20, max: 400 },
  measurements: measurementSchema,

  fitnessGoal: { type: String, enum: FITNESS_GOALS, default: 'general_fitness' },
  experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, default: 'beginner' },
  workoutDaysPerWeek: { type: Number, min: 1, max: 7, default: 3 },
  dietaryPreference: { type: String, enum: DIETARY_PREFERENCES, default: 'no_preference' },
  activityLevel: { type: String, enum: ACTIVITY_LEVELS, default: 'moderate' },
  medicalNotes: { type: String, maxlength: 2000 },

  waterGoalMl: { type: Number, default: 2500 },
  calorieTarget: Number,
  proteinTarget: Number,
  carbTarget: Number,
  fatTarget: Number,

  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    restTimerDefault: { type: Number, default: 60 },
    notifications: {
      workout: { type: Boolean, default: true },
      water: { type: Boolean, default: true },
      weight: { type: Boolean, default: true },
      meal: { type: Boolean, default: true },
    },
    reminderTimes: {
      workout: { type: String, default: '18:00' },
      water: { type: Number, default: 120 },
      weight: { type: String, default: '07:00' },
      meal: { type: String, default: '13:00' },
    },
  },

  favoriteExercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }],
  achievements: [earnedAchievementSchema],
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { current: { type: Number, default: 0 }, longest: { type: Number, default: 0 }, lastWorkoutDate: Date },
  totalWorkouts: { type: Number, default: 0 },
  totalWorkoutMinutes: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(); // tokens issued in an earlier second are rejected (see middleware/auth.js)
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
  return raw;
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.password; delete obj.passwordChangedAt; delete obj.resetPasswordToken; delete obj.resetPasswordExpires;
  return obj;
};

userSchema.index({ 'streak.lastWorkoutDate': 1 });

export const User = mongoose.model('User', userSchema);
