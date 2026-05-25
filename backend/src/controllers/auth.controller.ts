import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }
    const user = await authService.login(email, password);
    res.json(user);
  } catch (error: any) {
    if (error instanceof authService.AuthError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};
