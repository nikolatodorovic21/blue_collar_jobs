import { Router } from 'express';
import { getMyBids, acceptBid } from '../controllers/bids.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.get('/', requireAuth, requireRole('worker'), (req, res, next) => {
  getMyBids(req, res).catch(next);
});

router.patch('/:id/accept', requireAuth, requireRole('client'), (req, res, next) => {
  acceptBid(req, res).catch(next);
});

export default router;
