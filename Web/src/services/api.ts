import axios from 'axios';

// آدرس بک‌اند پایتون شما (چون روی همون سیستم ران میشه، localhost میذاریم)
export const BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// این بخش باعث میشه توکن تو هر درخواست به بک‌اند فرستاده بشه
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;