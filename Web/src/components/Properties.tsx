import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, Plus, Bot, LogIn, 
  Calculator, Eye, Trash2, Building2, MapPin, RefreshCcw, Lock, Globe, 
  Share2, Edit, CheckCircle2, Users, Megaphone, Copy, Check, X,
  ChevronLeft, ChevronRight, UploadCloud, Map as MapIcon, Grid
} from 'lucide-react';
import api from '../services/api';
import { formatPrice, numberToPersianWords } from '../utils/numberFormat';

export default function Properties({ setActiveMenu }: { setActiveMenu: (m: string) => void }) {
  // تب‌های اصلی
  const [mainTab, setMainTab] = useState<'active' | 'pending' | 'trash'>('active');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('همه');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // داده‌ها
  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [trashProps, setTrashProps] = useState<any[]>([]);
  const [mapItems, setMapItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // اینپوت ایندکس عکس برای کارت‌ها { propertyId: currentIndex }
  const [cardImageIndex, setCardImageIndex] = useState<{ [key: number]: number }>({});

  // سرچ‌ها
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');

  // 🤖 مودال ربات دیوار
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [botCount, setBotCount] = useState(50);
  const [isBotStarting, setIsBotStarting] = useState(false);

  // 📣 مودال تایید انتشار دیوار
  const [divarConfirmModal, setDivarConfirmModal] = useState<any>(null);

  // ⚖️ مودال CMA
  const [cmaModalOpen, setCmaModalOpen] = useState(false);
  const [cmaData, setCmaData] = useState<any>(null);
  const [cmaLoading, setCmaLoading] = useState(false);

  // 📱 مودال QR Code و کاتالوگ
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPropForQr, setSelectedPropForQr] = useState<any>(null);
  const [copiedLink, setCopyLinkSuccess] = useState(false);

  // 🚀 مودال انتشار در شبکه‌ها (واتساپ، تلگرام، بله، روبیکا و...)
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [selectedPropForSocial, setSelectedPropForSocial] = useState<any>(null);

  // 🎯 مودال مچینگ خریداران
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedBuyers, setMatchedBuyers] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  // ✏️ مودال ویرایش پیشرفته رسانه و فایل
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<any>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // رفرنس نقشه Leaflet
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (viewMode === 'map') {
      fetchMapData();
    }
  }, [viewMode]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes, trashRes] = await Promise.allSettled([
        api.get('/api/properties/app-list'),
        api.get('/api/properties/pending-list'),
        api.get('/api/properties/trash-list')
      ]);

      if (activeRes.status === 'fulfilled') setActiveProps(activeRes.value.data.properties || []);
      if (pendingRes.status === 'fulfilled') setPendingProps(pendingRes.value.data.properties || []);
      if (trashRes.status === 'fulfilled') setTrashProps(trashRes.value.data.properties || []);
    } catch (error) {
      console.error("Error fetching properties", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapData = async () => {
    try {
      const res = await api.get('/api/properties/map-data');
      if (res.data.status === 'success') {
        setMapItems(res.data.data);
        initLeafletMap(res.data.data);
      }
    } catch (e) { console.error("Map fetch error", e); }
  };

  const initLeafletMap = (data: any[]) => {
    if (!mapContainerRef.current) return;

    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => renderMapMarkers(data);
      document.body.appendChild(script);
    } else {
      renderMapMarkers(data);
    }
  };

  const renderMapMarkers = (data: any[]) => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (mapInstanceRef.current) mapInstanceRef.current.remove();

    const map = L.map(mapContainerRef.current).setView([36.315, 59.540], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    data.forEach((item, index) => {
      let lat = 36.315 + (index % 5) * 0.005;
      let lng = 59.540 + (index % 4) * 0.005;
      
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`
        <div style="direction: rtl; text-align: right; font-family: Vazirmatn, sans-serif;">
          <h4 style="font-weight: bold; margin-bottom: 5px; color: #0f172a;">${item.title}</h4>
          <p style="margin: 0; color: #10b981; font-weight: bold;">${item.price}</p>
          <p style="margin-top: 3px; font-size: 11px; color: #64748b;">محله: ${item.neighborhood}</p>
        </div>
      `);
    });
  };

  // کنترل اسلایدر عکس روی کارت
  const handlePrevImage = (propId: number, maxImages: number) => {
    setCardImageIndex(prev => ({
      ...prev,
      [propId]: (prev[propId] || 0) === 0 ? maxImages - 1 : (prev[propId] || 0) - 1
    }));
  };

  const handleNextImage = (propId: number, maxImages: number) => {
    setCardImageIndex(prev => ({
      ...prev,
      [propId]: (prev[propId] || 0) === maxImages - 1 ? 0 : (prev[propId] || 0) + 1
    }));
  };

  // ==========================================
  // توابع عملیاتی واقعی (تک تک دکمه‌ها)
  // ==========================================

  const handleStartCrawler = async () => {
    setIsBotStarting(true);
    try {
      const res = await api.post('/api/crawler/start', { target_count: botCount, city: "mashhad" });
      alert(res.data.message);
      setBotModalOpen(false);
      fetchProperties();
    } catch (e: any) {
      alert(e.response?.data?.detail || "خطا در بیدار کردن ربات");
    } finally { setIsBotStarting(false); }
  };

  const handleDivarLogin = async () => {
    try {
      const res = await api.post('/api/crawler/divar-login');
      alert(res.data.message);
    } catch (e: any) { alert("خطا در باز کردن مرورگر دیوار"); }
  };

  const handlePublishToDivar = async (id: number) => {
    try {
      const res = await api.post(`/api/crawler/publish-to-divar/${id}`);
      alert(res.data.message);
      setDivarConfirmModal(null);
    } catch (e: any) { alert("خطا در ارسال به دیوار"); }
  };

  const handleCMA = async (id: number) => {
    setCmaLoading(true);
    setCmaModalOpen(true);
    try {
      const res = await api.get(`/api/pricing/analyze/${id}`);
      setCmaData(res.data);
    } catch (e) {
      alert("خطا در کارشناسی قیمت");
      setCmaModalOpen(false);
    } finally { setCmaLoading(false); }
  };

  const handleAIEvaluation = async (id: number) => {
    try {
      const res = await api.post(`/api/properties/${id}/generate-ai-details`);
      alert(`✨ نتیجه ارزیابی هوشمند AI:\n\nنقاط قوت:\n${res.data.pros}\n\nنقاط ضعف:\n${res.data.cons}`);
      fetchProperties();
    } catch (e) { alert("خطا در ارزیابی هوشمند ملک"); }
  };

  const handleMakePublic = async (id: number) => {
    if (!window.confirm('آیا مایلید این ملک عمومی شده و برای تمام مشاوران آژانس قابل رویت باشد؟')) return;
    try {
      await api.put(`/api/properties/${id}/make-public`);
      alert("فایل عمومی شد.");
      fetchProperties();
    } catch (e) { alert("خطا در عمومی‌سازی فایل"); }
  };

  const handleApprovePending = async (id: number, isExclusive: boolean) => {
    try {
      await api.put(`/api/properties/${id}/approve`, { is_exclusive: isExclusive });
      alert("فایل با موفقیت تایید و وارد بانک املاک شد.");
      fetchProperties();
    } catch (e) { alert("خطا در تایید فایل"); }
  };

  const handleMoveToTrash = async (id: number) => {
    if (!window.confirm('این فایل به زباله‌دان منتقل می‌شود. موافقید؟')) return;
    try {
      await api.put(`/api/properties/${id}/trash`);
      fetchProperties();
    } catch (e) { alert("خطا در انتقال به زباله‌دان"); }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.put(`/api/properties/${id}/restore`);
      alert("فایل با موفقیت بازیابی شد.");
      fetchProperties();
    } catch (e) { alert("خطا در بازیابی فایل"); }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف دائم و غیرقابل بازگشت این فایل مطمئن هستید؟')) return;
    try {
      await api.delete(`/api/properties/${id}`);
      fetchProperties();
    } catch (e) { alert("خطا در حذف دائم فایل"); }
  };

  // ویرایش پیشرفته: باز کردن مودال
  const openEditModal = (prop: any) => {
    setEditingProp({ ...prop });
    let imgs: string[] = [];
    try { imgs = JSON.parse(prop.image_urls || "[]"); } catch (e) {}
    setEditingImages(imgs);
    setEditModalOpen(true);
  };

  // حذف عکس از گالری ویرایش
  const handleRemoveImageFromEdit = (index: number) => {
    setEditingImages(prev => prev.filter((_, i) => i !== index));
  };

  // آپلود فایل رسانه جدید در ویرایش
  const handleUploadNewMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !editingProp) return;
    setIsUploadingMedia(true);
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await api.post(`/api/properties/${editingProp.id}/upload-media`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.status === 'success') {
        setEditingImages(prev => [...prev, res.data.url]);
      }
    } catch (e) { alert("خطا در آپلود رسانه"); } finally { setIsUploadingMedia(false); }
  };

  // ذخیره ویرایش پیشرفته
  const handleSaveAdvancedEdit = async () => {
    if (!editingProp) return;
    try {
      await api.put(`/api/properties/${editingProp.id}/edit`, {
        title: editingProp.title,
        price_total: Number(editingProp.price_total),
        owner_phone: editingProp.owner_phone,
        ai_pros: editingProp.ai_pros,
        ai_cons: editingProp.ai_cons,
        image_urls: editingImages
      });
      alert("اطلاعات فایل و رسانه‌ها با موفقیت ویرایش شد.");
      setEditModalOpen(false);
      fetchProperties();
    } catch (e) { alert("خطا در ذخیره ویرایش"); }
  };

  // اشتراک‌گذاری شبکه پیام‌رسان‌ها
  const handleSocialShare = (platform: string) => {
    if (!selectedPropForSocial) return;
    const catalogUrl = `http://127.0.0.1:8000/catalog/property/${selectedPropForSocial.id}`;
    const text = `🏢 *${selectedPropForSocial.title}*\n📍 محله: ${selectedPropForSocial.neighborhood}\n💰 قیمت: ${formatPrice(selectedPropForSocial.price_total)}\n\nمشاهده تصاویر و جزئیات بیشتر:\n${catalogUrl}`;

    let url = '';
    if (platform === 'whatsapp') url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    else if (platform === 'telegram') url = `https://t.me/share/url?url=${encodeURIComponent(catalogUrl)}&text=${encodeURIComponent(text)}`;
    else if (platform === 'bale') url = `bale://share?text=${encodeURIComponent(text)}`;
    else if (platform === 'rubika') url = `rubika://share?text=${encodeURIComponent(text)}`;

    if (url) window.open(url, '_blank');
    else {
      navigator.clipboard.writeText(text);
      alert("متن آگهی کپی شد!");
    }
  };

  // 🧠 موتور فیلتر چند لایه پیشرفته
  const getFilteredData = () => {
    let rawList = mainTab === 'active' ? activeProps : mainTab === 'pending' ? pendingProps : trashProps;

    if (mainTab === 'active') {
      if (privacyFilter === 'private') rawList = rawList.filter(p => p.is_exclusive === true);
      else if (privacyFilter === 'public') rawList = rawList.filter(p => p.is_exclusive === false);
    }

    if (categoryFilter !== 'همه') {
      if (categoryFilter === 'آپارتمان') rawList = rawList.filter(p => p.property_type === 'آپارتمان' || p.property_type === 'apartment');
      else if (categoryFilter === 'ویلایی') rawList = rawList.filter(p => p.property_type === 'ویلایی' || p.property_type === 'villa');
      else if (categoryFilter === 'زمین و کلنگی') rawList = rawList.filter(p => p.property_type?.includes('زمین') || p.property_type?.includes('کلنگی') || p.property_type === 'land');
      else if (categoryFilter === 'پنت‌هاوس') rawList = rawList.filter(p => p.title?.includes('پنت') || p.description?.includes('پنت'));
      else if (categoryFilter === 'فروش') rawList = rawList.filter(p => p.deal_type === 'فروش' || p.deal_type === 'SALE');
      else if (categoryFilter === 'اجاره') rawList = rawList.filter(p => p.deal_type === 'رهن و اجاره' || p.deal_type === 'RENT');
    }

    if (searchQuery) {
      rawList = rawList.filter(p => p.title?.includes(searchQuery) || p.neighborhood?.includes(searchQuery));
    }

    return rawList;
  };

  const filteredProperties = getFilteredData();

  return (
    <div className="animate-fade-in-up pb-24" dir="rtl">
      
      {/* هدر اصلی */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="text-emerald-500 w-6 h-6" /> بانک اطلاعات املاک و شووروم
          </h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت فایل‌ها، فیلتر پیشرفته، نقشه تعاملی و ربات دیوار</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20">
            {viewMode === 'grid' ? <><MapIcon className="w-4 h-4"/> نمایش نقشه</> : <><Building2 className="w-4 h-4"/> نمایش کارت‌ها</>}
          </button>

          <button onClick={() => setActiveMenu('add_property')} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4" /> ثبت فایل جدید
          </button>

          <button onClick={() => setBotModalOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Bot className="w-4 h-4 text-emerald-400" /> بیدار کردن ربات خزنده
          </button>

          <button onClick={handleDivarLogin} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <LogIn className="w-4 h-4" /> لاگین در دیوار
          </button>
        </div>
      </div>

      {/* سرچ‌بار و فیلترها */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 mb-6 shadow-2xl space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input 
              type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
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
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، محله..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* تب‌ها و زیرتب‌های حریم خصوصی */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
          
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

        {/* چیپ‌های دسته‌بندی سریع */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <span className="text-xs text-slate-500 font-bold ml-2">دسته:</span>
          {['همه', 'آپارتمان', 'ویلایی', 'زمین و کلنگی', 'پنت‌هاوس', 'فروش', 'اجاره'].map((cat) => (
            <button
              key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${categoryFilter === cat ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* نمایش نقشه تعاملی */}
      {viewMode === 'map' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-[600px] relative">
          <div ref={mapContainerRef} className="w-full h-full z-10"></div>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <Building2 className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm font-bold">هیچ فایلی یافت نشد.</p>
        </div>
      ) : (
        /* گرید اصلی کارت‌های املاک */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => {
            let imgs: string[] = [];
            try { imgs = JSON.parse(prop.image_urls || "[]"); } catch(e) {}

            const activeImgIdx = cardImageIndex[prop.id] || 0;
            const currentImgUrl = imgs.length > 0 ? (imgs[activeImgIdx].startsWith('http') ? imgs[activeImgIdx] : `http://127.0.0.1:8000${imgs[activeImgIdx]}`) : '';

            return (
              <div key={prop.id} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col">
                
                {/* 🌟 بخش اسلایدر عکس و فیلم رو کارت 🌟 */}
                <div className="relative h-56 bg-slate-950 overflow-hidden group">
                  {currentImgUrl ? (
                    <img src={currentImgUrl} alt={prop.title} className="w-full h-full object-cover transition-all duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950"><Building2 className="w-12 h-12 text-slate-800" /></div>
                  )}

                  {/* دکمه‌های اسلاید چپ و راست */}
                  {imgs.length > 1 && (
                    <>
                      <button 
                        onClick={() => handlePrevImage(prop.id, imgs.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-950/70 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700 transition-all opacity-80 group-hover:opacity-100 z-10"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleNextImage(prop.id, imgs.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-950/70 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700 transition-all opacity-80 group-hover:opacity-100 z-10"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-[10px] text-slate-300 font-mono nums-fa">
                        {activeImgIdx + 1} / {imgs.length}
                      </div>
                    </>
                  )}

                  {/* نشان‌های بالایی */}
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <span className={`px-3 py-1 rounded-xl text-[11px] font-bold backdrop-blur-md border shadow-lg ${prop.is_exclusive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'}`}>
                      {prop.is_exclusive ? '🔒 شخصی' : '👁️ عمومی'}
                    </span>
                    <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-900/80 text-emerald-400 border border-slate-700">
                      {prop.deal_type || 'فروش'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-slate-200 text-xs font-bold nums-fa">
                    {prop.built_area || 0} متر | {prop.rooms || 0} خواب
                  </div>
                </div>

                {/* محتوای کارت */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-slate-100 mb-2 line-clamp-1">{prop.title}</h3>
                  
                  <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {prop.neighborhood || 'سجاد'}</span>
                    <span className="text-slate-400 font-mono nums-fa">کد فایل: {prop.id}</span>
                  </div>

                  <div className="mb-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <p className="text-[11px] text-slate-500 mb-1">قیمت کل:</p>
                    <p className="text-lg font-bold text-emerald-400 nums-fa">{formatPrice(prop.price_total)}</p>
                    {prop.price_total > 0 && <p className="text-[10px] text-emerald-500/80 mt-1 font-bold">{numberToPersianWords(prop.price_total)}</p>}
                  </div>

                  {/* 🌟 بخش تحلیل هوش مصنوعی (نقاط قوت/ضعف) 🌟 */}
                  {(prop.ai_pros || prop.ai_cons) && (
                    <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-3.5 mb-4 space-y-2">
                      <p className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" /> تحلیل هوش مصنوعی:
                      </p>
                      {prop.ai_pros && (
                        <p className="text-[11px] text-emerald-400 leading-relaxed font-medium">
                          ✔️ {prop.ai_pros.replace(/✔️/g, '').trim()}
                        </p>
                      )}
                      {prop.ai_cons && (
                        <p className="text-[11px] text-rose-400 leading-relaxed font-medium">
                          ❌ {prop.ai_cons.replace(/❌/g, '').trim()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 🌟 تمام دکمه‌های کاملاً واقعی 🌟 */}
                  <div className="mt-auto pt-3 border-t border-slate-800/80 space-y-2">
                    
                    {mainTab === 'pending' ? (
                      /* اکشن‌های صندوق ربات */
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleApprovePending(prop.id, false)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> ثبت عمومی
                        </button>
                        <button onClick={() => handleApprovePending(prop.id, true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1">
                          <Lock className="w-4 h-4" /> ثبت شخصی
                        </button>
                        <button onClick={() => handleMoveToTrash(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Trash2 className="w-4 h-4" /> زباله‌دان
                        </button>
                      </div>
                    ) : mainTab === 'trash' ? (
                      /* اکشن‌های زباله‌دان */
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleRestore(prop.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <RefreshCcw className="w-4 h-4"/> بازیابی
                        </button>
                        <button onClick={() => handlePermanentDelete(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Trash2 className="w-4 h-4"/> حذف دائم
                        </button>
                      </div>
                    ) : (
                      /* اکشن‌های اصلی فایل‌های فعال */
                      <>
                        <button onClick={() => setDivarConfirmModal(prop)} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20">
                          <Megaphone className="w-4 h-4" /> انتشار یک‌کلیکی در دیوار
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleCMA(prop.id)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Calculator className="w-3.5 h-3.5" /> کارشناسی قیمت (CMA)
                          </button>
                          <button onClick={() => window.open(`http://127.0.0.1:8000/catalog/property/${prop.id}`, '_blank')} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> مشاهده کاتالوگ
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleAIEvaluation(prop.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> ارزیابی هوشمند
                          </button>

                          {/* 🌟 دکمه عمومی کردن فقط برای فایل‌های شخصی 🌟 */}
                          {prop.is_exclusive ? (
                            <button onClick={() => handleMakePublic(prop.id)} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                              <Globe className="w-3.5 h-3.5" /> عمومی کردن
                            </button>
                          ) : (
                            <button onClick={() => handleMatchBuyers(prop.id)} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                              <Users className="w-3.5 h-3.5" /> مچینگ خریدار
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => { setSelectedPropForQr(prop); setQrModalOpen(true); }} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Share2 className="w-3.5 h-3.5" /> کد QR
                          </button>
                          <button onClick={() => openEditModal(prop)} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Edit className="w-3.5 h-3.5" /> ویرایش
                          </button>
                          <button onClick={() => handleMoveToTrash(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> حذف
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

      {/* ==================================================== */}
      {/* 📣 MODAL 1: تایید انتشار در دیوار (اسکرین‌شات ۸) */}
      {/* ==================================================== */}
      {divarConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">انتشار در دیوار؟</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              ربات به صورت خودکار فرم دیوار را با اطلاعات این فایل پر می‌کند.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setDivarConfirmModal(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                انصراف
              </button>
              <button onClick={() => handlePublishToDivar(divarConfirmModal.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20">
                بله، منتشر کن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ✏️ MODAL 2: ویرایش پیشرفته رسانه و فایل (اسکرین‌شات ۶ و ۷) */}
      {/* ==================================================== */}
      {editModalOpen && editingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-400"/> ویرایش پیشرفته رسانه و فایل
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-6">
              {/* بخش ۱: اطلاعات اصلی */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-emerald-400">۱. اطلاعات اصلی</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان آگهی:</label>
                  <input type="text" value={editingProp.title} onChange={e => setEditingProp({...editingProp, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none focus:border-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">قیمت کل (تومان):</label>
                    <input type="number" value={editingProp.price_total} onChange={e => setEditingProp({...editingProp, price_total: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold outline-none nums-fa" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">تلفن تماس مالک:</label>
                    <input type="text" value={editingProp.owner_phone || ''} onChange={e => setEditingProp({...editingProp, owner_phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none nums-fa" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* بخش ۲: مزایا و معایب AI */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-400">۲. مزایا و معایب هوشمند</h4>
                  <button onClick={() => handleAIEvaluation(editingProp.id)} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3"/> کشف اتوماتیک AI
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 mb-1.5">نقاط قوت:</label>
                    <textarea rows={3} value={editingProp.ai_pros || ''} onChange={e => setEditingProp({...editingProp, ai_pros: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-purple-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-400 mb-1.5">نقاط ضعف:</label>
                    <textarea rows={3} value={editingProp.ai_cons || ''} onChange={e => setEditingProp({...editingProp, ai_cons: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-purple-500 resize-none" />
                  </div>
                </div>
              </div>

              {/* بخش ۳: مدیریت گالری عکس و فیلم MP4 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-blue-400">۳. مدیریت گالری عکس و فیلم (MP4)</h4>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {editingImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <img src={img.startsWith('http') ? img : `http://127.0.0.1:8000${img}`} alt="media" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => handleRemoveImageFromEdit(idx)}
                        className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* باکس آپلود فایل جدید */}
                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-950/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-xs font-bold text-purple-400">برای آپلود عکس یا ویدیو کلیک کنید</span>
                  <input type="file" onChange={handleUploadNewMedia} accept="image/*,video/mp4" className="hidden" />
                </label>
              </div>

              {/* دکمه‌های پایانی */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button onClick={() => setEditModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                  انصراف
                </button>
                <button onClick={handleSaveAdvancedEdit} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/20">
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 📱 MODAL 3: اشتراک‌گذاری هوشمند & QR Code (اسکرین‌شات ۳) */}
      {/* ==================================================== */}
      {qrModalOpen && selectedPropForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up text-center relative">
            <button onClick={() => setQrModalOpen(false)} className="absolute left-4 top-4 text-slate-500 hover:text-white">
              <X className="w-5 h-5"/>
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center justify-center gap-2">
              📱 اشتراک‌گذاری هوشمند
            </h3>
            <p className="text-xs text-slate-400 mb-6">مشتری می‌تواند این بارکد را اسکن کند یا لینک زیر را کپی کنید.</p>

            <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto mb-6 shadow-2xl flex items-center justify-center border-4 border-slate-800">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://127.0.0.1:8000/catalog/property/${selectedPropForQr.id}`} 
                alt="Property QR Code" className="w-full h-full"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 mb-6">
              <input 
                type="text" readOnly value={`http://127.0.0.1:8000/catalog/property/${selectedPropForQr.id}`}
                className="bg-transparent text-xs text-slate-400 flex-1 px-2 font-mono outline-none text-left" dir="ltr"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`http://127.0.0.1:8000/catalog/property/${selectedPropForQr.id}`);
                  setCopyLinkSuccess(true);
                  setTimeout(() => setCopyLinkSuccess(false), 2000);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                {copiedLink ? <><Check className="w-3.5 h-3.5"/> کپی شد</> : <><Copy className="w-3.5 h-3.5"/> کپی لینک</>}
              </button>
            </div>

            <button onClick={() => setQrModalOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20">
              بستن پنجره
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ⚖️ MODAL 4: ترازوی هوشمند (CMA - اسکرین‌شات ۵) */}
      {/* ==================================================== */}
      {cmaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Calculator className="w-5 h-5"/> ترازوی هوشمند کارشناسی قیمت (CMA)
              </h3>
              <button onClick={() => setCmaModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            {cmaLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-amber-400 font-bold">در حال آنالیز قیمت منطقه و مقایسه با فایل‌های مشابه...</p>
              </div>
            ) : cmaData ? (
              <div className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-amber-400 mb-2">💡 تحلیل استراتژیک قیمت‌گذاری:</h4>
                  <p className="text-xs text-slate-200 leading-relaxed">{cmaData.scenarios?.market?.days || 'تحلیل بازار با موفقیت انجام شد.'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 mb-1">سناریوی فروش فوری (۵ روزه)</p>
                    <p className="text-sm font-bold text-rose-400 nums-fa">{formatPrice(cmaData.scenarios?.conservative?.price || 0)}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 text-center">
                    <p className="text-[11px] text-slate-500 mb-1">قیمت کارشناسی بازار (نرمال)</p>
                    <p className="text-base font-bold text-emerald-400 nums-fa">{formatPrice(cmaData.suggested_price || 0)}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 mb-1">قیمت پیشنهادی مالک</p>
                    <p className="text-sm font-bold text-amber-400 nums-fa">{formatPrice(cmaData.owner_price || 0)}</p>
                  </div>
                </div>

                <button onClick={() => setCmaModalOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
                  متوجه شدم
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 🤖 MODAL 5: بیدار کردن ربات */}
      {botModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
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
                    key={count} onClick={() => setBotCount(count)}
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