import { useState, useEffect } from 'react';
import { Phone, Target, GripVertical, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import api from '../services/api';

const columns = [
  { id: 'لید جدید', title: 'لید جدید', accent: 'blue', dot: 'bg-blue-500', headerBg: 'bg-blue-500/5' },
  { id: 'بازدید', title: 'در حال بازدید', accent: 'yellow', dot: 'bg-amber-500', headerBg: 'bg-amber-500/5' },
  { id: 'جلسه در دفتر', title: 'جلسه در دفتر', accent: 'purple', dot: 'bg-purple-500', headerBg: 'bg-purple-500/5' },
  { id: 'قرارداد موفق', title: 'قرارداد موفق', accent: 'emerald', dot: 'bg-emerald-500', headerBg: 'bg-emerald-500/5' },
];

export default function KanbanBoard() {
  const [clients, setClients] = useState<any[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // خواندن دیتای مشتریان از بک‌اند به صورت زنده
  useEffect(() => {
    api.get('/api/clients/app-list').then((res) => {
      if (res.data.status === 'success') {
        setClients(res.data.clients);
      }
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedId) {
      // آپدیت سریع در رابط کاربری (خوش‌نمایی)
      setClients((prev) => prev.map((c) => (c.id.toString() === draggedId ? { ...c, funnel_stage: colId } : c)));
      
      // ارسال تغییرات به سرور پایتون
      try {
        await api.put('/api/clients/update-stage', { client_id: parseInt(draggedId), new_stage: colId });
      } catch (err) {
        alert("خطا در جابجایی");
      }
    }
    setDraggedId(null);
    setDragOverCol(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {columns.map((col) => {
        // فیلتر کردن مشتریانی که در این ستون هستند
        const colClients = clients.filter((c) => c.funnel_stage === col.id);
        const isDragOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => setDragOverCol((prev) => (prev === col.id ? null : prev))}
            className={`flex flex-col rounded-2xl border transition-all duration-200 ${isDragOver ? 'border-slate-500 bg-slate-800/60 scale-[1.01]' : 'border-slate-800 bg-slate-800/30'}`}
          >
            <div className={`flex items-center justify-between p-4 rounded-t-2xl ${col.headerBg}`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-bold text-slate-100">{col.title}</h3>
              </div>
              <Badge variant={col.accent as any}>{colClients.length}</Badge>
            </div>

            <div className="flex flex-col gap-3 p-3 min-h-[200px] flex-1">
              {colClients.map((client) => (
                <Card key={client.id} draggable onDragStart={(e) => handleDragStart(e, client.id.toString())} onDragEnd={() => setDraggedId(null)} className="group cursor-grab bg-slate-800/80 p-3 hover:border-slate-600 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold shrink-0">{client.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-100">{client.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 nums-fa" dir="ltr">{client.phone}</p>
                    </div>
                    <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-700/40 pt-3">
                    <span className="text-[11px] text-slate-500">بودجه</span>
                    <span className="text-xs font-bold text-emerald-400 nums-fa">{client.budget_limit > 0 ? (client.budget_limit).toLocaleString() : 'نامحدود'}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}