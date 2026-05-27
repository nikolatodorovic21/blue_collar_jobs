import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { logger } from './utils/logger';

const REQUIRED_PROD_ENV = ['JWT_SECRET', 'CSRF_SECRET', 'MONGODB_URI', 'CLIENT_ORIGIN'] as const;

if (process.env.NODE_ENV === 'production') {
  for (const key of REQUIRED_PROD_ENV) {
    if (!process.env[key]) {
      throw new Error(`Required env var ${key} missing in production. See docs/wiki/security-hardening.md.`);
    }
  }
}

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'server.listening');
  });
});
