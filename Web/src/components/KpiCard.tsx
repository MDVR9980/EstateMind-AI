import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type KpiCardProps = {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  accent: 'emerald' | 'sky' | 'purple';
  spark: number[];
};

const accentMap = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    stroke: '#10b981',
    glow: 'shadow-emerald-500/20',
  },
  sky: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    stroke: '#0ea5e9',
    glow: 'shadow-sky-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    stroke: '#a855f7',
    glow: 'shadow-purple-500/20',
  },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 36;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-9"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function KpiCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  accent,
  spark,
}: KpiCardProps) {
  const a = accentMap[accent];
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="group relative overflow-hidden bg-slate-800 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all duration-300 animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${a.bg} ${a.text} shadow-lg ${a.glow}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trend === 'up'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          <TrendIcon className="w-3.5 h-3.5" />
          {change}
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-100 mb-3 nums-fa">{value}</p>
      <Sparkline data={spark} color={a.stroke} />
    </div>
  );
}
