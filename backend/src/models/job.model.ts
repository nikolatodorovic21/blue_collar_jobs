import { Schema, Types, model } from 'mongoose';

export type JobStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'closed'
  | 'disputed';

export interface IJob {
  type: string;
  price: number;
  location: string;
  description: string;
  status?: JobStatus;
  userId?: Types.ObjectId;
  assignedWorkerId?: Types.ObjectId;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  expiresAt?: Date;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const jobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'closed', 'disputed'],
      default: 'open'
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedWorkerId: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    expiresAt: { type: Date, default: () => new Date(Date.now() + THIRTY_DAYS_MS) }
  },
  { timestamps: true }
);

jobSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

export const Job = model<IJob>('Job', jobSchema);
