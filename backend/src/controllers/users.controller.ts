import { Request, Response } from 'express';
import * as usersService from '../services/users.service';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      res.status(400).json({ message: 'Email, password, name and role are required' });
      return;
    }

    const existing = await usersService.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ message: 'Email adresa je već u upotrebi' });
      return;
    }

    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Invalid user data' });
  }
};
