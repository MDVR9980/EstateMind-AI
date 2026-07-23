import { useState, useEffect } from 'react';
import { 
  Search, Sparkles, Map as MapIcon, Plus, Bot, LogIn, 
  Share2, Calculator, Sofa, Eye, Target, Edit, Trash2, 
  CheckCircle2, XCircle, Building2, MapPin, RefreshCcw
} from 'lucide-react';
import api from '../services/api';

export default function Properties({ setActiveMenu }: { setActiveMenu: (m: string) => void }) {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'trash'>('active');
  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [trashProps, setTrashProps] = useState<any[]>([]); // 🌟 استیت زباله‌دان
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes, trashRes] = await Promise.all([
        api.get('/api/properties/app-list'),
        api.get('/api/properties/pending-list'),
        api.get('/api/properties/trash-list') // دریافت لیست زباله‌دان
      ]);
      setActiveProps(activeRes.data.properties || []);
      setPendingProps(pendingRes.data.properties || []);
      setTrashProps(trashRes.data.properties || []);
    } catch (error) {
      console.error("Error fetching properties", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان' : 'توافقی';
  };

  // انتقال به زباله‌دان (سافت دیلیت)
  const handleMoveToTrash = async (id: number) => {
    if(!window.confirm('این فایل به زباله‌دان منتقل می‌شود. ادامه می‌دهید؟')) return;
    try {
      await api.put(`/api/properties/${id}/trash`);
      fetchProperties();
    } catch (e) {
      alert("خطا در انتقال به زباله‌دان");
    }
  };

  // بازیابی از زباله‌دان
  const handleRestore = async (id: number) => {
    try {
      await api.put(`/api/properties/${id}/restore`);
      alert("فایل با موفقیت بازیابی شد.");
      fetchProperties();
    } catch (e) {
      alert("خطا در بازیابی");
    }
  };

  // حذف دائم (فقط از داخل زباله‌دان یا ربات امکان‌پذیر است)
  const handlePermanentDelete = async (id: number, isPending = false) => {
    if(!window.confirm('آیا از حذف دائم و غیرقابل بازگشت این فایل مطمئن هستید؟')) return;
    try {
      const endpoint = isPending ? `/api/properties/pending/${id}` : `/api/properties/${id}`;
      await api.delete(endpoint);
      fetchProperties();
    } catch (e) {
      alert("خطا در حذف دائم فایل");
    }
  };

  const displayData = activeTab === 'active' ? activeProps : activeTab === 'pending' ? pendingProps : trashProps;
  const filteredData = displayData.filter(p => p.title?.includes(searchQuery) || p.neighborhood?.includes(searchQuery));

  return (
    <div className="animate-fade-in-up">
      {/* هدر صفحه و اکشن‌های سراسری */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="text-emerald-500 w-6 h-6" />
            بانک اطلاعات املاک و شووروم
          </h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت فایل‌ها، فیلتر پیشرفته و تطابق با مشتریان</p>
        </div>
        
        <div onClick={() => setActiveMenu('add_property')} className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4" /> ثبت فایل جدید
          </button>
          <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Bot className="w-4 h-4" /> بیدار کردن ربات خزنده
          </button>
          <button className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <LogIn className="w-4 h-4" /> لاگین در دیوار
          </button>
        </div>
      </div>

      {/* جستجوی هوشمند و تب‌ها */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <input 
              type="text" 
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="جستجوی عامیانه با هوش مصنوعی (مثال: یه خونه نورگیر سمت سجاد...)"
              className="w-full bg-purple-500/5 border border-purple-500/20 rounded-xl pr-10 pl-4 py-3 text-sm text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:border-purple-500/50 transition-all"
            />
            <button className="absolute inset-y-1.5 left-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white px-4 rounded-lg text-xs font-bold transition-all shadow-lg shadow-purple-500/30">
              بگرد
            </button>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-500" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، محله..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl w-fit">
          <button onClick={() => setActiveTab('active')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            فایل‌های فعال ({activeProps.length})
          </button>
          <button onClick={() => setActiveTab('pending')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            صندوق ربات ({pendingProps.length})
          </button>
          {/* 🌟 تب زباله‌دان 🌟 */}
          <button onClick={() => setActiveTab('trash')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'trash' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            زباله‌دان ({trashProps.length})
          </button>
        </div>
      </div>

      {/* گرید املاک */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">فایلی یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredData.map((prop) => {
            let img = '';
            try { const imgs = JSON.parse(prop.image_urls); if(imgs.length>0) img = `http://127.0.0.1:8000${imgs[0]}`; } catch(e){}

            return (
              <div key={prop.id} className={`group border rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col ${activeTab === 'trash' ? 'bg-slate-900/50 border-rose-900/50 opacity-80' : 'bg-slate-800 border-slate-700/50 hover:border-slate-500/50'}`}>
                {/* عکس و نشان‌ها */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  {img ? (
                    <img src={img} alt={prop.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800"><Building2 className="w-10 h-10 text-slate-600" /></div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md border ${prop.is_exclusive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                      {prop.is_exclusive ? '🔒 شخصی' : '👁️ عمومی'}
                    </span>
                  </div>
                </div>

                {/* اطلاعات اصلی */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-slate-100 mb-2 line-clamp-1">{prop.title}</h3>
                  <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {prop.neighborhood}</span>
                    <span className="bg-slate-700/50 px-2 py-1 rounded text-slate-300">{prop.built_area} متر</span>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-1">قیمت کل:</p>
                    <p className="text-lg font-bold text-emerald-400 nums-fa">{formatPrice(prop.price_total)}</p>
                  </div>

                  {/* دکمه‌های عملیاتی */}
                  <div className="mt-auto pt-2 border-t border-slate-700/50">
                    
                    {activeTab === 'trash' ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button onClick={() => handleRestore(prop.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5">
                          <RefreshCcw className="w-3.5 h-3.5"/> بازیابی فایل
                        </button>
                        <button onClick={() => handlePermanentDelete(prop.id, false)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5"/> حذف دائم
                        </button>
                      </div>
                    ) : (
                      <>
                        <button className="w-full mb-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2">
                          <Calculator className="w-4 h-4"/> کارشناسی قیمت (CMA)
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5">
                            <Eye className="w-3.5 h-3.5"/> کاتالوگ
                          </button>
                          
                          {/* دکمه زباله‌دان به جای حذف دائم */}
                          <button onClick={() => handleMoveToTrash(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5"/> زباله‌دان
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}