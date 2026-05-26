import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('MONGODB_URI is not set. Add it to backend/.env');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    logger.info('mongo.connected');
  } catch (error) {
    logger.error({ err: error }, 'mongo.connect.failed');
    process.exit(1);
  }
};
