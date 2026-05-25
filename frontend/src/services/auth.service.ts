import api from './api';
import type { User } from '@/types';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'worker' | 'client';
  skills: string[];
  address?: string;
}

type StoredUser = Pick<User, 'id' | 'name' | 'role'>;

const STORAGE_KEY = 'user';

const cacheUser = (user: User): StoredUser => {
  const slim: StoredUser = { id: user.id, name: user.name, role: user.role };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  return slim;
};

export const authService = {
  async login(email: string, password: string) {
    const { data: user } = await api.post<User>('/auth/login', { email, password });
    cacheUser(user);
    return user;
  },

  async register(data: RegisterData) {
    const { data: user } = await api.post<User>('/users', data);
    cacheUser(user);
    return user;
  },

  async me(): Promise<User | null> {
    try {
      const { data: user } = await api.get<User>('/auth/me');
      cacheUser(user);
      return user;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  getCurrentUser(): StoredUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  clearLocalCache() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
