import { Request, Response } from 'express';
import * as jobService from '../services/jobs.service';
import { InvalidCursorError } from '../services/jobs.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { JobStatus } from '../models/job.model';
import type { GetJobsQuery } from '../schemas/job.schema';

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.validatedQuery as GetJobsQuery;
    const result = await jobService.listJobs(query);
    res.json(result);
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      res.status(400).json({ message: err.message });
      return;
    }
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
    res.status(400).json({ message: 'Neispravni podaci' });
  }
};

export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, reason } = req.body as { status: JobStatus; reason?: string };
    const updated = await jobService.transitionJobStatus(
      req.params.id,
      { userId: req.user!.id, role: req.user!.role },
      status,
      reason
    );
    res.json(updated);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ message: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};
