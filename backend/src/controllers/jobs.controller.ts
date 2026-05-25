import { Request, Response } from 'express';
import * as jobService from '../services/jobs.service';

export const getJobs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await jobService.getAllJobs();
    res.json(jobs);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await jobService.getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ message: 'Posao nije pronađen' });
      return;
    }
    res.json(job);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await jobService.createJob({ ...req.body, userId: req.user!.id });
    res.status(201).json(job);
  } catch {
    res.status(400).json({ message: 'Invalid job data' });
  }
};
