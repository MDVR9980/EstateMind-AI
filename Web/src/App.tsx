import { useState, useEffect, useRef } from 'react';
import {
  Shield, Phone, Lock, User, ArrowLeft, KeyRound, CheckCircle2,
  Eye, EyeOff, Fingerprint, Users, DollarSign, Sparkles, Building2
} from 'lucide-react';

import api from './services/api';
import { useAuthStore } from './store/useAuthStore';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiCard from './components/KpiCard';
import RevenueChart from './components/RevenueChart';
import TransactionsTable from './components/TransactionsTable';
import KanbanBoard from './components/KanbanBoard';
import Properties from './components/Properties';
import AddProperty from './components/AddProperty';
import Customers from './components/Customers';
import Financials from './components/Financials';
import SuperAdmin from './components/SuperAdmin';

export default function App() {
  const { token, login } = useAuthStore();

  const [tab, setTab] = useState<'otp' | 'password'>('password');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [stats, setStats] = useState({ properties: 0, clients: 0, ai_matches: 0 });
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (token) {
      api.get('/api/users/dashboard-stats').then((res) => {
        if (res.data.status === 'success') setStats(res.data.stats);
      }).catch(() => {});
    }
  }, [token]);

  const handlePasswordLogin = async () => {
    if (!username || !password) return alert("لطفاً نام کاربری و رمز عبور را وارد کنید.");
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      if (res.data.access_token) login(res.data.access_token);
    } catch (error: any) { alert("خطا: " + (error.response?.data?.detail || "مشکل در ارتباط با سرور")); } finally { setLoading(false); }
  };

  const handleRequestOtp = async () => {
    if (!phone) return alert("شماره موبایل الزامی است.");
    setLoading(true);
    try {
      const res = await api.post('/api/auth/send-otp', { phone });
      if (res.data.status === 'success') setOtpSent(true);
    } catch (error: any) { alert("خطا: " + (error.response?.data?.detail || "مشکل در ارسال کد")); } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 5) return alert("کد ۵ رقمی را کامل وارد کنید.");
    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { phone, code });
      if (res.data.access_token) login(res.data.access_token);
    } catch (error: any) { alert("خطا: " + (error.response?.data?.detail || "کد اشتباه است")); } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 4) inputsRef.current[index + 1]?.focus();
  };
  
  const handleOtpKey = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) inputsRef.current[index - 1]?.focus();
  };

  // ====================================================
  // 💻 نمایش صفحات داشبورد و قیف فروش
  // ====================================================
  if (token) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden" dir="rtl">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:mr-64 mr-20">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
            
            {activeMenu === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <KpiCard title="فایل‌های من" value={`${stats.properties} فایل`} change="زنده" trend="up" icon={Building2} accent="emerald" spark={[30, 40, 35, 50, 45, 60, 55]} />
                  <KpiCard title="مشتریان در قیف" value={`${stats.clients} نفر`} change="زنده" trend="up" icon={Users} accent="sky" spark={[10, 15, 20, 18, 25, 30, 28]} />
                  <KpiCard title="مچینگ هوش مصنوعی" value={`${stats.ai_matches} پیشنهاد`} change="تست" trend="down" icon={Sparkles} accent="purple" spark={[50, 45, 40, 35, 38, 30, 25]} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2"><RevenueChart /></div>
                  <div className="xl:col-span-1"><TransactionsTable /></div>
                </div>
              </>
            )}

            {activeMenu === 'funnel' && <KanbanBoard />}
            
            {activeMenu === 'customers' && <Customers />}

            {activeMenu === 'finance' && <Financials />}
            
            {activeMenu === 'properties' && <Properties setActiveMenu={setActiveMenu} />}

            {activeMenu === 'add_property' && <AddProperty setActiveMenu={setActiveMenu} />}
            
            {activeMenu === 'super_admin' && <SuperAdmin />}
            
          </main>
        </div>
      </div>
    );
  }

  // ====================================================
  // 🔒 صفحه لاگین (کاملِ کامل)
  // ====================================================
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[120px] animate-pulse-glow" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-500/15 blur-[120px] animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[100px]" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-in-up">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 blur-xl animate-pulse-glow" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-2xl shadow-emerald-500/30">
              <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">EstateMind <span className="text-emerald-400">AI</span></h1>
          <p className="text-sm text-slate-500 mt-1.5">سامانه هوشمند مدیریت املاک</p>
        </div>

        <div className="relative animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-800/40 to-blue-500/10 rounded-3xl blur-xl" />
          <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-slate-700/40 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-100">ورود به سیستم</h2>
              <p className="text-xs text-slate-500 mt-1">برای ادامه وارد شوید</p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/40 rounded-xl p-1.5 mb-6">
              <button onClick={() => setTab('otp')} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 ${tab === 'otp' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
                <KeyRound className="w-4 h-4" /> رمز یکبار مصرف (OTP)
              </button>
              <button onClick={() => setTab('password')} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all duration-200 ${tab === 'password' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
                <Lock className="w-4 h-4" /> رمز عبور ثابت
              </button>
            </div>

            {/* OTP Tab */}
            {tab === 'otp' && (
              <div className="space-y-5">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">شماره موبایل</label>
                      <div className="relative">
                        <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912 345 6789" className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pr-10 pl-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all" dir="ltr" />
                      </div>
                    </div>
                    <button onClick={handleRequestOtp} disabled={loading} className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 transition-all shadow-lg shadow-emerald-500/30">
                      {loading ? 'صبر کنید...' : <><ArrowLeft className="w-4 h-4" /> ارسال کد تایید</>}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 text-center">کد ۵ رقمی را وارد کنید</label>
                      <div className="flex items-center justify-center gap-2.5" dir="ltr">
                        {otpDigits.map((digit, i) => (
                          <input key={i} ref={(el) => { inputsRef.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKey(i, e)} className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-slate-800/60 text-slate-100 focus:outline-none transition-all ${digit ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-slate-700/50 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'}`} style={{ letterSpacing: '0.1em' }} />
                        ))}
                      </div>
                    </div>
                    <button onClick={handleVerifyOtp} disabled={loading} className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 transition-all shadow-lg shadow-emerald-500/30">
                      {loading ? 'بررسی...' : <><CheckCircle2 className="w-4 h-4" /> تایید و ورود</>}
                    </button>
                    <button onClick={() => setOtpSent(false)} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      تغییر شماره موبایل
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Password Tab */}
            {tab === 'password' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">نام کاربری</label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="نام کاربری خود را وارد کنید" className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pr-10 pl-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">رمز عبور</label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pr-10 pl-10 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all" />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0" />
                    <span className="text-xs text-slate-400">مرا به خاطر بسپار</span>
                  </label>
                  <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">فراموشی رمز عبور؟</button>
                </div>

                <button onClick={handlePasswordLogin} disabled={loading} className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 transition-all shadow-lg shadow-emerald-500/30">
                  {loading ? 'صبر کنید...' : <><ArrowLeft className="w-4 h-4" /> ورود به سیستم</>}
                </button>
              </div>
            )}

            {/* خط جداکننده */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/40" /></div>
              <div className="relative flex justify-center"><span className="bg-slate-900/60 backdrop-blur-2xl px-3 text-[11px] text-slate-500">یا</span></div>
            </div>

            {/* ورود با اثر انگشت */}
            <button className="w-full flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-all">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
              ورود با اثر انگشت
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6 animate-fade-in-up">
          با ورود به سیستم، شما شرایط و قوانین استفاده را می‌پذیرید
        </p>
      </div>
    </div>
  );
}