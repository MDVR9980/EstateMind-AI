import { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Users,
  Sparkles,
  Building2,
} from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'funnel', label: 'قیف فروش', icon: TrendingUp },
  { id: 'finance', label: 'امور مالی', icon: Wallet },
  { id: 'customers', label: 'مشتریان', icon: Users },
  { id: 'ai', label: 'هوش مصنوعی', icon: Sparkles, badge: 'جدید' },
];

export default function Sidebar() {
  const [active, setActive] = useState('dashboard');

  return (
    <aside className="fixed top-0 right-0 z-30 h-screen w-20 lg:w-64 bg-slate-900 border-l border-slate-800 flex flex-col transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 h-20 px-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-lg font-bold text-slate-100 leading-tight">املاک‌یار</h1>
          <p className="text-[11px] text-slate-500">سامانه مدیریت املاک</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <p className="hidden lg:block px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          منوی اصلی
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`group relative flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-l-full bg-emerald-500" />
              )}
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              />
              <span className="hidden lg:block text-sm font-medium flex-1 text-right">
                {item.label}
              </span>
              {item.badge && (
                <span className="hidden lg:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom card */}
      <div className="hidden lg:block p-3 shrink-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 to-slate-800 border border-purple-500/20 p-4">
          <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-purple-500/20 blur-2xl animate-pulse-glow" />
          <div className="relative">
            <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-xs font-semibold text-slate-200 leading-relaxed">
              تحلیل هوشمند بازار
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              پیش‌بینی قیمت ملک با هوش مصنوعی
            </p>
            <button className="mt-3 w-full text-xs font-medium py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors">
              فعال‌سازی
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
