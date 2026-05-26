import { Router } from 'express';
import { createReview, listReviewsForUser } from '../controllers/reviews.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validate } from '../middleware/validate';
import { createReviewSchema } from '../schemas/review.schema';

const router = Router();

router.get('/', (req, res, next) => {
  listReviewsForUser(req, res).catch(next);
});

router.post(
  '/',
  requireAuth,
  validate(createReviewSchema),
  (req, res, next) => {
    createReview(req, res).catch(next);
  }
);

export default router;
