/**
 * Per-user daily budget for model calls (in-memory; resets at midnight UTC). Keeps a runaway client
 * or a chatty user from burning the API quota. Callers fall back to rule-based answers when exhausted.
 */
const DAILY_LIMIT = Number(process.env.AI_DAILY_CALLS_PER_USER || 80);
const usage = new Map(); // userId -> { day, calls }

const today = () => new Date().toISOString().slice(0, 10);

export function consumeAiBudget(userId) {
  if (!userId) return true;
  const key = String(userId);
  const row = usage.get(key);
  if (!row || row.day !== today()) { usage.set(key, { day: today(), calls: 1 }); return true; }
  if (row.calls >= DAILY_LIMIT) return false;
  row.calls += 1;
  return true;
}

export function aiBudgetRemaining(userId) {
  const row = usage.get(String(userId));
  return !row || row.day !== today() ? DAILY_LIMIT : Math.max(0, DAILY_LIMIT - row.calls);
}
