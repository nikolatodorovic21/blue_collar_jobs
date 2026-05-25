import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs.routes';
import usersRouter from './routes/users.routes';
import authRouter from './routes/auth.routes';
import { connectDB } from './config/db';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);

// Pokretanje servera
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;
