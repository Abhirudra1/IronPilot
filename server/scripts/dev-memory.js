/**
 * Run the API against a throwaway in-memory MongoDB (no local Mongo install needed).
 * Data persists in server/.data/mongo between runs. Run: npm run dev:memory
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Data is persisted under server/.data/mongo so accounts survive restarts.
const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data', 'mongo');
mkdirSync(dbPath, { recursive: true });
const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
process.env.MONGO_URI = mongod.getUri('fitcoach_dev');
process.env.JWT_SECRET ||= 'dev_memory_secret';
console.log(`[dev:memory] in-memory MongoDB at ${process.env.MONGO_URI}`);

const { connectDB } = await import('../src/config/db.js');
const { ensureSeeded } = await import('../src/seed/seed.js');
const { createApp } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
await connectDB();
await ensureSeeded();
createApp().listen(env.port, () => console.log(`[server] ${env.appName} API (local file DB) on http://localhost:${env.port}`));
process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
