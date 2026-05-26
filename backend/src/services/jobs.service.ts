import { Types } from 'mongoose';
import { Job, IJob, JobStatus } from '../models/job.model';
import { JobType } from '../constants/jobTypes';
import { findTransition } from '../constants/jobStatusTransitions';
import { cascadePendingBidsToExpired } from './bids.service';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const encodeCursor = (createdAt: Date, id: Types.ObjectId): string =>
  Buffer.from(
    JSON.stringify({ c: createdAt.toISOString(), i: id.toString() })
  ).toString('base64');

export class InvalidCursorError extends Error {
  constructor() {
    super('Nevažeći cursor');
    this.name = 'InvalidCursorError';
  }
}

const decodeCursor = (cursor: string): { c: Date; i: Types.ObjectId } => {
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(raw) as { c: string; i: string };
    if (typeof parsed.c !== 'string' || typeof parsed.i !== 'string') {
      throw new InvalidCursorError();
    }
    const c = new Date(parsed.c);
    if (Number.isNaN(c.getTime())) throw new InvalidCursorError();
    if (!Types.ObjectId.isValid(parsed.i)) throw new InvalidCursorError();
    return { c, i: new Types.ObjectId(parsed.i) };
  } catch (err) {
    if (err instanceof InvalidCursorError) throw err;
    throw new InvalidCursorError();
  }
};

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

export interface ListJobsQuery {
  type?: JobType;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  status?: JobStatus;
  limit: number;
  cursor?: string;
}

export interface ListJobsResult {
  items: IJob[];
  nextCursor: string | null;
}

export const listJobs = async (query: ListJobsQuery): Promise<ListJobsResult> => {
  await sweepExpiredJobs();

  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.location) {
    filter.location = { $regex: escapeRegex(query.location), $options: 'i' };
  }
  if (query.priceMin != null || query.priceMax != null) {
    const range: Record<string, number> = {};
    if (query.priceMin != null) range.$gte = query.priceMin;
    if (query.priceMax != null) range.$lte = query.priceMax;
    filter.price = range;
  }

  if (query.cursor) {
    const { c, i } = decodeCursor(query.cursor);
    filter.$or = [
      { createdAt: { $lt: c } },
      { createdAt: c, _id: { $lt: i } }
    ];
  }

  const docs = await Job.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(query.limit + 1);

  let nextCursor: string | null = null;
  let items = docs;
  if (docs.length > query.limit) {
    items = docs.slice(0, query.limit);
    const last = items[items.length - 1] as unknown as {
      createdAt: Date;
      _id: Types.ObjectId;
    };
    nextCursor = encodeCursor(last.createdAt, last._id);
  }

  return { items, nextCursor };
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
