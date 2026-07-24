import axios from 'axios';
import Swal from 'sweetalert2';

export const BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ارسال توکن پاکسازی شده در هدر درخواست‌ها
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('userToken');
  if (token) {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim().replace(/^"|"$/g, '');
    config.headers.Authorization = `Bearer ${cleanToken}`;
  }
  return config;
});

// مدیریت هوشمند ارورهای توکن و هدایت به لاگین
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('userToken');
      
      Swal.fire({
        title: 'نشست شما منقضی شد 🔒',
        text: 'لطفاً مجدداً وارد حساب کاربری خود شوید.',
        icon: 'warning',
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'ورود مجدد',
        customClass: { popup: 'rounded-3xl border border-slate-800 shadow-2xl' }
      }).then(() => {
        window.location.href = '/';
      });
    }
    return Promise.reject(error);
  }
);

export default api;