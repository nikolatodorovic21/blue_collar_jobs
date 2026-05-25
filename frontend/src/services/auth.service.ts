import api from './api';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'worker' | 'client';
  skills: string[];
  address?: string;
}

export const authService = {
  async login(email: string, password: string) {
    const { data: user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async register(data: RegisterData) {
    const { data: user } = await api.post('/users', data);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user);
  },

  logout() {
    localStorage.removeItem('user');
  }
};
