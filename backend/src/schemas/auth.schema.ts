import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Neispravan email'),
  password: z.string().min(1, 'Lozinka je obavezna')
}).strict();

export const registerSchema = z.object({
  email: z.string().email('Neispravan email'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 karaktera'),
  name: z.string().min(1, 'Ime je obavezno'),
  role: z.enum(['worker', 'client']),
  skills: z.array(z.string()).optional(),
  address: z.string().optional()
}).strict();
