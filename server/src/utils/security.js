/** Escape user input before it is used inside a MongoDB $regex (prevents ReDoS / pattern injection). */
export function escapeRegex(value) {
  return String(value ?? '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalise a free-text search query param: single string, trimmed, bounded. Arrays / objects (HPP) become ''. */
export function safeSearch(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 80);
}

const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/;
const HTTP_URL = /^https?:\/\/[^\s<>"']+$/i;

/** Only allow http(s) URLs or base64 image data URLs (never javascript:, data:text/html, etc.). */
export const isSafeImageUrl = (v) => v == null || v === '' || HTTP_URL.test(v) || IMAGE_DATA_URL.test(v);
export const isSafeHttpUrl = (v) => v == null || v === '' || HTTP_URL.test(v);
/** Relative app path for notification links: must start with a single '/' and contain no scheme/backslash. */
export const isSafeAppPath = (v) => v == null || v === '' || (/^\/(?![/\\])[^\s\\]*$/.test(v));
