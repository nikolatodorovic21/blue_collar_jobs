import { Router } from 'express';
import { getJobs, getJob, addJob } from '../controllers/jobs.controller';
import { submitBid, getBidsForJob } from '../controllers/bids.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { createJobSchema } from '../schemas/job.schema';
import { submitBidSchema } from '../schemas/bid.schema';

const router = Router();

router.get('/', (req, res, next) => {
  getJobs(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  getJob(req, res).catch(next);
});

router.post(
  '/',
  requireAuth,
  requireRole('client'),
  validate(createJobSchema),
  (req, res, next) => {
    addJob(req, res).catch(next);
  }
);

router.post(
  '/:id/bids',
  requireAuth,
  requireRole('worker'),
  validate(submitBidSchema),
  (req, res, next) => {
    submitBid(req, res).catch(next);
  }
);

router.get('/:id/bids', requireAuth, (req, res, next) => {
  getBidsForJob(req, res).catch(next);
});

export default router;
