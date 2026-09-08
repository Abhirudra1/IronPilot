/**
 * Only allow same-origin relative paths for client-side redirects.
 * Blocks protocol-relative (`//evil.com`), backslash tricks (`/\evil.com`) and absolute URLs.
 */
export const safePath = (p?: string | null, fallback = '/'): string => {
  if (!p || typeof p !== 'string') return fallback;
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('\\') || /^\/[^/]*:/.test(p)) return fallback;
  return p;
};
