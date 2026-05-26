import { Router } from 'express';
import { loginUser, logoutUser, getMe } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { loginLimiter } from '../middleware/rateLimit';
import { loginSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), (req, res, next) => {
  loginUser(req, res).catch(next);
});

router.post('/logout', (req, res) => {
  logoutUser(req, res);
});

router.get('/me', requireAuth, (req, res, next) => {
  getMe(req, res).catch(next);
});

export default router;
