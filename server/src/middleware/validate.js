import { badRequest } from '../utils/ApiError.js';

// Zod-based body/query validation
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(badRequest('Validation failed', details));
  }
  req[source] = result.data;
  next();
};
