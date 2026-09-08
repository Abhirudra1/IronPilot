import { env } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

const DB_ERRORS = ['MongooseServerSelectionError', 'MongoServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoTopologyClosedError'];

 
export function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;
  let code = err.code && typeof err.code === 'string' ? err.code : undefined;

  if (err.type === 'entity.parse.failed') { status = 400; message = 'Request body is not valid JSON'; code = 'BAD_JSON'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request body is too large'; code = 'PAYLOAD_TOO_LARGE'; }
  else if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors || {}).map((e) => ({ path: e.path, message: e.message }));
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400; message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`; code = 'DUPLICATE';
  } else if (DB_ERRORS.includes(err.name)) {
    status = 503; message = 'Database is temporarily unavailable, please try again'; code = 'DB_UNAVAILABLE';
  } else if (err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    status = 504; message = 'Upstream request timed out'; code = 'UPSTREAM_TIMEOUT';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} rid=${req.id || '-'} user=${req.user?._id || '-'}:`, err);
    if (env.isProd && status === 500) { message = 'Internal server error'; details = undefined; }
  }
  if (res.headersSent) return;
  res.status(status).json({
    success: false,
    message,
    code,
    details,
    requestId: req.id,
    ...(env.isProd ? {} : { stack: status >= 500 ? err.stack : undefined }),
  });
}
