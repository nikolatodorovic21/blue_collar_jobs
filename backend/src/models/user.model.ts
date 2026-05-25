import { Schema, model } from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  name: string;
  role: 'worker' | 'client';
  skills: string[];
  address?: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['worker', 'client'] },
    skills: { type: [String], default: [] },
    address: { type: String }
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    delete ret.password;
    return ret;
  }
});

export const User = model<IUser>('User', userSchema);
