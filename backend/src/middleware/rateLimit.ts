import rateLimit, { Options } from 'express-rate-limit';
import { RequestHandler } from 'express';

const RATE_LIMIT_MESSAGE = 'Previše zahteva, pokušajte ponovo kasnije.';

const noop: RequestHandler = (_req, _res, next) => next();

const make = (opts: Partial<Options>): RequestHandler => {
  if (process.env.NODE_ENV === 'test') return noop;
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: RATE_LIMIT_MESSAGE },
    ...opts
  });
};

export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10
});

export const registerLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5
});

export const jobCreateLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 20
});

export const bidSubmitLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 30
});
