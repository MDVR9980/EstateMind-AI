import { useState, useEffect } from 'react';
import { 
  Wallet, Calculator, Handshake, DownloadCloud, 
  ArrowUpRight, Home, Key, X, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { formatPrice, formatInputToNumber, numberToPersianWords } from '../utils/numberFormat';

export default function Financials() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ total_revenue: 0, agent_share: 0, office_share: 0 });
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  
  // Form States
  const [formData, setFormData] = useState({
    client_id: '',
    property_id: '',
    deal_type: 'فروش',
    deal_price: '',
    commission: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/deals/app-financials');
      if (res.data.status === 'success') {
        setStats(res.data.stats);
        setDeals(res.data.recent_deals);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openDealModal = async () => {
    setModalOpen(true);
    try {
      const [clientRes, propRes] = await Promise.all([
        api.get('/api/clients/app-list'),
        api.get('/api/properties/app-list')
      ]);
      setClients(clientRes.data.clients || []);
      setProperties(propRes.data.properties || []);
    } catch (error) {
      console.error("Error fetching form data");
    }
  };

  const calculateCommission = async () => {
    if(!window.confirm('آیا کمیسیون مشاوران بر اساس قراردادهای این ماه محاسبه شود؟')) return;
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await api.post('/api/deals/calculate-monthly', { year_month: currentMonth });
      alert('سهم مشاورین برای این ماه با موفقیت بروزرسانی شد.');
    } catch (e) {
      alert('خطا: فقط مدیر شعبه دسترسی دارد.');
    }
  };

  const submitDeal = async () => {
    if (!formData.client_id || !formData.deal_price || !formData.commission) {
      return alert('مشتری، مبلغ معامله و کمیسیون الزامی است.');
    }
    setIsSubmitting(true);
    try {
      const payload = {
        client_id: parseInt(formData.client_id),
        property_id: formData.property_id ? parseInt(formData.property_id) : 0,
        deal_type: formData.deal_type,
        deal_price: formatInputToNumber(formData.deal_price),
        commission_amount: formatInputToNumber(formData.commission)
      };
      const res = await api.post('/api/deals/add', payload);
      if (res.data.status === 'success') {
        alert('قرارداد با موفقیت در سیستم مالی ثبت شد!');
        setModalOpen(false);
        setFormData({ client_id: '', property_id: '', deal_type: 'فروش', deal_price: '', commission: '' });
        fetchFinancials();
      }
    } catch (e) {
      alert('مشکلی در ثبت قرارداد پیش آمد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = (dealId: number) => {
    window.open(`http://127.0.0.1:8000/api/deals/${dealId}/contract-pdf`, '_blank');
  };

  const isManager = user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="text-emerald-500 w-6 h-6" /> گزارشات مالی و کمیسیون‌ها
          </h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت تراکنش‌ها و سهم‌بندی اتوماتیک درآمد</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isManager && (
            <button onClick={calculateCommission} className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
              <Calculator className="w-4 h-4" /> محاسبه حقوق پرسنل
            </button>
          )}
          <button onClick={openDealModal} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
            <Handshake className="w-4 h-4" /> ثبت قرارداد جدید
          </button>
        </div>
      </div>

      {/* کارت بزرگ مالی */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-6 lg:p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-right">
            <p className="text-sm font-bold text-emerald-500/80 mb-2 flex items-center justify-center md:justify-start gap-2">
              <Wallet className="w-4 h-4" /> مجموع درآمدزایی شعبه (کمیسیون)
            </p>
            <p className="text-4xl lg:text-5xl font-bold text-slate-100 nums-fa" dir="ltr">
              {formatPrice(stats.total_revenue)} <span className="text-lg text-slate-500 font-normal">تومان</span>
            </p>
          </div>

          <div className="hidden md:block w-px h-24 bg-slate-700/50"></div>

          <div className="flex w-full md:w-auto gap-8 justify-center">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 mb-2">سهم شما (مشاور)</p>
              <p className="text-xl font-bold text-emerald-400 nums-fa">{formatPrice(stats.agent_share)}</p>
            </div>
            <div className="w-px h-12 bg-slate-700/50"></div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 mb-2">سهم آژانس (دفتر)</p>
              <p className="text-xl font-bold text-blue-400 nums-fa">{formatPrice(stats.office_share)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* جدول تراکنش‌ها */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-5 lg:p-6 border-b border-slate-700/50">
          <div>
            <h3 className="text-base font-bold text-slate-100">تراکنش‌های اخیر</h3>
            <p className="text-xs text-slate-500 mt-1">قراردادهای ثبت شده در سیستم</p>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : deals.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-slate-500 text-sm">هیچ تراکنشی یافت نشد.</div>
          ) : (
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/30">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400">کد تراکنش</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400">نوع</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400">کمیسیون</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400">تاریخ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400">رسید</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((t) => (
                  <tr key={t.id} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-400 nums-fa">TXN-{t.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-200 flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${t.type.includes('فروش') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {t.type.includes('فروش') ? <Home className="w-4 h-4"/> : <Key className="w-4 h-4"/>}
                      </div>
                      {t.type}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-400 nums-fa">{formatPrice(t.commission)}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 nums-fa" dir="ltr">{t.date}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDownloadPDF(t.id)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                        <DownloadCloud className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================================== */}
      {/* MODAL: ثبت قرارداد */}
      {/* ================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2"><Handshake className="w-5 h-5"/> ثبت قرارداد جدید</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-rose-400"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">مشتری خریدار/مستاجر <span className="text-rose-500">*</span></label>
                <select 
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب از قیف فروش --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">فایل ملک مرتبط (اختیاری)</label>
                <select 
                  value={formData.property_id} onChange={e => setFormData({...formData, property_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب فایل از بانک --</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع قرارداد</label>
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button onClick={()=>setFormData({...formData, deal_type: 'فروش'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.deal_type === 'فروش' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}>خرید و فروش</button>
                  <button onClick={()=>setFormData({...formData, deal_type: 'رهن و اجاره'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.deal_type === 'رهن و اجاره' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}>رهن و اجاره</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">مبلغ کل معامله (تومان) <span className="text-rose-500">*</span></label>
                <input type="text" value={formData.deal_price} onChange={e=>setFormData({...formData, deal_price: formatPrice(formatInputToNumber(e.target.value))})} placeholder="مثال: 5,000,000,000" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 nums-fa" dir="ltr" />
                {formData.deal_price && <p className="text-slate-400 text-xs font-bold mt-2 text-right">{numberToPersianWords(formatInputToNumber(formData.deal_price))}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-2">کمیسیون دریافتی (تومان) <span className="text-rose-500">*</span></label>
                <input type="text" value={formData.commission} onChange={e=>setFormData({...formData, commission: formatPrice(formatInputToNumber(e.target.value))})} placeholder="مجموع دریافتی از طرفین" className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-4 py-3 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 nums-fa" dir="ltr" />
                {formData.commission && <p className="text-emerald-400 text-xs font-bold mt-2 text-right">{numberToPersianWords(formatInputToNumber(formData.commission))}</p>}
              </div>

              <button onClick={submitDeal} disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all mt-4 flex justify-center items-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><CheckCircle2 className="w-5 h-5"/> ثبت نهایی تراکنش</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}