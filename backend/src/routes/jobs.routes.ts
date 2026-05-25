import { Router } from 'express';
import { 
  getJobs, 
  addJob, 
  updateJob 
} from '../controllers/jobs.controller';

const router = Router();

// Ispravno definisane rute
router.get('/', (req, res, next) => {
  getJobs(req, res).catch(next);
});

router.post('/', (req, res, next) => {
  addJob(req, res).catch(next);
});

router.patch('/:id', (req, res, next) => {
  updateJob(req, res).catch(next);
});

export default router;