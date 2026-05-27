import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import * as usersService from '../services/users.service';
import { setAuthCookie, clearAuthCookie } from '../services/token.service';
import { generateCsrfToken } from '../middleware/csrf';
import { logger } from '../utils/logger';

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await authService.login(email, password);
    setAuthCookie(req, res, (user._id as any).toString(), user.role);
    generateCsrfToken(req, res, { overwrite: true });
    logger.info(
      { userId: (user._id as any).toString(), email: user.email, role: user.role },
      'auth.login.success'
    );
    res.json(user);
  } catch (error: any) {
    if (error instanceof authService.AuthError) {
      logger.warn({ email }, 'auth.login.failure');
      res.status(error.status).json({ message: error.message });
      return;
    }
    logger.error({ err: error, email }, 'auth.login.error');
    res.status(500).json({ message: 'Serverska greška' });
  }
};

export const logoutUser = (_req: Request, res: Response): void => {
  clearAuthCookie(res);
  res.json({ message: 'Odjavljeni ste' });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Niste prijavljeni' });
    return;
  }
  const user = await usersService.findUserById(req.user.id);
  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({ message: 'Korisnik ne postoji' });
    return;
  }
  res.json(user);
};
