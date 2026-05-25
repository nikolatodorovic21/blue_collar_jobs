import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type Payload = { sub: string; role: 'worker' | 'client' };

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ message: 'Niste prijavljeni' });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: 'JWT_SECRET not configured' });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as Payload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: 'Sesija je istekla, prijavite se ponovo' });
  }
};
