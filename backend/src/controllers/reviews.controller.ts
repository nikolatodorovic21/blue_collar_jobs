import { Request, Response } from 'express';
import * as reviewsService from '../services/reviews.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, rating, comment } = req.body;
    const review = await reviewsService.createReview({
      jobId,
      reviewerId: req.user!.id,
      rating,
      comment
    });
    res.status(201).json(review);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ message: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: 'Serverska greška' });
  }
};

export const listReviewsForUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      res.status(400).json({ message: 'userId je obavezan' });
      return;
    }
    const reviews = await reviewsService.listReviewsForUser(userId);
    res.json(reviews);
  } catch {
    res.status(500).json({ message: 'Serverska greška' });
  }
};
