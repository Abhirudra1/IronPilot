export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
export function daysAgo(n, from = new Date()) { const x = startOfDay(from); x.setDate(x.getDate() - n); return x; }
export function dateKey(d = new Date()) { return startOfDay(d).toISOString().slice(0, 10); }
export function dayName(d = new Date()) {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(d).getDay()];
}
export function diffDays(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }
