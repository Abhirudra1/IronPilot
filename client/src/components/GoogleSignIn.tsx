import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg, setToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleAccounts { accounts: { id: { initialize: (o: Record<string, unknown>) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } } }
declare global { interface Window { google?: GoogleAccounts } }

let scriptPromise: Promise<void> | null = null;
function loadGis() {
  if (window.google?.accounts) return Promise.resolve();
  scriptPromise ||= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * "Continue with Google" using Google Identity Services. The ID token is verified on the server;
 * new users are sent to onboarding to fill in the essential body/goal details.
 */
export default function GoogleSignIn({ label = 'continue_with' }: { label?: 'continue_with' | 'signin_with' | 'signup_with' }) {
  const ref = useRef<HTMLDivElement>(null);
  const { setUser } = useAuth();
  const { resolved } = useTheme();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let cancelled = false;
    loadGis().then(() => {
      if (cancelled || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp: { credential: string }) => {
          setBusy(true);
          try {
            const { data } = await api.post('/auth/google', { credential: resp.credential, remember: true });
            setToken(data.token, true); setUser(data.user);
            toast.success(data.created ? 'Welcome! Tell us a bit about you.' : `Welcome back, ${data.user.fullName.split(' ')[0]}`);
            nav(data.user.profileComplete ? '/' : '/onboarding', { replace: true });
          } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
        },
      });
      window.google.accounts.id.renderButton(ref.current, { theme: resolved === 'dark' ? 'filled_black' : 'outline', size: 'large', shape: 'pill', width: 320, text: label });
    }).catch(() => setFailed(true));
    return () => { cancelled = true; };
  }, [resolved, label, nav, setUser]);

  if (!CLIENT_ID) {
    return (
      <div className="well flex items-center justify-center gap-2 px-4 py-3 text-xs text-zinc-500" title="Set VITE_GOOGLE_CLIENT_ID (client) and GOOGLE_CLIENT_ID (server) to enable">
        <GoogleG /> Google sign-in is not configured yet
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className={busy ? 'pointer-events-none opacity-60' : ''} aria-busy={busy} />
      {failed && <p className="text-xs text-rose-500">Google sign-in could not load. Check your connection or ad blocker.</p>}
    </div>
  );
}

export function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
