import { Bid, IBid } from '../models/bid.model';
import { Job } from '../models/job.model';

export const createBid = async (data: IBid) => {
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
  if (!bid) return null;

  await Bid.updateOne({ _id: bid._id }, { status: 'accepted' });
  await Bid.updateMany(
    { jobId: bid.jobId, _id: { $ne: bid._id } },
    { status: 'rejected' }
  );
  await Job.updateOne(
    { _id: bid.jobId },
    { status: 'assigned', assignedWorkerId: bid.workerId }
  );

  return await Bid.findById(bid._id);
};
