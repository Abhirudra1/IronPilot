import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter } from 'react-router-dom';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

// Cache query results across reloads so returning users see library/equipment/dashboard
// data instantly while it revalidates in the background, instead of a blank loader every visit.
const persister = createSyncStoragePersister({ key: 'ip_query_cache', storage: window.localStorage });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary><App /></ErrorBoundary>
            {/* Tap any toast to dismiss it: on touch screens a tap counts as "hover", which would otherwise pause the auto-dismiss timer. */}
            <Toaster position="top-center" gutter={8} toastOptions={{ className: 'dark:!bg-surface-700 dark:!text-white', duration: 2500, success: { duration: 2000 }, error: { duration: 4000 } }}>
              {(t) => <ToastBar toast={t}>{({ icon, message }) => <div role="button" tabIndex={0} className="flex cursor-pointer items-center" onClick={() => toast.dismiss(t.id)}>{icon}{message}</div>}</ToastBar>}
            </Toaster>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </PersistQueryClientProvider>
  </React.StrictMode>,
);
