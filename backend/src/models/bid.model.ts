import { Schema, Types, model } from 'mongoose';

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export type DurationUnit = 'hours' | 'days';

export interface EstimatedDuration {
  value: number;
  unit: DurationUnit;
}

export interface IBid {
  jobId: Types.ObjectId;
  workerId: Types.ObjectId;
  amount: number;
  message?: string;
  status?: BidStatus;
  proposedDate?: Date;
  estimatedDuration?: EstimatedDuration;
}

const estimatedDurationSchema = new Schema<EstimatedDuration>(
  {
    value: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['hours', 'days'], required: true }
  },
  { _id: false }
);

const bidSchema = new Schema<IBid>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'],
      default: 'pending'
    },
    proposedDate: { type: Date },
    estimatedDuration: { type: estimatedDurationSchema, default: undefined }
  },
  { timestamps: true }
);

bidSchema.index({ jobId: 1, workerId: 1 }, { unique: true });

bidSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

export const Bid = model<IBid>('Bid', bidSchema);
