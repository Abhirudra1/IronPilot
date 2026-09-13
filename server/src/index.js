import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDB, syncIndexes } from './config/db.js';
import { env } from './config/env.js';
import { ensureSeeded } from './seed/seed.js';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  // Keep-alive slightly above typical load-balancer idle timeouts; cap slow requests.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 120_000;
  // Open the port before the DB is ready: mongoose buffers queries until connected (so requests
  // just wait, they don't fail), but the platform's health check and cold-start TTFB no longer sit
  // behind connectDB()'s retry/backoff loop - this is the difference between the health check passing
  // in ~1s vs. up to ~30s on a cold instance.
  server.listen(env.port, () => console.log(`[server] ${env.appName} API listening on http://localhost:${env.port} (${env.nodeEnv})`));

  await connectDB();
  if (env.isProd) syncIndexes().catch((e) => console.error('[db] index sync failed:', e.message));
  if (env.autoSeed) await ensureSeeded().catch((e) => console.error('[seed] failed:', e.message));

  // Graceful shutdown: stop accepting connections, let in-flight requests finish, close the DB.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return; shuttingDown = true;
    console.log(`[server] ${signal} received - shutting down`);
    server.close(async () => { await mongoose.disconnect().catch(() => undefined); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => shutdown(sig));
}

process.on('unhandledRejection', (reason) => console.error('[server] unhandled rejection:', reason));
process.on('uncaughtException', (err) => { console.error('[server] uncaught exception:', err); process.exit(1); });

main().catch((err) => { console.error('[server] fatal:', err.message || err); process.exit(1); });
