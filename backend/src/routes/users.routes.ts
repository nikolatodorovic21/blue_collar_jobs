import { Router } from 'express';
import { registerUser } from '../controllers/users.controller';

const router = Router();

router.post('/', (req, res, next) => {
  registerUser(req, res).catch(next);
});

export default router;
