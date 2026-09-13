import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'IronPilot',
        short_name: 'IronPilot',
        description: 'IronPilot - your AI gym co-pilot: guided workouts, timers, tracking, diet plans and analytics.',
        theme_color: '#5a9e0c',
        background_color: '#fafafa',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // JS is intentionally left out of precache: route-only chunks (charts, PDF/canvas export)
        // would otherwise all download in the background right after first paint, on every deploy.
        // They're cached on demand instead via the runtime 'app-scripts' rule below.
        globPatterns: ['**/*.{css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          { urlPattern: /\/api\/library\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'library', expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 } } },
          { urlPattern: /^https:\/\/images\.unsplash\.com\//, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 } } },
          { urlPattern: ({ request }) => request.destination === 'script', handler: 'StaleWhileRevalidate', options: { cacheName: 'app-scripts', expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 3600 } } },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        // When the API is down, answer with a clean 503 the app understands instead of dumping a stack trace per request
        configure: (proxy) => {
          let lastWarn = 0;
          proxy.on('error', (err, _req, res) => {
            if (Date.now() - lastWarn > 10_000) { console.warn(`[proxy] API at ${proxyTarget} is not reachable (${(err as NodeJS.ErrnoException).code || err.message}). Start it with "npm run dev" inside /server.`); lastWarn = Date.now(); }
            const r = res as import('http').ServerResponse;
            if (r && typeof r.writeHead === 'function' && !r.headersSent) { r.writeHead(503, { 'Content-Type': 'application/json' }); r.end(JSON.stringify({ success: false, code: 'API_DOWN', message: 'The API server is not running' })); }
          });
        },
      },
    },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  };
});
