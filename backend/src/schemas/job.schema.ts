import { z } from 'zod';
import { JOB_TYPES } from '../constants/jobTypes';
import { JOB_STATUSES } from '../constants/jobStatusTransitions';

export const createJobSchema = z.object({
  type: z.enum(JOB_TYPES),
  price: z.number().nonnegative('Cena mora biti veća ili jednaka 0'),
  location: z.string().min(1, 'Lokacija je obavezna'),
  description: z.string().min(1, 'Opis je obavezan')
}).strict();

export const updateJobStatusSchema = z
  .object({
    status: z.enum(['in_progress', 'completed', 'cancelled', 'disputed']),
    reason: z.string().min(1).max(500).optional()
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
