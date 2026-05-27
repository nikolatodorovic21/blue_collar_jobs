/// <reference path="./types/express.d.ts" />
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import jobsRouter from './routes/jobs.routes';
import usersRouter from './routes/users.routes';
import authRouter from './routes/auth.routes';
import bidsRouter from './routes/bids.routes';
import reviewsRouter from './routes/reviews.routes';
import { doubleCsrfProtection } from './middleware/csrf';
import { logger } from './utils/logger';

const app: Express = express();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", clientOrigin],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  pinoHttp({
    logger,
    autoLogging: process.env.NODE_ENV !== 'test',
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.headers["x-csrf-token"]',
        'res.headers["set-cookie"]'
      ],
      remove: true
    }
  })
);

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(doubleCsrfProtection);

app.use('/api/jobs', jobsRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/bids', bidsRouter);
app.use('/api/reviews', reviewsRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'EBADCSRFTOKEN' || err?.code === 'ERR_BAD_CSRF_TOKEN' || err?.statusCode === 403) {
    res.status(403).json({ message: 'CSRF token nije validan' });
    return;
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ message: 'Serverska greška' });
});

export default app;
