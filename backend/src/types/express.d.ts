declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'worker' | 'client';
      };
    }
  }
}

export {};
