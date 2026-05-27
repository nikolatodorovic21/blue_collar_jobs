import { z } from 'zod';
import { JOB_TYPES } from '../constants/jobTypes';
import { JOB_STATUSES } from '../constants/jobStatusTransitions';
import { stripHtml } from '../utils/sanitizeText';

const PRICE_MIN = 1;
const PRICE_MAX = 10_000_000;

const sanitizedReason = z
  .string()
  .min(1)
  .max(500)
  .transform((v) => stripHtml(v));

export const createJobSchema = z
  .object({
    type: z.enum(JOB_TYPES),
    price: z
      .number()
      .min(PRICE_MIN, 'Cena mora biti najmanje 1 RSD')
      .max(PRICE_MAX, 'Cena ne sme prelaziti 10.000.000 RSD'),
    location: z.string().min(1, 'Lokacija je obavezna').max(200),
    description: z
      .string()
      .min(1, 'Opis je obavezan')
      .max(5000, 'Opis ne sme prelaziti 5000 karaktera')
      .transform((v) => stripHtml(v))
  })
  .strict();

export const updateJobStatusSchema = z
  .object({
    status: z.enum(['in_progress', 'completed', 'cancelled', 'disputed']),
    reason: sanitizedReason.optional()
  })
  .strict();

export const deleteJobSchema = z
  .object({
    reason: sanitizedReason.optional()
  })
  .strict();

export const getJobsQuerySchema = z
  .object({
    type: z.enum(JOB_TYPES).optional(),
    location: z.string().min(1).max(100).optional(),
    priceMin: z.coerce.number().nonnegative().optional(),
    priceMax: z.coerce.number().nonnegative().optional(),
    status: z.enum(JOB_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    cursor: z.string().optional()
  })
  .strict()
  .refine(
    (q) => q.priceMin == null || q.priceMax == null || q.priceMin <= q.priceMax,
    { message: 'priceMin ne sme biti veći od priceMax', path: ['priceMin'] }
  );

export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>;
