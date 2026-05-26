import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';

const SALT_ROUNDS = 10;

export const createUser = async (data: IUser) => {
  const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = new User({ ...data, password: hash });
  return await user.save();
};

export const findUserByEmail = async (email: string) => {
  return await User.findOne({ email: email.toLowerCase() });
};

export const findUserById = async (id: string) => {
  return await User.findById(id);
};

export const findPublicUserById = async (id: string) => {
  return await User.findById(id).select('name role skills');
};
