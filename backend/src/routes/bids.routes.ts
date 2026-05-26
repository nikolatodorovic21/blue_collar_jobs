import { Router } from 'express';
import {
  getMyBids,
  acceptBid,
  editBid,
  withdrawBid
} from '../controllers/bids.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { editBidSchema } from '../schemas/bid.schema';

const router = Router();

router.get('/', requireAuth, requireRole('worker'), (req, res, next) => {
  getMyBids(req, res).catch(next);
});

router.patch('/:id/accept', requireAuth, requireRole('client'), (req, res, next) => {
  acceptBid(req, res).catch(next);
});

router.patch(
  '/:id/withdraw',
  requireAuth,
  requireRole('worker'),
  (req, res, next) => {
    withdrawBid(req, res).catch(next);
  }
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('worker'),
  validate(editBidSchema),
  (req, res, next) => {
    editBid(req, res).catch(next);
  }
);

export default router;
