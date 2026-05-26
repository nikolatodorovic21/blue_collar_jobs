import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validateQuery = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      res.status(400).json({ message: 'Neispravni podaci', errors: fieldErrors });
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
};
