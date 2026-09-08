import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { idempotentWrites } from '../middleware/idempotency.js';
import * as t from '../controllers/tracking.controller.js';
import * as n from '../controllers/nutrition.controller.js';

const r = Router();
r.use(protect, idempotentWrites);
// workout logs
r.get('/logs', asyncHandler(t.listLogs));
r.post('/logs', validate(t.logSchema), asyncHandler(t.createLog));
r.post('/logs/sync', validate(t.syncSchema), asyncHandler(t.syncLogs));
r.delete('/logs/:id', asyncHandler(t.deleteLog));
// weight
r.get('/weight', asyncHandler(t.weightHistory));
r.post('/weight', validate(t.weightSchema), asyncHandler(t.addWeight));
r.delete('/weight/:id', asyncHandler(t.deleteWeight));
// water
r.get('/water', asyncHandler(n.waterToday));
r.post('/water', validate(n.waterSchema), asyncHandler(n.addWater));
r.delete('/water/:id', asyncHandler(n.deleteWater));
// meals
r.get('/meals', asyncHandler(n.mealsForDay));
r.post('/meals', validate(n.mealSchema), asyncHandler(n.addMeal));
r.patch('/meals/:id', validate(n.mealSchema.partial()), asyncHandler(n.updateMeal));
r.delete('/meals/:id', asyncHandler(n.deleteMeal));
// diet plans
r.get('/diet', asyncHandler(n.listDiets));
r.post('/diet/generate', validate(n.dietGenerateSchema), asyncHandler(n.generateDiet));
r.post('/diet/:id/activate', asyncHandler(n.activateDiet));
export default r;
