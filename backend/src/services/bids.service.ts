import { Bid, IBid } from '../models/bid.model';
import { Job } from '../models/job.model';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { logger } from '../utils/logger';

const MAX_PENDING_BIDS_PER_WORKER = 10;

export const createBid = async (data: IBid) => {
  const pendingCount = await Bid.countDocuments({
    workerId: data.workerId,
    status: 'pending'
  });
  if (pendingCount >= MAX_PENDING_BIDS_PER_WORKER) {
    throw new ConflictError(
      `Dostigli ste maksimalan broj aktivnih ponuda (${MAX_PENDING_BIDS_PER_WORKER}).`
    );
  }
  const bid = new Bid(data);
  return await bid.save();
};

export const listBidsForJob = async (jobId: string) => {
  return await Bid.find({ jobId })
    .populate('workerId', 'name email')
    .sort({ createdAt: -1 });
};

export const listBidsForJobByWorker = async (jobId: string, workerId: string) => {
  return await Bid.find({ jobId, workerId })
    .populate('workerId', 'name email')
    .sort({ createdAt: -1 });
};

export const listBidsForWorker = async (workerId: string) => {
  return await Bid.find({ workerId })
    .populate('jobId', 'type price location status')
    .sort({ createdAt: -1 });
};

export const getBidById = async (id: string) => {
  return await Bid.findById(id);
};

export const acceptBid = async (bidId: string) => {
  const bid = await Bid.findById(bidId);
  if (!bid) throw new NotFoundError('Ponuda nije pronađena');

  const updatedJob = await Job.findOneAndUpdate(
    { _id: bid.jobId, status: 'open' },
    { status: 'assigned', assignedWorkerId: bid.workerId },
    { new: true }
  );
  if (!updatedJob) {
    throw new ConflictError('Posao više nije otvoren za ponude');
  }

  await Bid.updateOne({ _id: bid._id }, { status: 'accepted' });
  await Bid.updateMany(
    { jobId: bid.jobId, _id: { $ne: bid._id }, status: 'pending' },
    { status: 'rejected' }
  );

  logger.info(
    {
      bidId: bid._id.toString(),
      jobId: bid.jobId.toString(),
      workerId: bid.workerId.toString()
    },
    'bid.accepted'
  );

  return await Bid.findById(bid._id);
};

export interface EditBidPatch {
  amount?: number;
  message?: string;
  proposedDate?: Date;
  estimatedDuration?: { value: number; unit: 'hours' | 'days' };
}

export const editBid = async (bidId: string, workerId: string, patch: EditBidPatch) => {
  const bid = await Bid.findById(bidId);
  if (!bid) throw new NotFoundError('Ponuda nije pronađena');
  if (bid.workerId.toString() !== workerId) {
    throw new ForbiddenError('Možete menjati samo svoje ponude');
  }
  if (bid.status !== 'pending') {
    throw new ConflictError('Ponuda se više ne može menjati');
  }
  return await Bid.findByIdAndUpdate(bidId, patch, {
    new: true,
    runValidators: true
  });
};

export const withdrawBid = async (bidId: string, workerId: string) => {
  const bid = await Bid.findById(bidId);
  if (!bid) throw new NotFoundError('Ponuda nije pronađena');
  if (bid.workerId.toString() !== workerId) {
    throw new ForbiddenError('Možete povući samo svoje ponude');
  }
  if (bid.status !== 'pending') {
    throw new ConflictError('Ponuda se više ne može povući');
  }
  return await Bid.findByIdAndUpdate(
    bidId,
    { status: 'withdrawn' },
    { new: true }
  );
};

export const cascadePendingBidsToExpired = async (jobId: unknown) => {
  await Bid.updateMany({ jobId, status: 'pending' }, { status: 'expired' });
};
