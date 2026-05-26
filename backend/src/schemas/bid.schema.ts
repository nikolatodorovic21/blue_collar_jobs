import { z } from 'zod';

const estimatedDurationSchema = z.object({
  value: z.number().nonnegative('Trajanje mora biti veće ili jednako 0'),
  unit: z.enum(['hours', 'days'])
});

const proposedDateSchema = z
  .coerce.date()
  .refine((d) => d.getTime() > Date.now(), 'Datum mora biti u budućnosti');

export const submitBidSchema = z
  .object({
    amount: z.number().nonnegative('Iznos mora biti veći ili jednak 0'),
    message: z.string().max(1000).optional(),
    proposedDate: proposedDateSchema.optional(),
    estimatedDuration: estimatedDurationSchema.optional()
  })
  .strict();

export const editBidSchema = z
  .object({
    amount: z.number().nonnegative('Iznos mora biti veći ili jednak 0').optional(),
    message: z.string().max(1000).optional(),
    proposedDate: proposedDateSchema.optional(),
    estimatedDuration: estimatedDurationSchema.optional()
  })
  .strict()
  .refine(
    (obj) => Object.keys(obj).length > 0,
    'Nije ništa izmenjeno'
  );
