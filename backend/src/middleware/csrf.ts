import { doubleCsrf } from 'csrf-csrf';

const csrfSecret = process.env.CSRF_SECRET || 'dev-csrf-secret-change-me';
const isProd = process.env.NODE_ENV === 'production';

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => req.cookies?.token ?? '',
  cookieName: isProd ? '__Host-csrf' : 'csrf-token',
  cookieOptions: {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProd,
    path: '/'
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  skipCsrfProtection: (req) => {
    if (req.method === 'POST' && req.path === '/api/auth/login') return true;
    if (req.method === 'POST' && (req.path === '/api/users' || req.path === '/api/users/')) return true;
    return false;
  }
});
