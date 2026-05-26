import { Schema, Types, model } from 'mongoose';

export interface IReview {
  jobId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number;
  comment?: string;
}

const reviewSchema = new Schema<IReview>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
  },
  { timestamps: true }
);

reviewSchema.index({ jobId: 1, reviewerId: 1 }, { unique: true });

reviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

export const Review = model<IReview>('Review', reviewSchema);
