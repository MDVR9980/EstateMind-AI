import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { navigate } from '../navigation/NavigationService';
import Toast from 'react-native-toast-message';

// لطفاً در صورت نیاز IP سیستم خود را جایگزین کنید
export const BASE_URL = "http://10.77.241.18:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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