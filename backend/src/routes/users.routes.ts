import { Router } from 'express';
import { registerUser, getPublicUser } from '../controllers/users.controller';
import { validate } from '../middleware/validate';
import { registerLimiter } from '../middleware/rateLimit';
import { registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/', registerLimiter, validate(registerSchema), (req, res, next) => {
  registerUser(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  getPublicUser(req, res).catch(next);
});

export default router;
