import { Schema, Types, model } from 'mongoose';

export type BidStatus = 'pending' | 'accepted' | 'rejected';

export interface IBid {
  jobId: Types.ObjectId;
  workerId: Types.ObjectId;
  amount: number;
  message?: string;
  status?: BidStatus;
}

const bidSchema = new Schema<IBid>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

bidSchema.index({ jobId: 1, workerId: 1 });

bidSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

export const Bid = model<IBid>('Bid', bidSchema);
