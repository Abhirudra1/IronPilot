import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/analytics.controller.js';

const r = Router();
r.use(protect);
r.get('/overview', asyncHandler(c.overview));
r.get('/daily', asyncHandler(c.daily));
r.get('/weekly', asyncHandler(c.weekly));
r.get('/monthly', asyncHandler(c.monthly));
r.get('/equipment', asyncHandler(c.equipment));
r.get('/reports', asyncHandler(c.listReports));
r.post('/reports', asyncHandler(c.createReport));
r.get('/achievements', asyncHandler(c.achievements));
r.get('/notifications', asyncHandler(c.notifications));
r.patch('/notifications/:id/read', asyncHandler(c.markRead));
r.delete('/notifications/:id', asyncHandler(c.deleteNotification));
export default r;
