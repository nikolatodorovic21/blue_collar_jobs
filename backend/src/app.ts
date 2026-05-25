/// <reference path="./types/express.d.ts" />
import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jobsRouter from './routes/jobs.routes';
import usersRouter from './routes/users.routes';
import authRouter from './routes/auth.routes';
import bidsRouter from './routes/bids.routes';
import { connectDB } from './config/db';
import { doubleCsrfProtection } from './middleware/csrf';

const app: Express = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(doubleCsrfProtection);

app.use('/api/jobs', jobsRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/bids', bidsRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'EBADCSRFTOKEN' || err?.code === 'ERR_BAD_CSRF_TOKEN' || err?.statusCode === 403) {
    res.status(403).json({ message: 'CSRF token nije validan' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;
