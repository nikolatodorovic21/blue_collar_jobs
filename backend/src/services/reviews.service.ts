import { Types } from 'mongoose';
import { Review } from '../models/review.model';
import { Job } from '../models/job.model';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';

export interface CreateReviewInput {
  jobId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
}

export const createReview = async (input: CreateReviewInput) => {
  const job = await Job.findById(input.jobId);
  if (!job) throw new NotFoundError('Posao nije pronađen');
  if (job.status !== 'completed') {
    throw new ConflictError('Recenzija je moguća tek kada je posao završen');
  }

  const clientId = job.userId?.toString();
  const workerId = job.assignedWorkerId?.toString();
  if (!clientId || !workerId) {
    throw new ConflictError('Posao nema dovoljno učesnika za recenziju');
  }

  let revieweeId: string;
  if (input.reviewerId === clientId) {
    revieweeId = workerId;
  } else if (input.reviewerId === workerId) {
    revieweeId = clientId;
  } else {
    throw new ForbiddenError('Niste učestvovali u ovom poslu');
  }

  try {
    const review = new Review({
      jobId: new Types.ObjectId(input.jobId),
      reviewerId: new Types.ObjectId(input.reviewerId),
      revieweeId: new Types.ObjectId(revieweeId),
      rating: input.rating,
      comment: input.comment ?? ''
    });
    return await review.save();
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new ConflictError('Već ste ostavili recenziju za ovaj posao');
    }
    throw err;
  }
};

export const listReviewsForUser = async (userId: string) => {
  return await Review.find({ revieweeId: userId })
    .populate('reviewerId', 'name role')
    .populate('jobId', 'type')
    .sort({ createdAt: -1 });
};

export const getAggregateRating = async (
  userId: string
): Promise<{ average: number | null; count: number }> => {
  const result = await Review.aggregate<{ average: number; count: number }>([
    { $match: { revieweeId: new Types.ObjectId(userId) } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  if (result.length === 0) return { average: null, count: 0 };
  return { average: result[0].average, count: result[0].count };
};
