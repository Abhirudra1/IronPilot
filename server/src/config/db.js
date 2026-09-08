import mongoose from 'mongoose';
import { env } from './env.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Connect with a small pool and sane timeouts; retry with backoff so a slow-starting database
 * (Atlas cold start, local container) does not crash the API on boot. Indexes are built
 * automatically in development; in production run them as part of the deploy (autoIndex off).
 */
export async function connectDB({ attempts = 5 } = {}) {
  mongoose.set('strictQuery', true);
  const opts = {
    autoIndex: !env.isProd,
    maxPoolSize: Number(process.env.DB_POOL_SIZE || 10),
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    heartbeatFrequencyMS: 10_000,
  };
  for (let i = 1; i <= attempts; i++) {
    try {
      await mongoose.connect(env.mongoUri, opts);
      console.log(`[db] connected to ${mongoose.connection.host} (pool ${opts.maxPoolSize})`);
      break;
    } catch (e) {
      if (i === attempts) throw e;
      const wait = Math.min(15_000, 1_000 * 2 ** (i - 1));
      console.warn(`[db] connection attempt ${i}/${attempts} failed (${e.message}); retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected - driver will reconnect automatically'));
  mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
  mongoose.connection.on('error', (e) => console.error('[db] error:', e.message));
}
