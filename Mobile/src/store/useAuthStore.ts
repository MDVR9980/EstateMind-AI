// src/store/useAuthStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  full_name: string;
  role: string;
  avatar_letter: string;
  agency_id?: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true, // در ابتدا در حال لود است تا توکن را از حافظه بخواند

  login: async (token, userData) => {
    await SecureStore.setItemAsync('userToken', token);
    set({ token, user: userData || null, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    set({ token: null, user: null, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        set({ token, isLoading: false });
      } else {
        set({ token: null, isLoading: false });
      }
    } catch (error) {
      set({ token: null, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));