import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Plus, RefreshCcw, 
  Calendar, Power, X, Users, ChevronDown, ChevronUp, Edit, User, Phone, MapPin
} from 'lucide-react';
import api from '../services/api';
import { formatPrice, toJalaliDate } from '../utils/numberFormat';

export default function SuperAdmin() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // استیت باز/بسته بودن اکاردئون اعضا
  const [expandedAgencyId, setExpandedAgencyId] = useState<number | null>(null);

  // 🤖 ساخت آژانس
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    agency_name: '', owner_name: '', phone: '', city: 'مشهد',
    max_agents: 5, months: 1, admin_username: '', admin_password: ''
  });

  // ✏️ ویرایش آژانس
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<any>(null);

  // 🔄 تمدید لایسنس
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
      fetchAgencies();
    } catch (e) { alert("خطا در تغییر وضعیت آژانس"); }
  };

  const handleCreateAgency = async () => {
    if (!newAgency.agency_name || !newAgency.admin_username || !newAgency.admin_password || !newAgency.phone) {
      return alert("لطفاً تمام فیلدهای الزامی را پر کنید.");
    }
    try {
      const res = await api.post('/api/super-admin/agencies/add', newAgency);
      alert(res.data.message);
      setAddModalOpen(false);
      setNewAgency({ agency_name: '', owner_name: '', phone: '', city: 'مشهد', max_agents: 5, months: 1, admin_username: '', admin_password: '' });
      fetchAgencies();
    } catch (e: any) {
      alert(`⚠️ ${e.response?.data?.detail || "خطا در ساخت آژانس"}`);
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
      alert("اطلاعات آژانس با موفقیت ویرایش شد.");
      setEditModalOpen(false);
      fetchAgencies();
    } catch (e) {
      alert("خطا در ثبت ویرایش");
    }
  };

  const handleExtendLicense = async () => {
    if (!selectedAgency) return;
    try {
      await api.put(`/api/super-admin/agencies/${selectedAgency.id}/extend`, {
        add_months: addMonths,
        add_seats: addSeats
      });
      alert("لایسنس آژانس با موفقیت تمدید شد.");
      setExtendModalOpen(false);
      fetchAgencies();
    } catch (e) { alert("خطا در تمدید لایسنس"); }
  };

  const totalSeats = newAgency.max_agents + 1;
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
          <p className="text-sm text-slate-400 mt-1">مدیریت لایسنس آژانس‌ها، ظرفیت مشاورین و تمدید اشتراک‌ها</p>
        </div>

        <button 
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" /> راه‌اندازی آژانس جدید
        </button>
      </div>

      {/* لیست آژانس‌ها */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : agencies.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">هیچ آژانسی در سیستم ثبت نشده است.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agencies.map((agency) => {
            const isExpanded = expandedAgencyId === agency.id;

            return (
              <div key={agency.id} className={`bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${!agency.subscription_active || agency.is_expired ? 'border-rose-500/40 opacity-75' : 'border-slate-800 hover:border-slate-700'}`}>
                
                <div>
                  {/* عنوان آژانس و وضعیت فعال بودن */}
                  <div className="flex items-start justify-between mb-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        {agency.name}
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">کد: #{agency.id}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">مدیر: {agency.owner_name} ({agency.phone})</p>
                    </div>
                    <button 
                      onClick={() => handleToggleAgency(agency.id)}
                      className={`p-2 rounded-xl transition-all ${agency.subscription_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>

                  {/* آمار صندلی‌ها و سررسید شمسی */}
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

                    {/* 🌟 نمایش تاریخ شمسی کامل و فارسی 🌟 */}
                    <div className="flex items-center justify-between text-xs pt-2">
                      <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-400"/> سررسید لایسنس:</span>
                      <span className={`font-bold ${agency.is_expired ? 'text-rose-400' : 'text-slate-200'}`}>
                        {toJalaliDate(agency.subscription_expires_at)}
                      </span>
                    </div>
                  </div>

                  {/* 🌟 بخش کشویی اعضا و مشاوران فعلی 🌟 */}
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
                                <p className="font-bold text-slate-200">{u.full_name}</p>
                                <p className="text-slate-500 font-mono nums-fa" dir="ltr">{u.username}</p>
                              </div>
                              <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-bold">{u.role_fa}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-slate-500 text-center py-2">عضوی ثبت نشده است.</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* دکمه‌های تمدید و ویرایش */}
                <div className="grid grid-cols-2 gap-2 pt-2">
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
                <Building2 className="w-5 h-5"/> راه‌اندازی آژانس جدید و صدور لایسنس
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نام آژانس:</label>
                  <input type="text" value={newAgency.agency_name} onChange={e => setNewAgency({...newAgency, agency_name: e.target.value})} placeholder="مسکن رویال" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نام مدیر آژانس:</label>
                  <input type="text" value={newAgency.owner_name} onChange={e => setNewAgency({...newAgency, owner_name: e.target.value})} placeholder="داوود رجائی" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none focus:border-rose-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">تلفن همراه مدیر:</label>
                  <input type="text" value={newAgency.phone} onChange={e => setNewAgency({...newAgency, phone: e.target.value})} placeholder="0915..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none nums-fa" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">شهر:</label>
                  <input type="text" value={newAgency.city} onChange={e => setNewAgency({...newAgency, city: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-emerald-400">ظرفیت صندلی مشاوران (Seats):</label>
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
                  <span>فرمول: ({newAgency.max_agents} مشاور + ۱ مدیر) × ۵۰۰ هزار تومان</span>
                  <span className="font-bold text-slate-300 nums-fa">{formatPrice(monthlyPrice)} تومان / ماهانه</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                  <span className="text-xs font-bold text-slate-200">مبلغ کل لایسنس ({newAgency.months} ماهه):</span>
                  <span className="text-base font-bold text-emerald-400 nums-fa">{formatPrice(totalPrice)} تومان</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نام کاربری لاگین مدیر:</label>
                  <input type="text" value={newAgency.admin_username} onChange={e => setNewAgency({...newAgency, admin_username: e.target.value})} placeholder="mdvr05180" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
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
                ایجاد آژانس و لایسنس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ 🌟 MODAL 2: ویرایش آژانس */}
      {editModalOpen && editingAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <Edit className="w-5 h-5"/> ویرایش اطلاعات {editingAgency.name}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نام آژانس:</label>
                <input type="text" value={editingAgency.name} onChange={e => setEditingAgency({...editingAgency, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نام مدیر آژانس:</label>
                <input type="text" value={editingAgency.owner_name} onChange={e => setEditingAgency({...editingAgency, owner_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">تلفن تماس:</label>
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