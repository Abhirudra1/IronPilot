/**
 * Strips MongoDB operator injection from user input: any key that starts with `$` or contains `.`
 * is removed from req.body / req.query / req.params (recursively). Zod validation still runs afterwards;
 * this is defence in depth for anything that reaches a query or a document without a schema.
 */
function clean(value, depth = 0) {
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    out[key] = clean(v, depth + 1);
  }
  return out;
}

export function sanitizeInput(req, _res, next) {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  // req.query is a getter in Express 4; mutate in place
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$') || key.includes('.')) delete req.query[key];
      else req.query[key] = clean(req.query[key]);
    }
  }
  next();
}
