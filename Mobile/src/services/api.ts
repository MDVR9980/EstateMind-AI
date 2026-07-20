import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { navigate } from '../navigation/NavigationService';
import Toast from 'react-native-toast-message';

export const BASE_URL = "http://10.56.173.18:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Request Interceptor: تزریق خودکار توکن به تمام درخواست‌ها
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      // استاندارد موبایل
      config.headers.Authorization = `Bearer ${token}`;
      // تنظیم کوکی برای بک‌اند فعلی شما (تا زمانی که بک‌اند کاملاً به Authorization Header منتقل شود)
      config.headers.Cookie = `access_token=Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: مدیریت خطای سراسری (مثل ۴۰۱ شدن توکن)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      // توکن منقضی یا نامعتبر است
      await SecureStore.deleteItemAsync('userToken');
      Toast.show({
        type: 'error',
        text1: 'نشست منقضی شد',
        text2: 'لطفاً مجدداً وارد حساب کاربری خود شوید.',
      });
      // هدایت خودکار به صفحه ورود
      navigate('Login');
    }
    return Promise.reject(error);
  }
);

export default api;