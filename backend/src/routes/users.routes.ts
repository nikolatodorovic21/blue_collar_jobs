import { Router } from 'express';
import { registerUser } from '../controllers/users.controller';
import { validate } from '../middleware/validate';
import { registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/', validate(registerSchema), (req, res, next) => {
  registerUser(req, res).catch(next);
});

export default router;
