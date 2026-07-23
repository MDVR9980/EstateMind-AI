import { useState, useEffect } from 'react';
import { 
  Search, Sparkles, Plus, Bot, LogIn, 
  Calculator, Eye, Trash2, Building2, MapPin, RefreshCcw, Lock, Globe, Layers, Filter
} from 'lucide-react';
import api from '../services/api';
import { formatPrice } from '../utils/numberFormat';

export default function Properties({ setActiveMenu }: { setActiveMenu: (m: string) => void }) {
  // تب‌های اصلی
  const [mainTab, setMainTab] = useState<'active' | 'pending' | 'trash'>('active');
  
  // 🌟 زیر‌تب‌های فایل‌های فعال (ترکیبی / فقط شخصی / فقط عمومی)
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');
  
  // 🌟 فیلترهای دسته‌بندی سریع (Chips)
  const [categoryFilter, setCategoryFilter] = useState<string>('همه');

  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [trashProps, setTrashProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');

  // کنترل مودال بیدار کردن ربات دیوار (با قابلیت انتخاب تعداد)
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [botCount, setBotCount] = useState(50);
  const [isBotStarting, setIsBotStarting] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes, trashRes] = await Promise.allSettled([
        api.get('/api/properties/app-list'),
        api.get('/api/properties/pending-list'),
        api.get('/api/properties/trash-list')
      ]);

      if (activeRes.status === 'fulfilled') {
        setActiveProps(activeRes.value.data.properties || []);
      }
      if (pendingRes.status === 'fulfilled') {
        setPendingProps(pendingRes.value.data.properties || []);
      }
      if (trashRes.status === 'fulfilled') {
        setTrashProps(trashRes.value.data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching properties", error);
    } finally {
      setLoading(false);
    }
  };

  // بیدار کردن ربات دیوار با تعداد دلخواه
  const handleStartCrawler = async () => {
    setIsBotStarting(true);
    try {
      const res = await api.post('/api/crawler/start', { target_count: botCount, city: "mashhad" });
      alert(res.data.message);
      setBotModalOpen(false);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || "خطا در بیدار کردن ربات";
      alert(errorMsg);
    } finally {
      setIsBotStarting(false);
    }
  };

  const handleDivarLogin = async () => {
    try {
      const res = await api.post('/api/crawler/divar-login');
      alert(res.data.message);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || "خطا در باز کردن مرورگر دیوار";
      alert(errorMsg);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.put(`/api/properties/${id}/restore`);
      alert("فایل با موفقیت بازیابی شد.");
      fetchProperties();
    } catch (e) { alert("خطا در بازیابی"); }
  };

  const handlePermanentDelete = async (id: number, isPending = false) => {
    if(!window.confirm('آیا از حذف دائم و غیرقابل بازگشت این فایل مطمئن هستید؟')) return;
    try {
      const endpoint = isPending ? `/api/properties/pending/${id}` : `/api/properties/${id}`;
      await api.delete(endpoint);
      fetchProperties();
    } catch (e) { alert("خطا در حذف دائم فایل"); }
  };

  // 🧠 منطق فیلتر چند لایه پیشرفته (پابلیک/پرایوت + دسته‌بندی + سرچ)
  const getFilteredData = () => {
    let rawList = mainTab === 'active' ? activeProps : mainTab === 'pending' ? pendingProps : trashProps;

    // ۱. فیلتر حریم خصوصی (فقط برای فایل‌های فعال)
    if (mainTab === 'active') {
      if (privacyFilter === 'private') rawList = rawList.filter(p => p.is_exclusive === true);
      else if (privacyFilter === 'public') rawList = rawList.filter(p => p.is_exclusive === false);
    }

    // ۲. فیلتر دسته‌بندی و نوع معامله
    if (categoryFilter !== 'همه') {
      if (categoryFilter === 'آپارتمان') rawList = rawList.filter(p => p.property_type === 'آپارتمان' || p.property_type === 'apartment');
      else if (categoryFilter === 'ویلایی') rawList = rawList.filter(p => p.property_type === 'ویلایی' || p.property_type === 'villa');
      else if (categoryFilter === 'زمین و کلنگی') rawList = rawList.filter(p => p.property_type?.includes('زمین') || p.property_type?.includes('کلنگی') || p.property_type === 'land');
      else if (categoryFilter === 'فروش') rawList = rawList.filter(p => p.deal_type === 'فروش' || p.deal_type === 'SALE');
      else if (categoryFilter === 'اجاره') rawList = rawList.filter(p => p.deal_type === 'رهن و اجاره' || p.deal_type === 'RENT');
    }

    // ۳. فیلتر جستجوی متنی
    if (searchQuery) {
      rawList = rawList.filter(p => p.title?.includes(searchQuery) || p.neighborhood?.includes(searchQuery));
    }

    return rawList;
  };

  const filteredProperties = getFilteredData();

  return (
    <div className="animate-fade-in-up pb-20">
      {/* هدر اصلی و دکمه‌های اکشن */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="text-emerald-500 w-6 h-6" /> بانک اطلاعات املاک و شووروم
          </h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت فایل‌ها، فیلتر پیشرفته و هماهنگی با ربات دیوار</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setActiveMenu('add_property')} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4" /> ثبت فایل جدید
          </button>
          <button onClick={() => setBotModalOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Bot className="w-4 h-4 text-emerald-400" /> بیدار کردن ربات خزنده
          </button>
          <button onClick={() => api.post('/api/crawler/divar-login')} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <LogIn className="w-4 h-4" /> لاگین در دیوار
          </button>
        </div>
      </div>

      {/* سرچ‌بار هوشمند و فیلترها */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 mb-6 shadow-2xl space-y-4">
        
        {/* اینپوت‌های سرچ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input 
              type="text" 
              value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
              placeholder="جستجوی عامیانه با هوش مصنوعی (مثال: یه خونه نورگیر سمت سجاد...)"
              className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl pr-10 pl-20 py-3 text-xs text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:border-purple-500 transition-all"
            />
            <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20">
              بگرد
            </button>
          </div>
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، محله..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* 🌟 بخش اصلی تب‌ها و فیلترهای حریم خصوصی 🌟 */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
          
          {/* تب‌های اصلی (فعال / صندوق ربات / زباله‌دان) */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 w-full lg:w-auto">
            <button onClick={() => setMainTab('active')} className={`flex-1 lg:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${mainTab === 'active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
              فایل‌های فعال ({activeProps.length})
            </button>
            <button onClick={() => setMainTab('pending')} className={`flex-1 lg:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${mainTab === 'pending' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
              صندوق ربات ({pendingProps.length})
            </button>
            <button onClick={() => setMainTab('trash')} className={`flex-1 lg:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${mainTab === 'trash' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-slate-200'}`}>
              زباله‌دان ({trashProps.length})
            </button>
          </div>

          {/* 🌟 زیر‌تب‌های خصوصی / عمومی (فقط اگر تب فعال انتخاب شده باشد) 🌟 */}
          {mainTab === 'active' && (
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full lg:w-auto">
              <button onClick={() => setPrivacyFilter('all')} className={`flex-1 lg:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${privacyFilter === 'all' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                ترکیبی (همه)
              </button>
              <button onClick={() => setPrivacyFilter('private')} className={`flex-1 lg:flex-initial flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${privacyFilter === 'private' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                <Lock className="w-3 h-3" /> فقط شخصی
              </button>
              <button onClick={() => setPrivacyFilter('public')} className={`flex-1 lg:flex-initial flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${privacyFilter === 'public' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                <Globe className="w-3 h-3" /> فقط عمومی
              </button>
            </div>
          )}
        </div>

        {/* 🌟 چیپ‌های فیلتر سریع دسته و معامله (دید Bolt.new) 🌟 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <span className="text-xs text-slate-500 font-bold ml-2 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> دسته:</span>
          {['همه', 'آپارتمان', 'ویلایی', 'زمین و کلنگی', 'فروش', 'اجاره'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${categoryFilter === cat ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* گرید نمایش املاک */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <Building2 className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm font-bold">هیچ فایلی با مشخصات انتخابی یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map((prop) => {
            let img = '';
            try { const imgs = JSON.parse(prop.image_urls); if(imgs.length>0) img = `http://127.0.0.1:8000${imgs[0]}`; } catch(e){}

            return (
              <div key={prop.id} className={`group border rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col ${mainTab === 'trash' ? 'bg-slate-900/50 border-rose-900/50 opacity-80' : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'}`}>
                
                {/* عکس و نشان‌ها */}
                <div className="relative h-48 bg-slate-950 overflow-hidden">
                  {img ? (
                    <img src={img} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900"><Building2 className="w-10 h-10 text-slate-700" /></div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`px-3 py-1 rounded-xl text-[11px] font-bold backdrop-blur-md border ${prop.is_exclusive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                      {prop.is_exclusive ? '🔒 شخصی' : '👁️ عمومی'}
                    </span>
                  </div>
                </div>

                {/* اطلاعات اصلی */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-slate-100 mb-2 line-clamp-1">{prop.title}</h3>
                  
                  <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {prop.neighborhood}</span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 font-mono nums-fa">{prop.built_area} متر</span>
                  </div>

                  <div className="mb-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                    <p className="text-[11px] text-slate-500 mb-1">قیمت کل:</p>
                    <p className="text-base font-bold text-emerald-400 nums-fa">{formatPrice(prop.price_total)}</p>
                  </div>

                  {/* اکشن‌ها */}
                  <div className="mt-auto pt-3 border-t border-slate-800/80">
                    {mainTab === 'trash' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleRestore(prop.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <RefreshCcw className="w-3.5 h-3.5"/> بازیابی
                        </button>
                        <button onClick={() => handlePermanentDelete(prop.id, false)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Trash2 className="w-3.5 h-3.5"/> حذف دائم
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-blue-400"/> کاتالوگ
                        </button>
                        <button onClick={() => handleMoveToTrash(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Trash2 className="w-3.5 h-3.5"/> زباله‌دان
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🤖 مودال تنظیم تعداد فایل‌ها برای ربات دیوار */}
      {botModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" /> تنظیمات اسکن ربات دیوار
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              تعداد فایل‌های غیرتکراری مدنظرتان را مشخص کنید. ربات دیوار را اسکن کرده و فایل‌ها را وارد صندوق می‌کند.
            </p>

            <div className="space-y-4 mb-6">
              <label className="block text-xs font-bold text-slate-300">تعداد فایل هدف:</label>
              <div className="grid grid-cols-3 gap-3">
                {[20, 50, 100].map(count => (
                  <button 
                    key={count} 
                    onClick={() => setBotCount(count)}
                    className={`py-3 rounded-2xl text-xs font-bold border transition-all ${botCount === count ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    {count} فایل
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setBotModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                انصراف
              </button>
              <button onClick={handleStartCrawler} disabled={isBotStarting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                {isBotStarting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'استارت ربات'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}