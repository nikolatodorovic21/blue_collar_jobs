import { Request, Response } from 'express';
import * as jobService from '../services/jobs.service';
import { Job } from '../models/job.model';

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await jobService.getAllJobs();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, userId, ...jobData } = req.body;
    if (role !== 'client') {
      res.status(403).json({ message: 'Samo klijenti mogu postaviti posao' });
      return;
    }
    if (!userId) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }
    const job = await jobService.createJob({ ...jobData, userId });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: 'Invalid job data' });
  }
};

export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;
    if (role !== 'worker') {
      res.status(403).json({ message: 'Samo majstori mogu preuzeti posao' });
      return;
    }
    if (!userId) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }
    const existing = await Job.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    if (existing.userId && existing.userId.toString() === userId) {
      res.status(403).json({ message: 'Ne možete preuzeti sopstveni posao' });
      return;
    }
    const job = await jobService.takeJob(req.params.id, userId);
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
