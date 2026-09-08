import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/auth.controller.js';

// Brute-force protection: credential endpoints get a tight per-IP budget (successful requests are not counted).
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, please try again in 15 minutes' } });
const r = Router();
r.post('/register', limiter, validate(c.registerSchema), asyncHandler(c.register));
r.post('/login', strict, validate(c.loginSchema), asyncHandler(c.login));
r.post('/google', strict, validate(c.googleSchema), asyncHandler(c.googleLogin));
r.post('/complete-profile', protect, validate(c.completeProfileSchema), asyncHandler(c.completeProfile));
r.post('/forgot-password', strict, validate(c.forgotSchema), asyncHandler(c.forgotPassword));
r.post('/reset-password', strict, validate(c.resetSchema), asyncHandler(c.resetPassword));
r.get('/me', protect, asyncHandler(c.me));
r.post('/change-password', protect, strict, validate(c.changePasswordSchema), asyncHandler(c.changePassword));
export default r;
