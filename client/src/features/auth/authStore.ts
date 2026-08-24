import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../../services/api';

interface User {
  id: string;
  fullName: string;
  mobile: string;
  email?: string | null;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token });
      },
      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      },
    }),
    {
      name: 'mailari-auth-storage',
    }
  )
);
