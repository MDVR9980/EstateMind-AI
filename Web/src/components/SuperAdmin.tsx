import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Plus, RefreshCcw, 
  Calendar, Power, X, Users, ChevronDown, ChevronUp, Edit, UserCheck, Crown, Trash2
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { formatPrice, toJalaliDate } from '../utils/numberFormat';

// تنظیمات تم دارک سفارشی SweetAlert2
const darkSwal = Swal.mixin({
  background: '#0f172a',
  color: '#f8fafc',
  confirmButtonColor: '#10b981',
  cancelButtonColor: '#334155',
  customClass: {
    popup: 'rounded-3xl border border-slate-800 shadow-2xl font-vazir'
  }
});

export default function SuperAdmin() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgencyId, setExpandedAgencyId] = useState<number | null>(null);

  // 🤖 ساخت اکانت/آژانس
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    agency_name: '', owner_name: '', phone: '', city: 'مشهد',
    plan_type: 'agency', max_agents: 5, months: 1, admin_username: '', admin_password: ''
  });

  // ✏️ ویرایش
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<any>(null);

  // 🔄 تمدید
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [addMonths, setAddMonths] = useState(12);
  const [addSeats, setAddSeats] = useState(0);

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/super-admin/agencies');
      if (res.data.status === 'success') {
        setAgencies(res.data.agencies || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgency = async (id: number) => {
    try {
      await api.put(`/api/super-admin/agencies/${id}/toggle`);
      darkSwal.fire({ title: 'تغییر وضعیت', text: 'وضعیت دسترسی آژانس آپدیت شد.', icon: 'success', timer: 1500, showConfirmButton: false });
      fetchAgencies();
    } catch (e) { 
      darkSwal.fire({ title: 'خطا', text: 'تغییر وضعیت انجام نشد.', icon: 'error', confirmButtonText: 'باشه' }); 
    }
  };

  // 🌟 حذف دائم با SweetAlert تاییدیه ۲ مرحله‌ای
  const handleDeleteAgency = async (agency: any) => {
    const confirm = await darkSwal.fire({
      title: 'آیا از حذف آژانس اطمینان دارید؟',
      text: `آژانس "${agency.name}" و تمام کاربران و فایل‌های آن برای همیشه پاک خواهند شد!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'بله، حذف دائم شود',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await api.delete(`/api/super-admin/agencies/${agency.id}`);
        darkSwal.fire({ title: 'حذف شد!', text: res.data.message, icon: 'success', confirmButtonText: 'عالی' });
        fetchAgencies();
      } catch (e: any) {
        darkSwal.fire({ title: 'خطا در حذف', text: e.response?.data?.detail || "مشکلی پیش آمد", icon: 'error', confirmButtonText: 'متوجه شدم' });
      }
    }
  };

  const handleCreateAgency = async () => {
    if (!newAgency.agency_name || !newAgency.admin_username || !newAgency.admin_password || !newAgency.phone) {
      return darkSwal.fire({ title: 'اطلاعات ناقص', text: 'لطفاً تمام فیلدهای الزامی را پر کنید.', icon: 'warning', confirmButtonText: 'اصلاح' });
    }
    try {
      const res = await api.post('/api/super-admin/agencies/add', newAgency);
      darkSwal.fire({ title: 'موفقیت‌آمیز 🎉', text: res.data.message, icon: 'success', confirmButtonText: 'بسیار عالی' });
      setAddModalOpen(false);
      setNewAgency({ agency_name: '', owner_name: '', phone: '', city: 'مشهد', plan_type: 'agency', max_agents: 5, months: 1, admin_username: '', admin_password: '' });
      fetchAgencies();
    } catch (e: any) {
      darkSwal.fire({ title: 'خطا در ساخت آژانس', text: e.response?.data?.detail || "مشکلی پیش آمد", icon: 'error', confirmButtonText: 'متوجه شدم' });
    }
  };

  const handleSaveEditAgency = async () => {
    if (!editingAgency) return;
    try {
      await api.put(`/api/super-admin/agencies/${editingAgency.id}/edit`, {
        name: editingAgency.name,
        owner_name: editingAgency.owner_name,
        phone: editingAgency.phone,
        city: editingAgency.city,
        max_agents_allowed: Number(editingAgency.max_agents_allowed)
      });
      darkSwal.fire({ title: 'ویرایش شد', text: 'اطلاعات آژانس با موفقیت به روز شد.', icon: 'success', confirmButtonText: 'باشه' });
      setEditModalOpen(false);
      fetchAgencies();
    } catch (e) { 
      darkSwal.fire({ title: 'خطا', text: 'ثبت ویرایش ناموفق بود.', icon: 'error', confirmButtonText: 'باشه' }); 
    }
  };

  const handleExtendLicense = async () => {
    if (!selectedAgency) return;
    try {
      await api.put(`/api/super-admin/agencies/${selectedAgency.id}/extend`, {
        add_months: addMonths,
        add_seats: addSeats
      });
      darkSwal.fire({ title: 'تمدید شد 🔄', text: 'لایسنس آژانس با موفقیت ارتقا یافت.', icon: 'success', confirmButtonText: 'عالی' });
      setExtendModalOpen(false);
      fetchAgencies();
    } catch (e) { 
      darkSwal.fire({ title: 'خطا', text: 'تمدید لایسنس انجام نشد.', icon: 'error', confirmButtonText: 'باشه' }); 
    }
  };

  const totalSeats = newAgency.plan_type === 'solo' ? 1 : newAgency.max_agents + 1;
  const monthlyPrice = totalSeats * 500000;
  const totalPrice = monthlyPrice * newAgency.months;

  return (
    <div className="animate-fade-in-up pb-20" dir="rtl">
      
      {/* هدر */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="text-rose-500 w-7 h-7" /> اتاق فرمان SaaS (مدیریت پلتفرم)
          </h2>
          <p className="text-sm text-slate-400 mt-1">مدیریت لایسنس‌های تکی و آژانسی، ظرفیت صندلی‌ها و تمدید اشتراک‌ها</p>
        </div>

        <button 
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" /> راه‌اندازی اکانت / آژانس جدید
        </button>
      </div>

      {/* لیست کارت‌های آژانس */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : agencies.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">هیچ اکانتی در سیستم ثبت نشده است.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {agencies.map((agency) => {
            const isExpanded = expandedAgencyId === agency.id;
            const isSolo = agency.max_agents_allowed === 1;

            return (
              <div key={agency.id} className={`bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${!agency.subscription_active || agency.is_expired ? 'border-rose-500/40 opacity-75' : 'border-slate-800 hover:border-slate-700'}`}>
                
                <div>
                  <div className="flex items-start justify-between mb-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-100">{agency.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${isSolo ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {isSolo ? '👤 اکانت تکی' : '🏢 آژانس تیمی'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">مالک: {agency.owner_name} ({agency.phone})</p>
                    </div>
                    <button 
                      onClick={() => handleToggleAgency(agency.id)}
                      className={`p-2 rounded-xl transition-all ${agency.subscription_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">مصرف ظرفیت کاربر:</span>
                      <span className={agency.used_seats >= agency.max_agents_allowed ? 'text-amber-400' : 'text-emerald-400'}>
                        {agency.used_seats} از {agency.max_agents_allowed} صندلی
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full transition-all ${agency.used_seats >= agency.max_agents_allowed ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (agency.used_seats / agency.max_agents_allowed) * 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                      <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-400"/> سررسید لایسنس:</span>
                      <span className={`font-bold ${agency.is_expired ? 'text-rose-400' : 'text-slate-200'}`}>
                        {toJalaliDate(agency.subscription_expires_at)}
                      </span>
                    </div>
                  </div>

                  {/* کشویی اعضا */}
                  <div className="mb-4">
                    <button 
                      onClick={() => setExpandedAgencyId(isExpanded ? null : agency.id)}
                      className="w-full bg-slate-950/80 hover:bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400"/> مشاهده اعضا ({agency.users?.length || 0} نفر)</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 animate-fade-in-up">
                        {agency.users && agency.users.length > 0 ? (
                          agency.users.map((u: any) => (
                            <div key={u.id} className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                              <div>
                                <p className="font-bold text-slate-200 flex items-center gap-1">
                                  {u.role_fa?.includes('مدیر') && <Crown className="w-3 h-3 text-amber-400" />}
                                  {u.full_name}
                                </p>
                                <p className="text-slate-500 font-mono nums-fa" dir="ltr">{u.username}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${u.role_fa?.includes('مدیر') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-emerald-400'}`}>
                                {u.role_fa}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-slate-500 text-center py-2">عضوی ثبت نشده است.</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  <button 
                    onClick={() => { setEditingAgency({...agency}); setEditModalOpen(true); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-2xl text-xs transition-all border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-purple-400" /> ویرایش
                  </button>
                  <button 
                    onClick={() => { setSelectedAgency(agency); setExtendModalOpen(true); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-2xl text-xs transition-all border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" /> تمدید
                  </button>
                  <button 
                    onClick={() => handleDeleteAgency(agency)}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 rounded-2xl text-xs transition-all border border-rose-500/20 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 🤖 MODAL 1: ساخت آژانس جدید */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 lg:p-8 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Building2 className="w-5 h-5"/> راه‌اندازی اکانت / آژانس جدید
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4 mb-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع پلن و خریدار:</label>
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  <button 
                    onClick={() => setNewAgency({...newAgency, plan_type: 'solo'})}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${newAgency.plan_type === 'solo' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    <UserCheck className="w-4 h-4"/> 👤 خرید تکی / مستقل (۱ کاربر)
                  </button>
                  <button 
                    onClick={() => setNewAgency({...newAgency, plan_type: 'agency'})}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${newAgency.plan_type === 'agency' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Building2 className="w-4 h-4"/> 🏢 خرید گروهی / آژانسی
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{newAgency.plan_type === 'solo' ? 'عنوان برند / دفتر:' : 'نام آژانس:'}</label>
                  <input type="text" value={newAgency.agency_name} onChange={e => setNewAgency({...newAgency, agency_name: e.target.value})} placeholder={newAgency.plan_type === 'solo' ? 'املاک شخصی رضا' : 'مسکن رویال'} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نام و نام خانوادگی:</label>
                  <input type="text" value={newAgency.owner_name} onChange={e => setNewAgency({...newAgency, owner_name: e.target.value})} placeholder="رضا محمدی" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">تلفن همراه:</label>
                  <input type="text" value={newAgency.phone} onChange={e => setNewAgency({...newAgency, phone: e.target.value})} placeholder="0915..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none nums-fa" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">شهر:</label>
                  <input type="text" value={newAgency.city} onChange={e => setNewAgency({...newAgency, city: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
                </div>
              </div>

              {newAgency.plan_type === 'agency' && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-emerald-400">ظرفیت مشاوران اضافه (Seats):</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 5, 10, 20].map(seats => (
                      <button 
                        key={seats} onClick={() => setNewAgency({...newAgency, max_agents: seats})}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${newAgency.max_agents === seats ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                      >
                        {seats} مشاور
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1 space-y-2">
                <label className="block text-xs font-bold text-purple-400">دوره اعتبار لایسنس:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { m: 1, label: '۱ ماهه' },
                    { m: 6, label: '۶ ماهه' },
                    { m: 12, label: '۱ ساله (سالانه)' }
                  ].map(item => (
                    <button 
                      key={item.m} onClick={() => setNewAgency({...newAgency, months: item.m})}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${newAgency.months === item.m ? 'bg-purple-600 border-purple-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>فرمول: {newAgency.plan_type === 'solo' ? '۱ کاربر مستقل × ۵۰۰ هزار تومان' : `(${newAgency.max_agents} مشاور + ۱ مدیر = ${totalSeats} صندلی) × ۵۰۰ هزار تومان`}</span>
                  <span className="font-bold text-slate-300 nums-fa">{formatPrice(monthlyPrice)} تومان / ماهانه</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                  <span className="text-xs font-bold text-slate-200">مبلغ کل لایسنس ({newAgency.months} ماهه):</span>
                  <span className="text-base font-bold text-emerald-400 nums-fa">{formatPrice(totalPrice)} تومان</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نام کاربری لاگین:</label>
                  <input type="text" value={newAgency.admin_username} onChange={e => setNewAgency({...newAgency, admin_username: e.target.value})} placeholder="user05180" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">رمز عبور اولیه:</label>
                  <input type="password" value={newAgency.admin_password} onChange={e => setNewAgency({...newAgency, admin_password: e.target.value})} placeholder="••••••" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setAddModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                انصراف
              </button>
              <button onClick={handleCreateAgency} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-rose-500/20">
                ایجاد اکانت و لایسنس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ MODAL 2: ویرایش */}
      {editModalOpen && editingAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <Edit className="w-5 h-5"/> ویرایش مشخصات {editingAgency.name}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نام آژانس / برند:</label>
                <input type="text" value={editingAgency.name} onChange={e => setEditingAgency({...editingAgency, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نام مالک:</label>
                <input type="text" value={editingAgency.owner_name} onChange={e => setEditingAgency({...editingAgency, owner_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">تلفن همراه:</label>
                  <input type="text" value={editingAgency.phone} onChange={e => setEditingAgency({...editingAgency, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none nums-fa" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">ظرفیت صندلی‌ها:</label>
                  <input type="number" value={editingAgency.max_agents_allowed} onChange={e => setEditingAgency({...editingAgency, max_agents_allowed: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold outline-none nums-fa" dir="ltr" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                انصراف
              </button>
              <button onClick={handleSaveEditAgency} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/20">
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 MODAL 3: تمدید لایسنس */}
      {extendModalOpen && selectedAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-emerald-400"/> تمدید لایسنس {selectedAgency.name}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">افزایش زمان لایسنس:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[6, 12, 24].map(m => (
                    <button key={m} onClick={() => setAddMonths(m)} className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${addMonths === m ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                      {m} ماه
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">افزایش صندلی مشاور (Seats):</label>
                <input type="number" value={addSeats} onChange={e => setAddSeats(Number(e.target.value))} placeholder="تعداد صندلی اضافه" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none nums-fa" dir="ltr" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setExtendModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                انصراف
              </button>
              <button onClick={handleExtendLicense} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20">
                ثبت تمدید
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}