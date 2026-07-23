import { useState } from 'react';
import {
  Phone,
  Target,
  GripVertical,
  Briefcase,
  Home,
  Building2,
  Store,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

type ColumnId = 'new' | 'visiting' | 'meeting' | 'success';

type Client = {
  id: string;
  name: string;
  phone: string;
  budget: string;
  property: string;
  propertyType: 'home' | 'apt' | 'office' | 'shop';
  column: ColumnId;
};

const initialClients: Client[] = [
  { id: 'c1', name: 'کوروش تهرانی', phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹', budget: '۵۰ میلیارد تومان', property: 'ویلا — نیاوران', propertyType: 'home', column: 'new' },
  { id: 'c2', name: 'مریم احمدی', phone: '۰۹۳۵ ۱۲۳ ۴۵۶۷', budget: '۱۲ میلیارد تومان', property: 'آپارتمان — سعادت‌آباد', propertyType: 'apt', column: 'new' },
  { id: 'c3', name: 'سامان رضایی', phone: '۰۹۱۹ ۸۷۶ ۵۴۳۲', budget: '۲۸ میلیارد تومان', property: 'مغازه — میرداماد', propertyType: 'shop', column: 'visiting' },
  { id: 'c4', name: 'نگار صادقی', phone: '۰۹۰۱ ۲۳۴ ۵۶۷۸', budget: '۴۵ میلیارد تومان', property: 'دفتر کار — ولیعصر', propertyType: 'office', column: 'visiting' },
  { id: 'c5', name: 'امیر کاظمی', phone: '۰۹۱۲ ۹۸۷ ۶۵۴۳', budget: '۶۵ میلیارد تومان', property: 'ویلا — فرحزاد', propertyType: 'home', column: 'meeting' },
  { id: 'c6', name: 'پریسا نوری', phone: '۰۹۳۸ ۴۵۶ ۷۸۹۰', budget: '۱۸ میلیارد تومان', property: 'آپارتمان — زعفرانیه', propertyType: 'apt', column: 'meeting' },
  { id: 'c7', name: 'حسین مرادی', phone: '۰۹۱۱ ۵۴۳ ۲۱۰۹', budget: '۸۰ میلیارد تومان', property: 'ویلا — لواسان', propertyType: 'home', column: 'success' },
  { id: 'c8', name: 'الهام شریفی', phone: '۰۹۰۳ ۸۷۶ ۵۴۳۱', budget: '۳۲ میلیارد تومان', property: 'مغازه — تجریش', propertyType: 'shop', column: 'success' },
];

const columns: {
  id: ColumnId;
  title: string;
  accent: 'blue' | 'yellow' | 'purple' | 'emerald';
  dot: string;
  headerBg: string;
}[] = [
  { id: 'new', title: 'لید جدید', accent: 'blue', dot: 'bg-blue-500', headerBg: 'bg-blue-500/5' },
  { id: 'visiting', title: 'در حال بازدید', accent: 'yellow', dot: 'bg-amber-500', headerBg: 'bg-amber-500/5' },
  { id: 'meeting', title: 'جلسه در دفتر', accent: 'purple', dot: 'bg-purple-500', headerBg: 'bg-purple-500/5' },
  { id: 'success', title: 'قرارداد موفق', accent: 'emerald', dot: 'bg-emerald-500', headerBg: 'bg-emerald-500/5' },
];

const propertyIcons = {
  home: Home,
  apt: Building2,
  office: Briefcase,
  shop: Store,
};

function avatarColor(name: string): string {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-amber-500 to-amber-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-rose-500 to-rose-700',
    'from-cyan-500 to-cyan-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function ClientCard({
  client,
  onDragStart,
  onDragEnd,
}: {
  client: Client;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  const PropertyIcon = propertyIcons[client.propertyType];
  const initial = client.name.charAt(0);

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 animate-fade-in-up"
    >
      <CardContent className="p-4">
        {/* Top row: avatar + name + drag handle */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(client.name)} text-white text-base font-bold shrink-0 shadow-lg`}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-100 truncate">{client.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5 nums-fa" dir="ltr">
              {client.phone}
            </p>
          </div>
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>

        {/* Property + budget */}
        <div className="space-y-2 mb-3.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <PropertyIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{client.property}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">بودجه</span>
            <span className="text-xs font-bold text-emerald-400 nums-fa">
              {client.budget}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-slate-700/40">
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors">
            <Phone className="w-3.5 h-3.5" />
            تحلیل تماس (AI)
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors">
            <Target className="w-3.5 h-3.5" />
            تارگت‌یابی
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KanbanBoard() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDrop = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    if (draggedId) {
      setClients((prev) =>
        prev.map((c) => (c.id === draggedId ? { ...c, column: colId } : c))
      );
    }
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragLeave = (colId: ColumnId) => {
    setDragOverCol((prev) => (prev === colId ? null : prev));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {columns.map((col) => {
        const colClients = clients.filter((c) => c.column === col.id);
        const isDragOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => handleDragLeave(col.id)}
            className={`flex flex-col rounded-2xl border transition-all duration-200 ${
              isDragOver
                ? 'border-slate-500 bg-slate-800/60 scale-[1.01]'
                : 'border-slate-800 bg-slate-800/30'
            }`}
          >
            {/* Column header */}
            <div className={`flex items-center justify-between p-4 rounded-t-2xl ${col.headerBg}`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-bold text-slate-100">{col.title}</h3>
              </div>
              <Badge variant={col.accent}>
                {colClients.length.toString().replace(/\d/g, (d) =>
                  '۰۱۲۳۴۵۶۷۸۹'[+d]
                )}
              </Badge>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-3 p-3 min-h-[200px] flex-1">
              {colClients.map((client) => (
                <div
                  key={client.id}
                  className={`transition-all duration-200 ${
                    draggedId === client.id
                      ? 'opacity-30 scale-95'
                      : 'opacity-100'
                  }`}
                >
                  <ClientCard
                    client={client}
                    onDragStart={(e) => handleDragStart(e, client.id)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}

              {colClients.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-[120px] rounded-xl border border-dashed border-slate-700/50 text-xs text-slate-600">
                  کارتی اینجا نیست
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
