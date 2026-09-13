import mongoose from 'mongoose';
import { env } from './env.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Connect with a small pool and sane timeouts; retry with backoff so a slow-starting database
 * (Atlas cold start, local container) does not crash the API on boot. Indexes are built
 * automatically in development; in production autoIndex is off (see syncIndexes() below instead).
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

/**
 * Build any indexes declared on schemas but not yet present in the database. Needed because
 * autoIndex is off in production (building indexes on every connect is unsafe under load) - this
 * is the deploy-time equivalent, run once in the background after connecting so it never blocks
 * server startup. Cheap no-op once indexes already exist (Mongoose diffs against what's there).
 */
export async function syncIndexes() {
  const models = Object.values(mongoose.connection.models);
  for (const model of models) {
    // Resolves to indexes it dropped (stale ones no longer in the schema); missing indexes are
    // created as a side effect either way.
    const dropped = await model.syncIndexes();
    if (dropped.length) console.log(`[db] ${model.modelName}: dropped stale indexes (${dropped.join(', ')})`);
  }
  console.log(`[db] indexes synced for ${models.length} model(s)`);
}
