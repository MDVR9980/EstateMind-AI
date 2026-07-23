import { LayoutDashboard, TrendingUp, Wallet, Users, Building2, Home, ShieldCheck, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

type SidebarProps = {
  activeMenu: string;
  setActiveMenu: (id: string) => void;
};

export default function Sidebar({ activeMenu, setActiveMenu }: SidebarProps) {
  const { logout } = useAuthStore();

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'super_admin', label: 'اتاق فرمان SaaS', icon: ShieldCheck },
    { id: 'customers', label: 'مشتریان', icon: Users },
    { id: 'properties', label: 'بانک املاک', icon: Home },
    { id: 'finance', label: 'امور مالی', icon: Wallet },
    { id: 'funnel', label: 'قیف فروش', icon: TrendingUp },
  ];

  return (
    <aside className="fixed top-0 right-0 z-30 h-screen w-20 lg:w-64 bg-slate-900 border-l border-slate-800 flex flex-col justify-between transition-all duration-300">
      <div>
        <div className="flex items-center gap-3 h-20 px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold text-slate-100 leading-tight">املاک‌یار</h1>
          </div>
        </div>

        <nav className="px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`group relative flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {isActive && <span className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-l-full bg-emerald-500" />}
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden lg:block text-sm font-medium flex-1 text-right">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 🌟 دکمه خروج ثابت انتهای سایدبار */}
      <div className="p-3 border-t border-slate-800">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-xs"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-right">خروج از سیستم</span>
        </button>
      </div>
    </aside>
  );
}