import axios from 'axios';

const TOKEN_KEY = 'fc_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (token: string, remember: boolean) => {
  try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token); (remember ? sessionStorage : localStorage).removeItem(TOKEN_KEY); } catch { /* ignore */ }
};
/** Replace the stored token in whichever storage currently holds it (used after password change). */
export const refreshToken = (token: string) => { let remembered = true; try { remembered = Boolean(localStorage.getItem(TOKEN_KEY)); } catch { /* ignore */ } setToken(token, remembered); };
export const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

export const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api`, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let serverDown = false;
/** True when the last request could not reach the API (network error / proxy 503). */
export const isServerDown = () => serverDown;
const setServerDown = (down: boolean) => { if (down !== serverDown) { serverDown = down; window.dispatchEvent(new CustomEvent(down ? 'fc:server-down' : 'fc:server-up')); } };
export const isUnreachable = (err: unknown) => {
  const e = err as { response?: { status?: number; data?: { code?: string } }; code?: string; message?: string };
  return !e.response || e.code === 'ERR_NETWORK' || e.response.data?.code === 'API_DOWN' || (e.response.status === 503 && !e.response.data);
};

api.interceptors.response.use(
  (res) => { setServerDown(false); return res; },
  (err) => {
    if (isUnreachable(err)) { setServerDown(true); return Promise.reject(err); }
    setServerDown(false);
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      clearToken();
      if (!location.pathname.startsWith('/login')) window.dispatchEvent(new CustomEvent('fc:logout'));
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e: unknown, fallback = 'Something went wrong') => {
  const err = e as { response?: { data?: { message?: string; details?: { path: string; message: string }[] } }; message?: string };
  const d = err.response?.data;
  if (d?.details?.length) return `${d.message}: ${d.details.map((x) => `${x.path} ${x.message}`).join(', ')}`;
  if (isUnreachable(e)) return navigator.onLine ? 'Cannot reach the server right now - please try again in a moment' : 'You appear to be offline';
  return d?.message || err.message || fallback;
};
