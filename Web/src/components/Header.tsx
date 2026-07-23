import { useState } from 'react';
import { Bell, ChevronDown, Sun } from 'lucide-react';

export default function Header() {
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'مشتری جدید: قرارداد ویلای نیاوران بسته شد', time: '۱۰ دقیقه پیش', color: 'emerald' },
    { id: 2, text: 'هوش مصنوعی ۳ مشتری منطبق یافت', time: '۳۰ دقیقه پیش', color: 'purple' },
    { id: 3, text: 'پرداخت قسط دوم آپارتمان سعادت‌آباد ثبت شد', time: '۱ ساعت پیش', color: 'sky' },
  ];

  return (
    <header className="sticky top-0 z-20 h-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-5 lg:px-8">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
          <Sun className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-100">
            روز بخیر، مدیر عزیز
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            امروز سه‌شنبه، ۳۱ تیر ۱۴۰۴
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 z-40 overflow-hidden animate-fade-in-up">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">
                    اعلان‌ها
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    ۳ جدید
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 bg-${n.color}-500`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {n.text}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full py-2.5 text-xs font-medium text-emerald-400 hover:bg-slate-700/50 transition-colors">
                  مشاهده همه
                </button>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <button className="flex items-center gap-2.5 pr-1 pl-2 py-1 rounded-xl hover:bg-slate-800 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            ر
          </div>
          <div className="hidden lg:block text-right">
            <p className="text-sm font-semibold text-slate-200 leading-tight">
              رضا محمدی
            </p>
            <p className="text-[11px] text-slate-500">مدیرعامل</p>
          </div>
          <ChevronDown className="hidden lg:block w-4 h-4 text-slate-500" />
        </button>
      </div>
    </header>
  );
}