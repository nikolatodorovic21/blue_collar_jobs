import { z } from 'zod';

export const createReviewSchema = z
  .object({
    jobId: z.string().min(1, 'jobId je obavezan'),
    rating: z.number().int().min(1, 'Ocena mora biti između 1 i 5').max(5, 'Ocena mora biti između 1 i 5'),
    comment: z.string().max(1000).optional()
  })
  .strict();
