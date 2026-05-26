import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import * as usersService from '../services/users.service';
import * as reviewsService from '../services/reviews.service';
import { setAuthCookie } from '../services/token.service';
import { generateCsrfToken } from '../middleware/csrf';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await usersService.findUserByEmail(req.body.email);
    if (existing) {
      res.status(409).json({ message: 'Email adresa je već u upotrebi' });
      return;
    }

    const user = await usersService.createUser(req.body);
    setAuthCookie(req, res, (user._id as any).toString(), user.role);
    generateCsrfToken(req, res, { overwrite: true });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Invalid user data' });
  }
};

export const getPublicUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(404).json({ message: 'Korisnik nije pronađen' });
      return;
    }
    const user = await usersService.findPublicUserById(id);
    if (!user) {
      res.status(404).json({ message: 'Korisnik nije pronađen' });
      return;
    }
    const rating = await reviewsService.getAggregateRating(id);
    res.json({
      id: (user._id as any).toString(),
      name: user.name,
      role: user.role,
      skills: user.skills ?? [],
      rating
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
