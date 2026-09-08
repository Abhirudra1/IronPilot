import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </React.StrictMode>,
);
