import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key} - check server/.env`);
  }
}

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /change_me/i.test(process.env.JWT_SECRET)) problems.push('JWT_SECRET must be a random string of at least 32 characters');
  if (!process.env.MONGO_URI) problems.push('MONGO_URI is required');
  if (!process.env.CLIENT_URL) problems.push('CLIENT_URL must list the allowed frontend origin(s)');
  if (problems.length) { console.error('[env] Refusing to start in production:\n - ' + problems.join('\n - ')); process.exit(1); }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'Admin@12345') console.warn('[env] WARNING: ADMIN_PASSWORD is the default - change it before exposing this server');
}

export const env = {
  appName: process.env.APP_NAME || 'IronPilot',
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ironpilot',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@localhost',
  },
  adminEmail: process.env.ADMIN_EMAIL || 'admin@ironpilot.app',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  autoSeed: process.env.AUTO_SEED !== 'false',
  isProd: process.env.NODE_ENV === 'production',
};
