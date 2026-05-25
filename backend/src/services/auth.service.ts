import bcrypt from 'bcryptjs';
import { findUserByEmail } from './users.service';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export const login = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthError('Pogrešan email ili lozinka');
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new AuthError('Pogrešan email ili lozinka');
  }
  return user;
};
