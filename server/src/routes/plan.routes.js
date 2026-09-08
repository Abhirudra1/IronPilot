import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { idempotentWrites } from '../middleware/idempotency.js';
import * as c from '../controllers/plan.controller.js';

const r = Router();
r.use(protect, idempotentWrites);
r.get('/', asyncHandler(c.list));
r.get('/schedule', asyncHandler(c.getSchedule));
r.put('/schedule', validate(c.scheduleSchema), asyncHandler(c.setSchedule));
r.post('/generate', validate(c.generateSchema), asyncHandler(c.generate));
r.get('/:id', asyncHandler(c.get));
r.post('/', validate(c.planSchema), asyncHandler(c.create));
r.patch('/:id', validate(c.planSchema.partial()), asyncHandler(c.update));
r.delete('/:id', asyncHandler(c.remove));
r.post('/:id/duplicate', asyncHandler(c.duplicate));
export default r;
