import { create } from 'zustand';

interface AuthState {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // همون اول چک میکنه ببینه قبلاً لاگین کردیم یا نه
  token: localStorage.getItem('userToken') || null,

  login: (token) => {
    localStorage.setItem('userToken', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('userToken');
    set({ token: null });
  },
}));