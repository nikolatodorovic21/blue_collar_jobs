import { Job, IJob, JobStatus } from '../models/job.model';
import { findTransition } from '../constants/jobStatusTransitions';
import { cascadePendingBidsToExpired } from './bids.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';

export const sweepExpiredJobs = async () => {
  const now = new Date();
  const expired = await Job.find({
    status: 'open',
    expiresAt: { $lt: now }
  }).select('_id');

  if (expired.length === 0) return;

  const ids = expired.map((j) => j._id);
  await Job.updateMany({ _id: { $in: ids } }, { status: 'closed' });
  for (const id of ids) {
    await cascadePendingBidsToExpired(id);
  }
};

export const getAllJobs = async () => {
  await sweepExpiredJobs();
  return await Job.find();
};

export const getJobById = async (id: string) => {
  await sweepExpiredJobs();
  return await Job.findById(id);
};

export const createJob = async (jobData: IJob) => {
  const job = new Job(jobData);
  return await job.save();
};

export interface TransitionContext {
  userId: string;
  role: 'client' | 'worker';
}

export const transitionJobStatus = async (
  jobId: string,
  ctx: TransitionContext,
  targetStatus: JobStatus,
  reason?: string
) => {
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Posao nije pronađen');

  const fromStatus = job.status as JobStatus;
  const transition = findTransition(fromStatus, targetStatus);
  if (!transition) {
    throw new ConflictError('Nedozvoljena promena statusa');
  }

  if (transition.actor === 'system' || transition.actor === 'admin') {
    throw new ForbiddenError('Nemate dozvolu za ovu promenu statusa');
  }

  const isOwner = !!job.userId && job.userId.toString() === ctx.userId;
  const isAssignedWorker =
    !!job.assignedWorkerId && job.assignedWorkerId.toString() === ctx.userId;

  if (transition.actor === 'client') {
    if (ctx.role !== 'client' || !isOwner) {
      throw new ForbiddenError('Nemate dozvolu za ovu promenu statusa');
    }
  } else if (transition.actor === 'worker') {
    if (ctx.role !== 'worker' || !isAssignedWorker) {
      throw new ForbiddenError('Nemate dozvolu za ovu promenu statusa');
    }
  } else if (transition.actor === 'either') {
    if (!isOwner && !isAssignedWorker) {
      throw new ForbiddenError('Nemate dozvolu za ovu promenu statusa');
    }
  }

  if (transition.requiresReason && (!reason || reason.trim().length === 0)) {
    throw new ConflictError('Razlog je obavezan za ovu promenu statusa');
  }

  const update: Record<string, unknown> = { status: targetStatus };
  if (targetStatus === 'completed') update.completedAt = new Date();
  if (targetStatus === 'cancelled') {
    update.cancelledAt = new Date();
    update.cancelReason = reason;
  }
  if (targetStatus === 'disputed' && reason) {
    update.cancelReason = reason;
  }

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, status: fromStatus },
    update,
    { new: true }
  );
  if (!updated) {
    throw new ConflictError('Status je u međuvremenu promenjen, pokušajte ponovo');
  }

  if (targetStatus === 'cancelled') {
    await cascadePendingBidsToExpired(updated._id);
  }

  return updated;
};
