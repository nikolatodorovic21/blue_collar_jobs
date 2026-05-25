import { Schema, Types, model } from 'mongoose';

export interface IJob {
  type: string;
  price: number;
  location: string;
  description: string;
  taken: boolean;
  userId?: Types.ObjectId;
}

const jobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    taken: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

jobSchema.set('toJSON', {
  virtuals: true,
  versionKey: false
});

export const Job = model<IJob>('Job', jobSchema);
