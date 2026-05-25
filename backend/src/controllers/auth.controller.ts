import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import * as usersService from '../services/users.service';
import { setAuthCookie, clearAuthCookie } from '../services/token.service';
import { generateCsrfToken } from '../middleware/csrf';

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    setAuthCookie(req, res, (user._id as any).toString(), user.role);
    generateCsrfToken(req, res, { overwrite: true });
    res.json(user);
  } catch (error: any) {
    if (error instanceof authService.AuthError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Server error' });
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
