import jwt from 'jsonwebtoken';
import type { Request, Response, CookieOptions } from 'express';

const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = () => process.env.NODE_ENV === 'production';

export const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd(),
  path: '/',
  maxAge: TOKEN_MAX_AGE_MS
});

export const signAuthToken = (userId: string, role: 'worker' | 'client'): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ sub: userId, role }, secret, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });
};

export const setAuthCookie = (req: Request, res: Response, userId: string, role: 'worker' | 'client'): void => {
  const token = signAuthToken(userId, role);
  res.cookie('token', token, cookieOptions());
  // Mirror the new token onto the current request so any code later in this handler
  // (e.g. CSRF token generation that binds to the session identifier) sees the same
  // value subsequent requests will carry in their cookie.
  if (!req.cookies) (req as any).cookies = {};
  req.cookies.token = token;
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie('token', { ...cookieOptions(), maxAge: undefined });
};
