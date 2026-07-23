import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, Plus, Bot, LogIn, 
  Calculator, Eye, Trash2, Building2, MapPin, RefreshCcw, Lock, Globe, 
  Share2, Edit, CheckCircle2, Users, Megaphone, Copy, Check, X,
  ChevronLeft, ChevronRight, UploadCloud, Map as MapIcon, Grid, Phone, Brain, Tag, Scale, User
} from 'lucide-react';
import api from '../services/api';
import { formatPrice, numberToPersianWords } from '../utils/numberFormat';

// 🌟 تابع استخراج هوشمند عکس‌ها (پشتیبانی همزمان از images آرایه‌ای و image_urls رشته‌ای)
const extractImages = (item: any): string[] => {
  if (!item) return [];
  if (Array.isArray(item.images) && item.images.length > 0) return item.images;
  if (Array.isArray(item.image_urls) && item.image_urls.length > 0) return item.image_urls;
  if (typeof item.image_urls === 'string') {
    try {
      const parsed = JSON.parse(item.image_urls);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
};

export default function Properties({ setActiveMenu }: { setActiveMenu: (m: string) => void }) {
  const [mainTab, setMainTab] = useState<'active' | 'pending' | 'trash'>('active');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('همه');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [trashProps, setTrashProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cardImageIndex, setCardImageIndex] = useState<{ [key: number]: number }>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');

  // 🤖 ربات دیوار
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [botCount, setBotCount] = useState(50);
  const [isBotStarting, setIsBotStarting] = useState(false);

  // 📣 دیوار
  const [divarConfirmModal, setDivarConfirmModal] = useState<any>(null);

  // ⚖️ 🌟 ترازوی مقایسه‌ای ۳ ستونه با اسلایدر مجزای عکس برای هدف و رقیب
  const [cmaModalOpen, setCmaModalOpen] = useState(false);
  const [cmaTargetProp, setCmaTargetProp] = useState<any>(null);
  const [cmaTargetImgIdx, setCmaTargetImgIdx] = useState(0);
  const [cmaComparables, setCmaComparables] = useState<any[]>([]);
  const [cmaCompIndex, setCmaCompIndex] = useState(0);
  const [cmaCompImgIdx, setCmaCompImgIdx] = useState(0);
  const [cmaConclusion, setCmaConclusion] = useState<string>('');
  const [cmaLoading, setCmaLoading] = useState(false);

  // 🏷️ مودال کارشناسی قیمت CMA (سناریوهای ۵ روزه، بازار، قیمت مالک)
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // 📱 QR Code + لینک
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPropForQr, setSelectedPropForQr] = useState<any>(null);
  const [copiedLink, setCopyLinkSuccess] = useState(false);

  // 🎯 مچینگ
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedBuyers, setMatchedBuyers] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  // ✏️ ویرایش پیشرفته
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<any>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isAiGeneratingEdit, setIsAiGeneratingEdit] = useState(false);

  // 👁️ مودال کاتالوگ داخلی
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogProp, setCatalogProp] = useState<any>(null);
  const [catalogImgIndex, setCatalogImgIndex] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  // 🗺️ 🌟 بارگذاری ۱۰۰٪ سالم نقشه هنگام تغییر حالت به Map
  useEffect(() => {
    if (viewMode === 'map') {
      const timer = setTimeout(() => {
        fetchMapData();
      }, 150);
      return () => clearTimeout(timer);
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

      if (activeRes.status === 'fulfilled') setActiveProps(activeRes.value.data?.properties || []);
      if (pendingRes.status === 'fulfilled') setPendingProps(pendingRes.value.data?.properties || []);
      if (trashRes.status === 'fulfilled') setTrashProps(trashRes.value.data?.properties || []);
    } catch (error) {
      console.error("Error fetching properties", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapData = async () => {
    try {
      const res = await api.get('/api/properties/map-data');
      if (res.data?.status === 'success') {
        initLeafletMap(res.data.data || []);
      } else {
        initLeafletMap(activeProps);
      }
    } catch (e) { 
      initLeafletMap(activeProps);
    }
  };

  // 🗺️ 🌟 ساخت نقشه تعاملی دقیقاً مطابق اسکرین‌شات ۲ (پین‌های قرمز روی مشهد)
  const initLeafletMap = (data: any[]) => {
    if (!mapContainerRef.current) return;

    if (!document.getElementById('leaflet-css-style')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-style';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
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

    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch(e){}
    }

    // مرکز نقشه شهر مشهد
    const map = L.map(mapContainerRef.current, {
      center: [36.297, 59.606],
      zoom: 12
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap | EstateMind AI'
    }).addTo(map);

    // ۲ مرحله InvalidateSize جهت اطمینان از عدم سیاه شدن نقشه
    setTimeout(() => {
      try { map.invalidateSize(); } catch(e){}
    }, 200);

    const mapDataList = data.length > 0 ? data : activeProps;

    mapDataList.forEach((item: any, index: number) => {
      let lat = item.lat || (36.297 + ((index % 5) - 2) * 0.015);
      let lng = item.lng || (59.606 + ((index % 4) - 2) * 0.015);

      // پین قرمز دایره‌ای مطابق اسکرین‌شات ۲
      const circle = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#f43f5e',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(map);

      const displayPrice = item.price || (item.price_total ? formatPrice(item.price_total) + ' تومان' : 'توافقی');

      circle.bindPopup(`
        <div style="direction: rtl; text-align: right; font-family: sans-serif; padding: 4px;">
          <h4 style="font-weight: bold; margin-bottom: 4px; color: #0f172a; font-size: 13px;">${item.title || 'ملک'}</h4>
          <p style="margin: 0; color: #10b981; font-weight: bold; font-size: 12px;">${displayPrice}</p>
          <p style="margin-top: 2px; font-size: 11px; color: #64748b;">محله: ${item.neighborhood || 'سجاد'}</p>
        </div>
      `);
    });
  };

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

  const handleOpenPricingStrategy = async (id: number) => {
    setPricingLoading(true);
    setPricingModalOpen(true);
    try {
      const res = await api.get(`/api/pricing/analyze/${id}`);
      setPricingData(res.data);
    } catch (e) {
      alert("خطا در دریافت تحلیل قیمت‌گذاری");
      setPricingModalOpen(false);
    } finally {
      setPricingLoading(false);
    }
  };

  const handleOpenSmartValuation = async (targetProp: any) => {
    setCmaTargetProp(targetProp);
    setCmaTargetImgIdx(0);
    setCmaCompIndex(0);
    setCmaCompImgIdx(0);
    setCmaLoading(true);
    setCmaModalOpen(true);

    try {
      const res = await api.get(`/api/properties/${targetProp.id}/compare`);
      if (res.data && res.data.comparables && res.data.comparables.length > 0) {
        setCmaComparables(res.data.comparables);
        setCmaConclusion(res.data.conclusion || 'بر اساس تحلیل قیمت و موقعیت مکانی، ملک هدف ارزش خرید بالایی در منطقه دارد.');
      } else {
        const minP = targetProp.price_total * 0.8;
        const maxP = targetProp.price_total * 1.2;
        const filteredComps = activeProps.filter(p => p.id !== targetProp.id && p.price_total >= minP && p.price_total <= maxP);
        setCmaComparables(filteredComps);
        setCmaConclusion('این ملک در مقایسه با فایل‌های هم‌رده منطقه از ارزشمندی بالایی برخوردار است.');
      }
    } catch (e) {
      setCmaComparables([]);
      setCmaConclusion('فایل مشابهی در بازه تلورانس ۲۰٪ قیمت یافت نشد.');
    } finally {
      setCmaLoading(false);
    }
  };

  const handleStartCrawler = async () => {
    setIsBotStarting(true);
    try {
      const res = await api.post('/api/crawler/start', { target_count: botCount, city: "mashhad" });
      alert(res.data?.message || "ربات بیدار شد!");
      setBotModalOpen(false);
      fetchProperties();
    } catch (e: any) {
      alert(e.response?.data?.detail || "خطا در بیدار کردن ربات");
    } finally { setIsBotStarting(false); }
  };

  const handleDivarLogin = async () => {
    try {
      const res = await api.post('/api/crawler/divar-login');
      alert(res.data?.message || "مرورگر باز شد");
    } catch (e: any) { alert("خطا در باز کردن مرورگر دیوار"); }
  };

  const handlePublishToDivar = async (id: number) => {
    try {
      const res = await api.post(`/api/crawler/publish-to-divar/${id}`);
      alert(res.data?.message || "درخواست ارسال شد");
      setDivarConfirmModal(null);
    } catch (e: any) { alert("خطا در ارسال به دیوار"); }
  };

  const handleMakePublic = async (id: number) => {
    if (!window.confirm('آیا مایلید این ملک عمومی شده و برای تمام مشاوران آژانس قابل رویت باشد؟')) return;
    try {
      const res = await api.put(`/api/properties/${id}/make-public`);
      alert(`فایل با موفقیت توسط ${res.data?.made_public_by || 'شما'} عمومی شد.`);
      fetchProperties();
    } catch (e: any) { 
      alert(e.response?.data?.detail || "خطا در عمومی‌سازی فایل"); 
    }
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

  const openEditModal = (prop: any) => {
    setEditingProp({ ...prop });
    setEditingImages(extractImages(prop));
    setEditModalOpen(true);
  };

  const openCatalogModal = (prop: any) => {
    setCatalogProp(prop);
    setCatalogImgIndex(0);
    setCatalogModalOpen(true);
  };

  const handleRemoveImageFromEdit = (index: number) => {
    setEditingImages(prev => prev.filter((_, i) => i !== index));
  };

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

  const handleAIEvalInEdit = async () => {
    if (!editingProp) return;
    setIsAiGeneratingEdit(true);
    try {
      const res = await api.post(`/api/properties/${editingProp.id}/generate-ai-details`);
      setEditingProp((prev: any) => ({
        ...prev,
        ai_pros: res.data?.pros || prev.ai_pros,
        ai_cons: res.data?.cons || prev.ai_cons
      }));
      alert("مزایا و معایب جدید توسط هوش مصنوعی کشف شد.");
    } catch (e) { alert("خطا در کشف اتوماتیک AI"); } finally { setIsAiGeneratingEdit(false); }
  };

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

  const handleMatchBuyers = async (id: number) => {
    setMatchLoading(true);
    setMatchModalOpen(true);
    try {
      const res = await api.get(`/api/properties/${id}/match-buyers`);
      setMatchedBuyers(res.data?.matches || []);
    } catch (e) {
      alert("خطا در مچینگ خریداران");
      setMatchModalOpen(false);
    } finally { setMatchLoading(false); }
  };

  const getFilteredData = () => {
    let rawList = mainTab === 'active' ? activeProps : mainTab === 'pending' ? pendingProps : trashProps;

    if (!Array.isArray(rawList)) return [];

    if (mainTab === 'active') {
      if (privacyFilter === 'private') rawList = rawList.filter(p => p?.is_exclusive === true);
      else if (privacyFilter === 'public') rawList = rawList.filter(p => p?.is_exclusive === false);
    }

    if (categoryFilter !== 'همه') {
      if (categoryFilter === 'آپارتمان') rawList = rawList.filter(p => p?.property_type === 'آپارتمان' || p?.property_type === 'apartment');
      else if (categoryFilter === 'ویلایی') rawList = rawList.filter(p => p?.property_type === 'ویلایی' || p?.property_type === 'villa');
      else if (categoryFilter === 'زمین و کلنگی') rawList = rawList.filter(p => p?.property_type?.includes('زمین') || p?.property_type?.includes('کلنگی') || p?.property_type === 'land');
      else if (categoryFilter === 'پنت‌هاوس') rawList = rawList.filter(p => p?.title?.includes('پنت') || p?.description?.includes('پنت'));
      else if (categoryFilter === 'فروش') rawList = rawList.filter(p => p?.deal_type === 'فروش' || p?.deal_type === 'SALE');
      else if (categoryFilter === 'اجاره') rawList = rawList.filter(p => p?.deal_type === 'رهن و اجاره' || p?.deal_type === 'RENT');
    }

    if (searchQuery) {
      rawList = rawList.filter(p => p?.title?.includes(searchQuery) || p?.neighborhood?.includes(searchQuery));
    }

    return rawList;
  };

  const filteredProperties = getFilteredData();

  return (
    <div className="animate-fade-in-up pb-24" dir="rtl">
      
      {/* هدر */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="text-emerald-500 w-6 h-6" /> بانک اطلاعات املاک و شووروم
          </h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت فایل‌ها، فیلتر پیشرفته، نقشه تعاملی و ربات دیوار</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20">
            {viewMode === 'grid' ? <><MapIcon className="w-4 h-4"/> نمایش نقشه</> : <><Grid className="w-4 h-4"/> نمایش کارت‌ها</>}
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

      {/* سرچ‌بار و تب‌ها */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 mb-6 shadow-2xl space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input 
              type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
              placeholder="جستجوی عامیانه با هوش مصنوعی (مثال: یه خونه نورگیر سمت سجاد...)"
              className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl pr-10 pl-20 py-3 text-xs text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:border-purple-500 transition-all"
            />
            <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">
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

      {/* 🗺️ 🌟 نمایش نقشه تعاملی مشهد (کاملاً فیکس و بدون صفحه سیاه) */}
      {viewMode === 'map' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-[550px] relative w-full">
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', backgroundColor: '#0f172a' }}></div>
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
        /* گرید کارت‌های املاک */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => {
            const imgs = extractImages(prop);
            const activeImgIdx = cardImageIndex[prop?.id] || 0;
            const currentImgUrl = imgs.length > 0 ? (imgs[activeImgIdx]?.startsWith('http') ? imgs[activeImgIdx] : `http://127.0.0.1:8000${imgs[activeImgIdx]}`) : '';

            return (
              <div key={prop.id} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col">
                
                {/* اسلایدر عکس روی کارت */}
                <div className="relative h-56 bg-slate-950 overflow-hidden group">
                  {currentImgUrl ? (
                    <img src={currentImgUrl} alt={prop.title || 'ملک'} className="w-full h-full object-cover transition-all duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950"><Building2 className="w-12 h-12 text-slate-800" /></div>
                  )}

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
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-800 text-[10px] text-slate-300 font-mono nums-fa">
                        {activeImgIdx + 1} از {imgs.length} عکس
                      </div>
                    </>
                  )}

                  <div className="absolute top-3 right-3 flex flex-wrap gap-2 z-10">
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
                  <h3 className="text-base font-bold text-slate-100 mb-1 line-clamp-1">{prop.title}</h3>
                  
                  {/* 🌟 نمایش نام فردی که ملک را عمومی کرده است 🌟 */}
                  <div className="flex items-center justify-between mb-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {prop.neighborhood || 'سجاد'}</span>
                    {prop.made_public_by_name && (
                      <span className="text-cyan-400 font-medium flex items-center gap-1">
                        <User className="w-3 h-3"/> توسط: {prop.made_public_by_name}
                      </span>
                    )}
                  </div>

                  <div className="mb-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <p className="text-[11px] text-slate-500 mb-1">قیمت کل:</p>
                    <p className="text-lg font-bold text-emerald-400 nums-fa">{formatPrice(prop.price_total)}</p>
                    {prop.price_total > 0 && <p className="text-[10px] text-emerald-500/80 mt-1 font-bold">{numberToPersianWords(prop.price_total)}</p>}
                  </div>

                  {/* تحلیل هوش مصنوعی */}
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

                  {/* دکمه‌های عملیاتی کارت */}
                  <div className="mt-auto pt-3 border-t border-slate-800/80 space-y-2">
                    
                    {mainTab === 'pending' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleApprovePending(prop.id, false)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" /> ثبت عمومی
                        </button>
                        <button onClick={() => handleApprovePending(prop.id, true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20">
                          <Lock className="w-4 h-4" /> ثبت شخصی
                        </button>
                        <button onClick={() => handleMoveToTrash(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Trash2 className="w-4 h-4" /> زباله‌دان
                        </button>
                      </div>
                    ) : mainTab === 'trash' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleRestore(prop.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <RefreshCcw className="w-4 h-4"/> بازیابی
                        </button>
                        <button onClick={() => handlePermanentDelete(prop.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                          <Trash2 className="w-4 h-4"/> حذف دائم
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setDivarConfirmModal(prop)} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20">
                          <Megaphone className="w-4 h-4" /> انتشار یک‌کلیکی در دیوار
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          {/* 🌟 دکمه ۱: «کارشناسی قیمت (CMA)» -> باز شدن سناریوهای ۵ روزه، بازار و پیشنهادی مالک 🌟 */}
                          <button onClick={() => handleOpenPricingStrategy(prop.id)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Calculator className="w-3.5 h-3.5" /> کارشناسی قیمت (CMA)
                          </button>

                          <button onClick={() => openCatalogModal(prop)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> مشاهده کاتالوگ
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* 🌟 دکمه ۲: «ارزیابی هوشمند» -> باز شدن ترازوی ۳ ستونه مقایسه‌ای رقبا با ۲۰٪ تلورانس 🌟 */}
                          <button onClick={() => handleOpenSmartValuation(prop)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> ارزیابی هوشمند
                          </button>

                          {/* قانون یک‌طرفه: فقط برای شخصی دکمه عمومی‌سازی ظاهر می‌شود */}
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
      {/* 🏷️ MODAL 1: کارشناسی قیمت (CMA - ۵ روزه، بازار، قیمت مالک) */}
      {/* ==================================================== */}
      {pricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 lg:p-8 shadow-2xl animate-fade-in-up relative">
            <button onClick={() => setPricingModalOpen(false)} className="absolute left-6 top-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition-all">
              <X className="w-5 h-5"/>
            </button>

            <h3 className="text-lg font-bold text-amber-400 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5"/> ترازوی هوشمند کارشناسی قیمت (CMA)
            </h3>

            {pricingLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-amber-400 font-bold">در حال تحلیل قیمت منطقه و ساخت سناریوهای فروش...</p>
              </div>
            ) : pricingData ? (
              <div className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-amber-400 mb-2">💡 تحلیل استراتژیک قیمت‌گذاری:</h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {pricingData.scenarios?.market?.days || '۱۵ الی ۳۰ روز (نرمال)'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 mb-2 font-bold">سناریوی فروش فوری (۵ روزه)</p>
                    <p className="text-sm font-bold text-rose-400 nums-fa">{formatPrice(pricingData.scenarios?.conservative?.price || 0)}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 text-center">
                    <p className="text-[11px] text-slate-500 mb-2 font-bold">قیمت کارشناسی بازار (نرمال)</p>
                    <p className="text-base font-bold text-emerald-400 nums-fa">{formatPrice(pricingData.suggested_price || 0)}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 mb-2 font-bold">قیمت پیشنهادی مالک</p>
                    <p className="text-sm font-bold text-amber-400 nums-fa">{formatPrice(pricingData.owner_price || 0)}</p>
                  </div>
                </div>

                <button onClick={() => setPricingModalOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl text-xs transition-all">
                  متوجه شدم
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ⚖️ 🌟 MODAL 2: ارزیابی هوشمند (۳ ستونه با اسلایدر عکس هدف و رقیب) */}
      {/* ==================================================== */}
      {cmaModalOpen && cmaTargetProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl p-6 lg:p-8 shadow-2xl animate-fade-in-up max-h-[92vh] overflow-y-auto relative">
            <button onClick={() => setCmaModalOpen(false)} className="absolute left-6 top-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition-all z-20">
              <X className="w-5 h-5"/>
            </button>

            <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6"/> ترازوی هوشمند ارزیابی رقبا و تحلیل بازار ⚖️
            </h3>

            {cmaLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-emerald-400 font-bold">در حال پردازش تلورانس ۲۰٪ قیمت و مقایسه هوشمند با املاک بازار...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ستون ۱ (راست): ملک هدف شما با اسلایدر عکس */}
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden">
                  <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-xl shadow-lg z-10">
                    فایل هدف شما 🎯
                  </span>
                  
                  <div>
                    {(() => {
                      const targetImgs = extractImages(cmaTargetProp);
                      const currentTargetImg = targetImgs[cmaTargetImgIdx] ? (targetImgs[cmaTargetImgIdx].startsWith('http') ? targetImgs[cmaTargetImgIdx] : `http://127.0.0.1:8000${targetImgs[cmaTargetImgIdx]}`) : '';

                      return (
                        <div className="h-48 bg-slate-900 rounded-2xl overflow-hidden mb-4 border border-slate-800 mt-6 relative group">
                          {currentTargetImg ? (
                            <img src={currentTargetImg} className="w-full h-full object-cover" alt="target" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950"><Building2 className="w-10 h-10 text-slate-700"/></div>
                          )}

                          {targetImgs.length > 1 && (
                            <>
                              <button onClick={() => setCmaTargetImgIdx(prev => prev === 0 ? targetImgs.length - 1 : prev - 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-950/80 text-white p-1.5 rounded-full border border-slate-700">
                                <ChevronRight className="w-3.5 h-3.5"/>
                              </button>
                              <button onClick={() => setCmaTargetImgIdx(prev => prev === targetImgs.length - 1 ? 0 : prev + 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-950/80 text-white p-1.5 rounded-full border border-slate-700">
                                <ChevronLeft className="w-3.5 h-3.5"/>
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-[10px] text-slate-300 font-mono nums-fa">
                                {cmaTargetImgIdx + 1} / {targetImgs.length}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    <h4 className="text-sm font-bold text-slate-100 mb-2">{cmaTargetProp.title}</h4>
                    <p className="text-lg font-bold text-emerald-400 nums-fa mb-4">{formatPrice(cmaTargetProp.price_total)}</p>

                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 space-y-2 mb-3">
                      <p className="text-[11px] font-bold text-emerald-400">✨ نقاط قوت:</p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{cmaTargetProp.ai_pros || 'دارای موقعیت عالی و متریال درجه یک'}</p>
                    </div>

                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-3 space-y-2">
                      <p className="text-[11px] font-bold text-rose-400">⚠️ نقاط ضعف:</p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{cmaTargetProp.ai_cons || 'عدم درج عکس واقعی یا نیاز به بررسی سن بنا'}</p>
                    </div>
                  </div>
                </div>

                {/* ستون ۲ (وسط): ملک رقیب در بازار با اسلایدر عکس 🌟 */}
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden">
                  <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-xl shadow-lg z-10">
                    رقیب در بازار (تلورانس ۲۰٪)
                  </span>

                  <div>
                    {cmaComparables.length > 0 ? (
                      (() => {
                        const currentComp = cmaComparables[cmaCompIndex] || cmaComparables[0];
                        const compImgs = extractImages(currentComp);
                        const currentCompImg = compImgs[cmaCompImgIdx] ? (compImgs[cmaCompImgIdx].startsWith('http') ? compImgs[cmaCompImgIdx] : `http://127.0.0.1:8000${compImgs[cmaCompImgIdx]}`) : '';

                        return (
                          <>
                            <div className="h-48 bg-slate-900 rounded-2xl overflow-hidden mb-4 border border-slate-800 mt-6 relative group">
                              {currentCompImg ? (
                                <img src={currentCompImg} className="w-full h-full object-cover" alt="comp" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-950"><Building2 className="w-10 h-10 text-slate-700"/></div>
                              )}

                              {compImgs.length > 1 && (
                                <>
                                  <button onClick={() => setCmaCompImgIdx(prev => prev === 0 ? compImgs.length - 1 : prev - 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-950/80 text-white p-1.5 rounded-full border border-slate-700">
                                    <ChevronRight className="w-3.5 h-3.5"/>
                                  </button>
                                  <button onClick={() => setCmaCompImgIdx(prev => prev === compImgs.length - 1 ? 0 : prev + 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-950/80 text-white p-1.5 rounded-full border border-slate-700">
                                    <ChevronLeft className="w-3.5 h-3.5"/>
                                  </button>
                                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-[10px] text-slate-300 font-mono nums-fa">
                                    {cmaCompImgIdx + 1} / {compImgs.length}
                                  </div>
                                </>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-100 mb-2">{currentComp.title}</h4>
                            <p className="text-lg font-bold text-amber-400 nums-fa mb-4">{formatPrice(currentComp.price_total || currentComp.price)}</p>

                            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 space-y-2 mb-3">
                              <p className="text-[11px] font-bold text-emerald-400">✨ نقاط قوت رقیب:</p>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{currentComp.ai_pros || currentComp.pros || 'موقعیت مکانی مناسب'}</p>
                            </div>

                            <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-3 space-y-2">
                              <p className="text-[11px] font-bold text-rose-400">⚠️ نقاط ضعف رقیب:</p>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{currentComp.ai_cons || currentComp.cons || 'عدم درج تصویر واقعی'}</p>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="text-center py-20 text-slate-500 text-xs">ملک دیگری در بازه ۲۰٪ قیمت یافت نشد.</div>
                    )}
                  </div>

                  {cmaComparables.length > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
                      <button 
                        onClick={() => {
                          setCmaCompIndex(prev => prev === 0 ? cmaComparables.length - 1 : prev - 1);
                          setCmaCompImgIdx(0);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1 text-xs font-bold"
                      >
                        <ChevronRight className="w-4 h-4"/> رقیب قبلی
                      </button>
                      <span className="text-xs text-slate-400 font-mono nums-fa">{cmaCompIndex + 1} از {cmaComparables.length}</span>
                      <button 
                        onClick={() => {
                          setCmaCompIndex(prev => prev === cmaComparables.length - 1 ? 0 : prev + 1);
                          setCmaCompImgIdx(0);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1 text-xs font-bold"
                      >
                        رقیب بعدی <ChevronLeft className="w-4 h-4"/>
                      </button>
                    </div>
                  )}
                </div>

                {/* ستون ۳ (چپ): جمع‌بندی هوش مصنوعی */}
                <div className="bg-purple-950/20 border border-purple-500/30 rounded-3xl p-6 flex flex-col justify-between text-center relative overflow-hidden">
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-purple-300 mb-4">جمع‌بندی تحلیلی هوش مصنوعی</h4>
                    <p className="text-xs text-slate-200 leading-relaxed text-right bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 whitespace-pre-line">
                      {cmaConclusion}
                    </p>
                  </div>

                  <button onClick={() => setCmaModalOpen(false)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/20 mt-6">
                    تایید و بستن ترازو
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 📱 MODAL 3: کد QR و لینک مستقیم کاتالوگ */}
      {/* ==================================================== */}
      {qrModalOpen && selectedPropForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 lg:p-8 shadow-2xl animate-fade-in-up text-center relative">
            <button onClick={() => setQrModalOpen(false)} className="absolute left-4 top-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full">
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
      {/* ✏️ MODAL 4: ویرایش پیشرفته رسانه و فایل */}
      {/* ==================================================== */}
      {editModalOpen && editingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 lg:p-8 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-400"/> ویرایش پیشرفته رسانه و فایل ✏️
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-emerald-400">۱. اطلاعات اصلی</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان آگهی:</label>
                  <input type="text" value={editingProp.title || ''} onChange={e => setEditingProp({...editingProp, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none focus:border-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">قیمت کل (تومان):</label>
                    <input type="number" value={editingProp.price_total || 0} onChange={e => setEditingProp({...editingProp, price_total: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold outline-none nums-fa" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">تلفن تماس مالک:</label>
                    <input type="text" value={editingProp.owner_phone || ''} onChange={e => setEditingProp({...editingProp, owner_phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none nums-fa" dir="ltr" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-400">۲. مزایا و معایب هوشمند</h4>
                  <button onClick={handleAIEvalInEdit} disabled={isAiGeneratingEdit} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1">
                    {isAiGeneratingEdit ? <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div> : <><Sparkles className="w-3.5 h-3.5"/> کشف اتوماتیک AI</>}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 mb-1.5">نقاط قوت:</label>
                    <textarea rows={4} value={editingProp.ai_pros || ''} onChange={e => setEditingProp({...editingProp, ai_pros: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-purple-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-400 mb-1.5">نقاط ضعف:</label>
                    <textarea rows={4} value={editingProp.ai_cons || ''} onChange={e => setEditingProp({...editingProp, ai_cons: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-purple-500 resize-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-blue-400">۳. مدیریت گالری عکس و فیلم (MP4)</h4>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {editingImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <img src={img.startsWith('http') ? img : `http://127.0.0.1:8000${img}`} alt="media" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => handleRemoveImageFromEdit(idx)}
                        className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600 transition-all z-10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-950/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-xs font-bold text-purple-400">
                    {isUploadingMedia ? "در حال آپلود..." : "برای آپلود عکس یا ویدیو کلیک کنید"}
                  </span>
                  <input type="file" onChange={handleUploadNewMedia} accept="image/*,video/mp4" className="hidden" />
                </label>
              </div>

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

      {/* 📣 MODAL 5: تایید انتشار در دیوار */}
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

      {/* 🤖 MODAL 6: بیدار کردن ربات */}
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

      {/* 🎯 MODAL 7: مچینگ خریداران */}
      {matchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2"><Users className="w-5 h-5"/> خریداران منطبق در قیف فروش</h3>
              <button onClick={() => setMatchModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            {matchLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs text-cyan-400 font-bold">در حال بررسی بودجه خریداران...</p>
              </div>
            ) : matchedBuyers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">خریدار مناسبی برای این بودجه در قیف فروش یافت نشد.</p>
            ) : (
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {matchedBuyers.map(b => (
                  <div key={b.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{b.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono nums-fa" dir="ltr">{b.phone}</p>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 nums-fa">{formatPrice(b.budget)}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setMatchModalOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all">
              بستن
            </button>
          </div>
        </div>
      )}

      {/* 👁️ MODAL 8: کاتالوگ اختصاصی ملک */}
      {catalogModalOpen && catalogProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 lg:p-8 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setCatalogModalOpen(false)} className="absolute left-6 top-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition-all z-20">
              <X className="w-5 h-5"/>
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" /> کاتالوگ اختصاصی ملک
            </h3>

            {(() => {
              const catalogImgs = extractImages(catalogProp);
              const activeImg = catalogImgs[catalogImgIndex] ? (catalogImgs[catalogImgIndex].startsWith('http') ? catalogImgs[catalogImgIndex] : `http://127.0.0.1:8000${catalogImgs[catalogImgIndex]}`) : '';

              return (
                <div className="space-y-6">
                  <div className="relative h-72 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {activeImg ? (
                      <img src={activeImg} className="w-full h-full object-cover" alt="catalog" />
                    ) : (
                      <Building2 className="w-16 h-16 text-slate-800"/>
                    )}

                    {catalogImgs.length > 1 && (
                      <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                        <button onClick={() => setCatalogImgIndex(prev => prev === 0 ? catalogImgs.length - 1 : prev - 1)} className="pointer-events-auto bg-slate-950/80 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700">
                          <ChevronRight className="w-5 h-5"/>
                        </button>
                        <button onClick={() => setCatalogImgIndex(prev => prev === catalogImgs.length - 1 ? 0 : prev + 1)} className="pointer-events-auto bg-slate-950/80 hover:bg-slate-900 text-white p-2 rounded-full border border-slate-700">
                          <ChevronLeft className="w-5 h-5"/>
                        </button>
                      </div>
                    )}
                  </div>

                  {catalogImgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {catalogImgs.map((img, idx) => (
                        <button key={idx} onClick={() => setCatalogImgIndex(idx)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 ${catalogImgIndex === idx ? 'border-blue-500' : 'border-slate-800 opacity-60'}`}>
                          <img src={img.startsWith('http') ? img : `http://127.0.0.1:8000${img}`} className="w-full h-full object-cover" alt="thumb" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                    <div>
                      <h4 className="text-base font-bold text-slate-100 mb-2">{catalogProp.title}</h4>
                      <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" /> {catalogProp.neighborhood || 'مشهد'}
                      </p>
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-500">قیمت کل:</p>
                        <p className="text-xl font-bold text-emerald-400 nums-fa">{formatPrice(catalogProp.price_total)}</p>
                        {catalogProp.price_total > 0 && (
                          <p className="text-xs text-emerald-500/80 font-bold">{numberToPersianWords(catalogProp.price_total)}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">متراژ:</span>
                        <span className="font-bold nums-fa">{catalogProp.built_area || 0} متر</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">تعداد خواب:</span>
                        <span className="font-bold nums-fa">{catalogProp.rooms || 0} خواب</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">نوع معامله:</span>
                        <span className="font-bold text-emerald-400">{catalogProp.deal_type || 'فروش'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">تلفن تماس:</span>
                        <span className="font-bold text-indigo-400 font-mono nums-fa" dir="ltr">{catalogProp.owner_phone || 'ثبت نشده'}</span>
                      </div>
                    </div>
                  </div>

                  {catalogProp.description && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <p className="text-xs font-bold text-slate-400 mb-1">توضیحات ملک:</p>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{catalogProp.description}</p>
                    </div>
                  )}

                  <button onClick={() => setCatalogModalOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-blue-600/20">
                    بستن کاتالوگ
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}