import { Request, Response } from 'express';
import * as bidsService from '../services/bids.service';
import { Job } from '../models/job.model';

export const submitBid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, message } = req.body;
    const workerId = req.user!.id;

    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404).json({ message: 'Posao nije pronađen' });
      return;
    }
    if (job.userId && job.userId.toString() === workerId) {
      res.status(403).json({ message: 'Ne možete dati ponudu na sopstveni posao' });
      return;
    }
    if (job.status !== 'open') {
      res.status(409).json({ message: 'Posao više nije otvoren za ponude' });
      return;
    }

    const bid = await bidsService.createBid({
      jobId: job._id as any,
      workerId: workerId as any,
      amount,
      message
    });
    res.status(201).json(bid);
  } catch {
    res.status(400).json({ message: 'Invalid bid data' });
  }
};

export const getBidsForJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404).json({ message: 'Posao nije pronađen' });
      return;
    }
    const callerId = req.user!.id;
    const isOwner = !!job.userId && job.userId.toString() === callerId;
    const bids = isOwner
      ? await bidsService.listBidsForJob(req.params.id)
      : await bidsService.listBidsForJobByWorker(req.params.id, callerId);
    res.json(bids);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyBids = async (req: Request, res: Response): Promise<void> => {
  try {
    const bids = await bidsService.listBidsForWorker(req.user!.id);
    res.json(bids);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const acceptBid = async (req: Request, res: Response): Promise<void> => {
  try {
    const callerId = req.user!.id;

    const bid = await bidsService.getBidById(req.params.id);
    if (!bid) {
      res.status(404).json({ message: 'Ponuda nije pronađena' });
      return;
    }

    const job = await Job.findById(bid.jobId);
    if (!job) {
      res.status(404).json({ message: 'Posao nije pronađen' });
      return;
    }
    if (!job.userId || job.userId.toString() !== callerId) {
      res.status(403).json({ message: 'Samo vlasnik posla može prihvatiti ponudu' });
      return;
    }
    if (job.status !== 'open') {
      res.status(409).json({ message: 'Posao više nije otvoren za ponude' });
      return;
    }

    const updated = await bidsService.acceptBid(req.params.id);
    res.json(updated);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
