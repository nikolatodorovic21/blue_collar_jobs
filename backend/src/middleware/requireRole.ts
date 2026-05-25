import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: 'worker' | 'client') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Niste prijavljeni' });
      return;
    }
    if (req.user.role !== role) {
      const msg =
        role === 'client'
          ? 'Samo klijenti mogu izvršiti ovu radnju'
          : 'Samo majstori mogu izvršiti ovu radnju';
      res.status(403).json({ message: msg });
      return;
    }
    next();
  };
};
