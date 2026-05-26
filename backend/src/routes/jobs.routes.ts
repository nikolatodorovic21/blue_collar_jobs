import { Router } from 'express';
import {
  getJobs,
  getJob,
  addJob,
  updateJobStatus,
  deleteJob
} from '../controllers/jobs.controller';
import { submitBid, getBidsForJob } from '../controllers/bids.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { validateQuery } from '../middleware/validateQuery';
import { jobCreateLimiter, bidSubmitLimiter } from '../middleware/rateLimit';
import {
  createJobSchema,
  getJobsQuerySchema,
  updateJobStatusSchema,
  deleteJobSchema
} from '../schemas/job.schema';
import { submitBidSchema } from '../schemas/bid.schema';

const router = Router();

router.get('/', validateQuery(getJobsQuerySchema), (req, res, next) => {
  getJobs(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  getJob(req, res).catch(next);
});

router.post(
  '/',
  jobCreateLimiter,
  requireAuth,
  requireRole('client'),
  validate(createJobSchema),
  (req, res, next) => {
    addJob(req, res).catch(next);
  }
);

router.post(
  '/:id/bids',
  bidSubmitLimiter,
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

router.patch(
  '/:id/status',
  requireAuth,
  validate(updateJobStatusSchema),
  (req, res, next) => {
    updateJobStatus(req, res).catch(next);
  }
);

router.delete(
  '/:id',
  requireAuth,
  validate(deleteJobSchema),
  (req, res, next) => {
    deleteJob(req, res).catch(next);
  }
);

export default router;
