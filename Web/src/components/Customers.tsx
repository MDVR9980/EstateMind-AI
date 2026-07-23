import { useState, useEffect, useRef } from 'react';
import { 
  Search, Users, Star, Flame, Snowflake, Mic, 
  Radar, X, Activity, CheckCircle2, AlertCircle, Phone
} from 'lucide-react';
import api from '../services/api';
import { formatPrice, formatInputToNumber, numberToPersianWords } from '../utils/numberFormat';

export default function Customers() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Call Analyzer States
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [callResult, setCallResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Target Radar States
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqHoods, setReqHoods] = useState('');
  const [reqMaxBudget, setReqMaxBudget] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/clients/app-list');
      if (res.data.status === 'success') {
        setClients(res.data.clients);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCategory = async (clientId: number, category: string) => {
    try {
      await api.put('/api/clients/update-category', { client_id: clientId, category });
      fetchClients();
    } catch (e) {
      alert("خطا در تغییر وضعیت");
    }
  };

  // =====================================
  // ضبط و تحلیل صدا (Call Analyzer)
  // =====================================
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
      alert('لطفاً دسترسی میکروفون را در مرورگر فعال کنید.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendVoiceToAI = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, 'call.webm');
      
      const res = await api.post(`/api/clients/${activeClient.id}/analyze-call`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        setCallResult(res.data.analysis);
      }
    } catch (error) {
      alert('خطا در ارتباط با هوش مصنوعی برای تحلیل تماس.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // =====================================
  // تنظیم رادار (Targeting)
  // =====================================
  const submitRequirement = async () => {
    if (!reqHoods) return alert("محله‌های درخواستی را وارد کنید.");
    try {
      const payload = {
        client_id: activeClient.id,
        deal_type: 'sale',
        property_type: 'apartment',
        preferred_neighborhoods: reqHoods,
        min_budget: 0,
        max_budget: formatInputToNumber(reqMaxBudget)
      };
      const res = await api.post('/api/clients/add-requirement', payload);
      if (res.data.status === 'success') {
        alert('رادار تنظیم شد! به محض شکار فایل مناسب آلارم دریافت می‌کنید.');
        setReqModalOpen(false);
        setReqHoods('');
        setReqMaxBudget('');
      }
    } catch (e) {
      alert("خطا در ثبت رادار");
    }
  };

  const filteredClients = clients.filter(c => c.name.includes(searchQuery) || c.phone.includes(searchQuery));

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="text-emerald-500 w-6 h-6" /> دفترچه مشتریان هوشمند
          </h2>
          <p className="text-sm text-slate-500 mt-1">مدیریت لیدها، کمپین‌های قطره‌ای و تحلیل مکالمات</p>
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام یا موبایل مشتری..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center mt-20 text-slate-500">مشتری یافت نشد.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            let catColor = 'emerald'; let CatIcon = Users;
            if (client.client_category === 'vip') { catColor = 'purple'; CatIcon = Star; }
            else if (client.client_category === 'hot_lead') { catColor = 'rose'; CatIcon = Flame; }
            else if (client.client_category === 'cold') { catColor = 'blue'; CatIcon = Snowflake; }

            return (
              <div key={client.id} className={`bg-slate-800/80 border-r-4 border-slate-700 rounded-2xl p-5 hover:bg-slate-800 transition-all shadow-lg border-r-${catColor}-500`}>
                <div className="flex items-start justify-between mb-4 border-b border-slate-700/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-${catColor}-500/10 text-${catColor}-400 border border-${catColor}-500/20`}>
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{client.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 nums-fa" dir="ltr">{client.phone}</p>
                    </div>
                  </div>
                  
                  {/* Category Selector */}
                  <select 
                    value={client.client_category} 
                    onChange={(e) => handleChangeCategory(client.id, e.target.value)}
                    className={`bg-${catColor}-500/10 text-${catColor}-400 border border-${catColor}-500/20 rounded-lg text-xs font-bold py-1.5 px-2 outline-none cursor-pointer`}
                  >
                    <option value="normal" className="bg-slate-800 text-slate-200">عادی</option>
                    <option value="vip" className="bg-slate-800 text-purple-400">VIP 👑</option>
                    <option value="hot_lead" className="bg-slate-800 text-rose-400">داغ 🔥</option>
                    <option value="cold" className="bg-slate-800 text-blue-400">سرد (کمپین) ❄️</option>
                  </select>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/50">
                    <span className="text-xs text-slate-500">مرحله قیف:</span>
                    <span className="text-xs font-bold text-slate-300">{client.funnel_stage}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setActiveClient(client); setCallResult(null); setCallModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" /> تحلیل تماس
                  </button>
                  <button 
                    onClick={() => { setActiveClient(client); setReqModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Radar className="w-3.5 h-3.5" /> تارگت‌یابی
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================== */}
      {/* MODAL: Call Analyzer (تحلیلگر تماس) */}
      {/* ================================== */}
      {callModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Phone className="w-5 h-5"/> تحلیلگر مکالمه AI</h3>
              <button onClick={() => { setCallModalOpen(false); setCallResult(null); stopRecording(); }} className="text-slate-500 hover:text-rose-400"><X className="w-5 h-5"/></button>
            </div>
            
            <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
              مکالمه خود با <strong className="text-white">{activeClient?.name}</strong> را ضبط کنید تا هوش مصنوعی آن را خلاصه کرده و احساسات مشتری را بسنجد.
            </p>

            <div className="flex flex-col items-center justify-center mb-8">
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-blue-400">در حال استخراج احساسات و متن...</span>
                </div>
              ) : (
                <>
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-rose-500 scale-110 animate-pulse shadow-rose-500/50' : 'bg-blue-500 hover:scale-105 shadow-blue-500/50'}`}
                  >
                    <Mic className="w-10 h-10 text-white" />
                  </button>
                  <span className={`text-xs mt-4 font-bold ${isRecording ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
                    {isRecording ? 'در حال شنیدن... رها کنید تا پردازش شود' : 'دکمه را نگه دارید و صحبت کنید'}
                  </span>
                </>
              )}
            </div>

            {callResult && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 animate-fade-in-up">
                <h4 className="text-sm font-bold text-blue-400 mb-2">خلاصه مکالمه:</h4>
                <p className="text-sm text-slate-200 leading-relaxed mb-4">{callResult.summary}</p>
                <div className="border-t border-slate-700/50 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-400">حالت احساسی (Sentiment):</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    callResult.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                    callResult.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {callResult.sentiment === 'positive' ? 'راغب و مثبت 😊' : callResult.sentiment === 'negative' ? 'ناراضی / سرد 😠' : 'معمولی 😐'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================== */}
      {/* MODAL: Radar Target (تارگت‌یابی) */}
      {/* ================================== */}
      {reqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2"><Radar className="w-5 h-5"/> تارگت‌یابی هوشمند</h3>
              <button onClick={() => setReqModalOpen(false)} className="text-slate-500 hover:text-rose-400"><X className="w-5 h-5"/></button>
            </div>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">با تنظیم این بخش، هر زمان فایل مناسبی در سیستم ثبت شود (حتی توسط ربات دیوار)، سیستم به شما آلارم می‌دهد.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">محله‌های درخواستی (با ویرگول جدا کنید) <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={reqHoods}
                  onChange={e => setReqHoods(e.target.value)}
                  placeholder="مثال: سجاد، هاشمیه" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">حداکثر بودجه</label>
                <input 
                  type="text" 
                  value={reqMaxBudget}
                  onChange={e => setReqMaxBudget(formatPrice(formatInputToNumber(e.target.value)))}
                  placeholder="مثال: 10,000,000,000" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-purple-300 font-bold focus:outline-none focus:border-purple-500 nums-fa" dir="ltr"
                />
                {reqMaxBudget && <p className="text-purple-400 text-xs font-bold mt-2 text-right">{numberToPersianWords(formatInputToNumber(reqMaxBudget))}</p>}
              </div>

              <button 
                onClick={submitRequirement}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/30 transition-all mt-4"
              >
                فعال‌سازی ردیاب مشتری
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}