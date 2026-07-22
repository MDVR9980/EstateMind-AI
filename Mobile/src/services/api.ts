// src/services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../store/useAuthStore';

// آی‌پی دقیق شبکه وای‌فای شما قرار داده شد:
export const BASE_URL = "http://10.219.99.18:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, 
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers.Cookie = `access_token=Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await SecureStore.deleteItemAsync('userToken');
      Toast.show({
        type: 'error',
        text1: 'نشست منقضی شد',
        text2: 'لطفاً مجدداً وارد حساب کاربری خود شوید.',
      });
      navigate('Login');
    }
    return Promise.reject(error);
  }
);

export default api;