import { z } from 'zod';

export const submitBidSchema = z.object({
  amount: z.number().nonnegative('Iznos mora biti veći ili jednak 0'),
  message: z.string().max(1000).optional()
}).strict();
