import crypto from 'crypto';

/*
 * Guards against duplicate records from double taps / retries: an identical POST (same user, path and
 * body) arriving within a short window replays the first response instead of creating a second record.
 * In-memory, per process; the window is short on purpose (a user can still log two waters a minute apart).
 */
const WINDOW_MS = Number(process.env.IDEMPOTENCY_WINDOW_MS || 4000);
const seen = new Map(); // key -> { at, status, body, pending: Promise }

setInterval(() => { const now = Date.now(); for (const [k, v] of seen) if (now - v.at > WINDOW_MS * 5) seen.delete(k); }, 60_000).unref?.();

export function idempotentWrites(req, res, next) {
  if (req.method !== 'POST' || !req.user || req.path.startsWith('/auth')) return next();
  const hash = crypto.createHash('sha1').update(JSON.stringify(req.body || {})).digest('hex');
  const key = `${req.user._id}:${req.originalUrl}:${hash}`;
  const hit = seen.get(key);
  if (hit && Date.now() - hit.at < WINDOW_MS) {
    if (hit.status !== undefined) return res.status(hit.status).set('X-Idempotent-Replay', '1').json(hit.body);
    // first request still in flight: wait for it, then replay
    return hit.pending.then(() => res.status(hit.status).set('X-Idempotent-Replay', '1').json(hit.body)).catch(next);
  }
  let resolve;
  const entry = { at: Date.now(), status: undefined, body: undefined, pending: new Promise((r) => { resolve = r; }) };
  seen.set(key, entry);
  const json = res.json.bind(res);
  res.json = (body) => { entry.status = res.statusCode; entry.body = body; if (res.statusCode >= 400) seen.delete(key); resolve(); return json(body); };
  res.on('close', () => { if (entry.status === undefined) { seen.delete(key); resolve(); } });
  next();
}
