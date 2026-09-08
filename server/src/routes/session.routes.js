import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { idempotentWrites } from '../middleware/idempotency.js';
import * as c from '../controllers/session.controller.js';

const r = Router();
r.get('/shared/:code', asyncHandler(c.shared)); // public share link
r.use(protect, idempotentWrites);
r.post('/start', validate(c.startSchema), asyncHandler(c.start));
r.get('/active', asyncHandler(c.active));
r.get('/history', asyncHandler(c.history));
r.get('/:id', asyncHandler(c.get));
r.post('/:id/exercises', validate(c.addExerciseSchema), asyncHandler(c.addExercise));
r.post('/:id/exercises/:exerciseId/sets', validate(c.setSchema), asyncHandler(c.completeSet));
r.post('/:id/exercises/:exerciseId/cardio', validate(c.cardioSchema), asyncHandler(c.logCardio));
r.post('/:id/exercises/:exerciseId/complete', asyncHandler(c.completeExercise));
r.patch('/:id/status', asyncHandler(c.setStatus));
r.post('/:id/finish', validate(c.finishSchema), asyncHandler(c.finish));
r.patch('/:id', validate(c.updateSessionSchema), asyncHandler(c.update));
r.delete('/:id', asyncHandler(c.remove));
r.delete('/:id/exercises/:exerciseId/sets/last', asyncHandler(c.undoSet));
r.delete('/:id/exercises/:exerciseId', asyncHandler(c.removeExercise));
export default r;
