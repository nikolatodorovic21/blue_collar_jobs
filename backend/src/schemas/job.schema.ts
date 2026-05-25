import { z } from 'zod';

export const createJobSchema = z.object({
  type: z.string().min(1, 'Tip posla je obavezan'),
  price: z.number().nonnegative('Cena mora biti veća ili jednaka 0'),
  location: z.string().min(1, 'Lokacija je obavezna'),
  description: z.string().min(1, 'Opis je obavezan')
}).strict();
