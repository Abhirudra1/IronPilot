import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/user.controller.js';

const r = Router();
r.use(protect);
r.get('/dashboard', asyncHandler(c.dashboard));
r.get('/targets', asyncHandler(c.targets));
r.patch('/profile', validate(c.profileSchema), asyncHandler(c.updateProfile));
r.post('/favorites/:exerciseId', asyncHandler(c.toggleFavorite));
r.delete('/account', asyncHandler(c.deleteAccount));
export default r;
