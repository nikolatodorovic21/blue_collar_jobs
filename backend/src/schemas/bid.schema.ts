import { z } from 'zod';
import { stripHtml } from '../utils/sanitizeText';

const AMOUNT_MIN = 1;
const AMOUNT_MAX = 10_000_000;

const estimatedDurationSchema = z.object({
  value: z.number().nonnegative('Trajanje mora biti veće ili jednako 0'),
  unit: z.enum(['hours', 'days'])
});

const proposedDateSchema = z
  .coerce.date()
  .refine((d) => d.getTime() > Date.now(), 'Datum mora biti u budućnosti');

const amountSchema = z
  .number()
  .min(AMOUNT_MIN, 'Iznos mora biti najmanje 1 RSD')
  .max(AMOUNT_MAX, 'Iznos ne sme prelaziti 10.000.000 RSD');

const messageSchema = z
  .string()
  .max(1000, 'Poruka ne sme prelaziti 1000 karaktera')
  .transform((v) => stripHtml(v));

export const submitBidSchema = z
  .object({
    amount: amountSchema,
    message: messageSchema.optional(),
    proposedDate: proposedDateSchema.optional(),
    estimatedDuration: estimatedDurationSchema.optional()
  })
  .strict();

export const editBidSchema = z
  .object({
    amount: amountSchema.optional(),
    message: messageSchema.optional(),
    proposedDate: proposedDateSchema.optional(),
    estimatedDuration: estimatedDurationSchema.optional()
  })
  .strict()
  .refine(
    (obj) => Object.keys(obj).length > 0,
    'Nije ništa izmenjeno'
  );
