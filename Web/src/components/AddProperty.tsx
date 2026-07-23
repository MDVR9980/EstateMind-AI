import { useState, useRef } from 'react';
import { 
  Mic, Home, MapPin, Building2, Layers, Calendar, ArrowRight, ArrowLeft,
  CheckCircle2, UploadCloud, Info, DollarSign, User, Phone, Check, ShieldCheck, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { formatPrice, formatInputToNumber, numberToPersianWords } from '../utils/numberFormat';

export default function AddProperty({ setActiveMenu }: { setActiveMenu: (m: string) => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Voice Recording States (Web API)
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState({
    title: '', deal_type: 'sale', property_type: 'apartment', city: 'مشهد', neighborhood: '', address: '',
    built_area: '', rooms: '', age: '', floor: '', total_floors: '',
    has_elevator: false, has_parking: false, has_store_room: false, has_master_room: false,
    cabinet_type: 'MDF', floor_covering: 'سرامیک',
    document_type: 'SINGLE', price_total: '', price_mortgage: '', price_rent: '',
    owner_name: '', owner_phone: '', description: '', is_exclusive: false, images: []
  });

  // ==========================================
  // توابع دستیار صوتی (مرورگر)
  // ==========================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendVoiceToAI(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('دسترسی به میکروفون داده نشد!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // خاموش کردن میکروفون مرورگر
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendVoiceToAI = async (audioBlob: Blob) => {
    setIsProcessingVoice(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, 'voice.webm');
      
      const res = await api.post('/api/properties/voice-parse', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        const aiData = res.data.data;
        setFormData(prev => ({
          ...prev,
          title: aiData.title || prev.title,
          neighborhood: aiData.real_neighborhood || aiData.neighborhood || prev.neighborhood,
          built_area: aiData.built_area ? aiData.built_area.toString() : prev.built_area,
          rooms: aiData.rooms ? aiData.rooms.toString() : prev.rooms,
          price_total: aiData.price_total ? formatPrice(aiData.price_total) : prev.price_total,
          property_type: aiData.property_type === 'ویلایی' ? 'villa' : aiData.property_type === 'زمین و کلنگی' ? 'land' : 'apartment',
          has_elevator: aiData.has_elevator || prev.has_elevator,
          has_parking: aiData.has_parking || prev.has_parking,
          has_store_room: aiData.has_store_room || prev.has_store_room,
        }));
        alert('جادو شد! فیلدها با موفقیت پر شدند.');
      }
    } catch (error) {
      alert('خطا در تحلیل صدا');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // ==========================================
  // توابع فرم
  // ==========================================
  const handleNext = () => {
    if (step === 1 && (!formData.title || !formData.neighborhood)) {
      return alert("عنوان و محله الزامی است.");
    }
    setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const submitForm = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        built_area: parseFloat(formData.built_area || '0'),
        rooms: parseInt(formData.rooms || '0'),
        age: parseInt(formData.age || '0'),
        floor: parseInt(formData.floor || '0'),
        price_total: formatInputToNumber(formData.deal_type === 'sale' ? formData.price_total : formData.price_mortgage),
        image_urls: [] // در صورت نیاز آپلود عکس اضافه میشود
      };
      
      const res = await api.post('/api/properties/save', payload);
      if(res.data.status === 'success'){
        alert('فایل با موفقیت در بانک املاک ثبت شد!');
        setActiveMenu('properties'); // انتقال مستقیم به لیست فایل‌ها بعد از ثبت موفقیت‌آمیز
      }
    } catch(e) {
      alert("خطا در ثبت فایل");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'پایه و آدرس' },
    { id: 2, label: 'امکانات و مشخصات' },
    { id: 3, label: 'مالی و مالک' }
  ];

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto pb-20">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Home className="text-emerald-500 w-7 h-7" /> ثبت فایل جدید (شکار)
          </h2>
          <p className="text-sm text-slate-400 mt-1">اطلاعات فایل را دستی یا با دستیار صوتی پر کنید.</p>
        </div>
        <button onClick={() => setActiveMenu('properties')} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-slate-700">
          بازگشت <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 🎙️ Voice Banner (Always Visible) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-purple-500/30 p-6 lg:p-8 mb-8 shadow-2xl shadow-purple-900/20">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="text-center md:text-right">
            <h3 className="text-lg md:text-xl font-bold text-purple-100 flex items-center justify-center md:justify-start gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> دستیار صوتی هوشمند (Voice to CRM)
            </h3>
            <p className="text-xs md:text-sm text-purple-200/70">
              دکمه را نگه دارید و مشخصات ملک را صحبت کنید تا هوش مصنوعی فیلدها را پُر کند!
            </p>
          </div>
          
          <div className="relative">
            {isProcessingVoice ? (
              <div className="w-20 h-20 rounded-full bg-purple-600/50 border-2 border-purple-400 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isRecording ? 'bg-rose-500 scale-110 shadow-rose-500/50 animate-pulse' : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:scale-105 shadow-purple-500/50'}`}
              >
                <Mic className="w-8 h-8 text-white" />
              </button>
            )}
            {isRecording && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-max text-xs font-bold text-rose-400 animate-pulse">در حال شنیدن...</span>}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 relative px-4">
        <div className="absolute left-8 right-8 top-1/2 h-1 bg-slate-800 -z-10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
        </div>
        {steps.map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-950 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step >= s.id ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              {step > s.id ? <Check className="w-4 h-4" /> : <span className="text-sm font-bold">{s.id}</span>}
            </div>
            <span className={`text-[11px] font-bold ${step >= s.id ? 'text-emerald-400' : 'text-slate-500'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Form Container */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 lg:p-8 shadow-2xl">
        
        {/* === STEP 1 === */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">عنوان آگهی / فایل <span className="text-rose-500">*</span></label>
              <input type="text" value={formData.title} onChange={e=>setFormData({...formData, title:e.target.value})} placeholder="مثال: آپارتمان ۱۲۰ متری نوساز سجاد" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع ملک</label>
                <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                  <button onClick={()=>setFormData({...formData, property_type: 'apartment'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.property_type === 'apartment' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>آپارتمان</button>
                  <button onClick={()=>setFormData({...formData, property_type: 'villa'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.property_type === 'villa' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>ویلایی</button>
                  <button onClick={()=>setFormData({...formData, property_type: 'land'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.property_type === 'land' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>کلنگی/زمین</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع معامله</label>
                <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                  <button onClick={()=>setFormData({...formData, deal_type: 'sale'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.deal_type === 'sale' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}>فروش</button>
                  <button onClick={()=>setFormData({...formData, deal_type: 'rent'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.deal_type === 'rent' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}>رهن و اجاره</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">شهر</label>
                <input type="text" value={formData.city} onChange={e=>setFormData({...formData, city:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">محله / منطقه <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={formData.neighborhood} onChange={e=>setFormData({...formData, neighborhood:e.target.value})} placeholder="مثال: سجاد" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-3.5 text-sm text-slate-100 focus:border-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">آدرس دقیق (محرمانه برای دفتر)</label>
              <input type="text" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})} placeholder="مثال: حاشیه سجاد، پلاک ۱۲..." className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:border-emerald-500 outline-none" />
            </div>
          </div>
        )}

        {/* === STEP 2 === */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">متراژ (متر)</label>
                <input type="text" value={formData.built_area} onChange={e=>setFormData({...formData, built_area:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm text-slate-100 focus:border-emerald-500 outline-none nums-fa" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">تعداد خواب</label>
                <input type="text" value={formData.rooms} onChange={e=>setFormData({...formData, rooms:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm text-slate-100 focus:border-emerald-500 outline-none nums-fa" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">طبقه</label>
                <input type="text" value={formData.floor} onChange={e=>setFormData({...formData, floor:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm text-slate-100 focus:border-emerald-500 outline-none nums-fa" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">سن بنا (سال)</label>
                <input type="text" value={formData.age} onChange={e=>setFormData({...formData, age:e.target.value})} placeholder="نوساز = 0" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm text-slate-100 focus:border-emerald-500 outline-none nums-fa" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-3">امکانات رفاهی</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'has_elevator', label: 'آسانسور' }, { id: 'has_parking', label: 'پارکلینگ' },
                  { id: 'has_store_room', label: 'انباری' }, { id: 'has_master_room', label: 'خواب مستر' }
                ].map(feature => (
                  <button 
                    key={feature.id} 
                    onClick={() => setFormData(prev => ({ ...prev, [feature.id]: !(prev as any)[feature.id] }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      (formData as any)[feature.id] ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {feature.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">گالری عکس (آپلود همزمان)</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/30 rounded-2xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer">
                <UploadCloud className="w-10 h-10 text-slate-500 mb-3" />
                <p className="text-sm font-bold text-emerald-500">برای انتخاب عکس کلیک کنید</p>
                <p className="text-xs text-slate-500 mt-1">یا فایل‌ها را اینجا رها کنید</p>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 3 === */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            {formData.deal_type === 'sale' ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl">
                <label className="block text-xs font-bold text-emerald-400 mb-2">قیمت کل (تومان) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  <input type="text" value={formData.price_total} onChange={e=>setFormData({...formData, price_total: formatPrice(formatInputToNumber(e.target.value))})} placeholder="مثال: 5,000,000,000" className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl pr-10 pl-4 py-4 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 shadow-inner nums-fa" dir="ltr" />
                </div>
                {formData.price_total && <p className="text-emerald-400 text-xs font-bold mt-2 pr-1">{numberToPersianWords(formatInputToNumber(formData.price_total))}</p>}
              </div>
            ) : (
              <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-2">مبلغ رهن (تومان) <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.price_mortgage} onChange={e=>setFormData({...formData, price_mortgage: formatPrice(formatInputToNumber(e.target.value))})} placeholder="500,000,000" className="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-3.5 text-base font-bold text-blue-400 focus:outline-none focus:border-blue-500 nums-fa" dir="ltr" />
                  {formData.price_mortgage && <p className="text-blue-400 text-xs font-bold mt-1.5 pr-1">{numberToPersianWords(formatInputToNumber(formData.price_mortgage))}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-sky-400 mb-2">مبلغ اجاره (تومان) <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.price_rent} onChange={e=>setFormData({...formData, price_rent: formatPrice(formatInputToNumber(e.target.value))})} placeholder="15,000,000" className="w-full bg-slate-900 border border-sky-500/30 rounded-xl px-4 py-3.5 text-base font-bold text-sky-400 focus:outline-none focus:border-sky-500 nums-fa" dir="ltr" />
                  {formData.price_rent && <p className="text-sky-400 text-xs font-bold mt-1.5 pr-1">{numberToPersianWords(formatInputToNumber(formData.price_rent))}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/50">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نام مالک (محرمانه)</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={formData.owner_name} onChange={e=>setFormData({...formData, owner_name:e.target.value})} placeholder="مثال: آقای رضایی" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-3.5 text-sm text-slate-100 focus:border-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">موبایل مالک (محرمانه)</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="tel" value={formData.owner_phone} onChange={e=>setFormData({...formData, owner_phone:e.target.value})} placeholder="0912..." className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-3.5 text-sm text-slate-100 focus:border-emerald-500 outline-none nums-fa" dir="ltr" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl cursor-pointer" onClick={() => setFormData({...formData, is_exclusive: !formData.is_exclusive})}>
              <div className={`w-5 h-5 rounded flex items-center justify-center border ${formData.is_exclusive ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-500 bg-slate-800'}`}>
                {formData.is_exclusive && <Check className="w-3.5 h-3.5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-amber-400 flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> این یک فایل "شخصی" است</p>
                <p className="text-[10px] text-amber-500/70 mt-0.5">فقط خودم و مدیر می‌بینیم (در بانک املاک عمومی قرار نمی‌گیرد).</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">توضیحات تکمیلی برای پرزنت</label>
              <textarea value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} rows={3} placeholder="دسترسی عالی، نورگیر فوق‌العاده..." className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 focus:border-emerald-500 outline-none resize-none"></textarea>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-700/50">
          {step > 1 && (
            <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-all font-bold text-sm">
              <ArrowRight className="w-4 h-4" /> مرحله قبل
            </button>
          )}
          <div className="flex-1"></div>
          {step < 3 ? (
            <button onClick={handleNext} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all font-bold text-sm">
              مرحله بعد <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submitForm} disabled={loading} className="flex items-center gap-2 px-10 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all font-bold text-base w-full sm:w-auto justify-center">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><CheckCircle2 className="w-5 h-5" /> ثبت نهایی در سیستم</>}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}