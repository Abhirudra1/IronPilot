import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../utils/ApiError.js';
import { macroTargets } from '../utils/fitness.js';
import { FITNESS_GOALS, EXPERIENCE_LEVELS, DIETARY_PREFERENCES, GENDERS, ACTIVITY_LEVELS } from '../utils/constants.js';
import { env } from '../config/env.js';
import { passwordResetEmail, welcomeEmail, mailEnabled } from '../services/mail.js';

const profileFields = {
  gender: z.enum(GENDERS),
  age: z.coerce.number().min(10).max(100),
  height: z.coerce.number().min(80).max(260),
  weight: z.coerce.number().min(20).max(400),
  targetWeight: z.coerce.number().min(20).max(400).optional(),
  fitnessGoal: z.enum(FITNESS_GOALS),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  workoutDaysPerWeek: z.coerce.number().min(1).max(7),
  dietaryPreference: z.enum(DIETARY_PREFERENCES),
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
};
export const registerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  ...profileFields,
});
export const completeProfileSchema = z.object({ fullName: z.string().min(2).max(80).optional(), ...profileFields });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1), remember: z.boolean().optional() });
export const googleSchema = z.object({ credential: z.string().min(20), remember: z.boolean().optional() });
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8).max(128) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).optional(), newPassword: z.string().min(8).max(128) });

const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12);

function applyTargets(user) {
  const t = macroTargets(user);
  user.calorieTarget = t.calories; user.proteinTarget = t.protein; user.carbTarget = t.carbs; user.fatTarget = t.fat; user.waterGoalMl = t.water;
}

const respond = (res, user, remember, status = 200) => res.status(status).json({ success: true, token: signToken(user, remember), user: user.toSafeJSON() });

export async function register(req, res) {
  const data = req.body;
  if (await User.exists({ email: data.email })) throw badRequest('Email already registered');
  const user = new User({ ...data, currentWeight: data.weight, targetWeight: data.targetWeight ?? data.weight, lastLoginAt: new Date(), authProvider: 'local', profileComplete: true });
  applyTargets(user);
  await user.save();
  welcomeEmail({ to: user.email, name: user.fullName }).catch((e) => console.warn('[mail] welcome failed:', e.message));
  respond(res, user, true, 201);
}

export async function login(req, res) {
  const { email, password, remember } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Always run a bcrypt compare so response time does not reveal whether the email exists / has a password.
  const ok = user?.password ? await user.comparePassword(password) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw unauthorized('Account is disabled');
  user.lastLoginAt = new Date();
  await user.save();
  respond(res, user, Boolean(remember));
}

/* ---------- Google Sign-In (ID token from Google Identity Services) ---------- */
let googleClient = null;
export async function googleLogin(req, res) {
  if (!env.googleClientId) throw badRequest('Google sign-in is not configured on the server (GOOGLE_CLIENT_ID)');
  googleClient ||= new OAuth2Client(env.googleClientId);
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch (e) {
    throw unauthorized(`Google token could not be verified: ${e.message}`);
  }
  if (!payload?.email || !payload.email_verified) throw unauthorized('Google account email is not verified');

  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });
  let created = false;
  if (!user) {
    user = new User({
      fullName: payload.name || payload.email.split('@')[0], email: payload.email, googleId: payload.sub, avatarUrl: payload.picture,
      authProvider: 'google', profileComplete: false, lastLoginAt: new Date(),
    });
    await user.save();
    created = true;
    welcomeEmail({ to: user.email, name: user.fullName }).catch(() => undefined);
  } else {
    if (!user.isActive) throw unauthorized('Account is disabled');
    if (!user.googleId) user.googleId = payload.sub;
    if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
    user.lastLoginAt = new Date();
    await user.save();
  }
  res.status(created ? 201 : 200).json({ success: true, token: signToken(user, Boolean(req.body.remember ?? true)), user: user.toSafeJSON(), created });
}

/** Second step for Google users: collect the essential body/goal details. */
export async function completeProfile(req, res) {
  const user = req.user;
  Object.assign(user, req.body, { currentWeight: req.body.weight, targetWeight: req.body.targetWeight ?? req.body.weight, profileComplete: true });
  applyTargets(user);
  await user.save();
  res.json({ success: true, user: user.toSafeJSON() });
}

export async function me(req, res) {
  res.json({ success: true, user: req.user.toSafeJSON() });
}

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email });
  // Always respond OK to avoid account enumeration
  const message = mailEnabled() ? 'If that email exists, a reset link has been emailed to you.' : 'If that email exists, a reset link has been generated.';
  if (!user) return res.json({ success: true, message });
  const raw = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${env.clientUrl}/reset-password/${raw}`;
  const { delivered } = await passwordResetEmail({ to: user.email, name: user.fullName, resetUrl }).catch((e) => { console.error('[mail] reset failed:', e.message); return { delivered: false }; });
  // Without an SMTP provider the link is logged server-side and (outside production) returned to the client.
  if (!delivered) console.log(`[auth] Password reset link for ${user.email}: ${resetUrl}`);
  res.json({ success: true, message, emailed: delivered, ...(!delivered && !env.isProd ? { resetUrl } : {}) });
}

export async function resetPassword(req, res) {
  const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpires: { $gt: new Date() } }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw badRequest('Reset link is invalid or has expired');
  user.password = req.body.password;
  user.resetPasswordToken = undefined; user.resetPasswordExpires = undefined;
  await user.save();
  respond(res, user, false);
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (user.password) {
    if (!req.body.currentPassword || !(await user.comparePassword(req.body.currentPassword))) throw badRequest('Current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save();
  // Older tokens are rejected from now on, so hand back a fresh one for this session.
  res.json({ success: true, message: 'Password updated', token: signToken(user, false) });
}
