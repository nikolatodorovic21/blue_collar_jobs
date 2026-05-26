import { z } from 'zod';
import { stripHtml } from '../utils/sanitizeText';

export const createReviewSchema = z
  .object({
    jobId: z.string().min(1, 'jobId je obavezan'),
    rating: z.number().int().min(1, 'Ocena mora biti između 1 i 5').max(5, 'Ocena mora biti između 1 i 5'),
    comment: z
      .string()
      .max(1000, 'Komentar ne sme prelaziti 1000 karaktera')
      .transform((v) => stripHtml(v))
      .optional()
  })
  .strict();
