import { Schema, Types, model } from 'mongoose';

export type JobStatus = 'open' | 'assigned' | 'completed' | 'closed';

export interface IJob {
  type: string;
  price: number;
  location: string;
  description: string;
  status?: JobStatus;
  userId?: Types.ObjectId;
  assignedWorkerId?: Types.ObjectId;
}

const jobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'assigned', 'completed', 'closed'],
      default: 'open'
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedWorkerId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

jobSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

export const Job = model<IJob>('Job', jobSchema);
