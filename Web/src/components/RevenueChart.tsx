import { useState } from 'react';
import { TrendingUp, MoreHorizontal } from 'lucide-react';

const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر'];
const revenue = [420, 510, 480, 620, 710, 680, 820];
const target = [400, 450, 500, 550, 600, 650, 700];

export default function RevenueChart() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const w = 720;
  const h = 260;
  const padX = 50;
  const padY = 30;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const max = Math.max(...revenue, ...target) * 1.1;
  const min = 0;
  const range = max - min || 1;

  const xStep = innerW / (months.length - 1);
  const toX = (i: number) => padX + i * xStep;
  const toY = (v: number) => padY + innerH - ((v - min) / range) * innerH;

  const revPoints = revenue.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const tgtPoints = target.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const revArea = `${padX},${padY + innerH} ${revPoints} ${padX + innerW},${padY + innerH}`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => padY + innerH - f * innerH);

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 lg:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">درآمد ماهانه</h3>
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              ۲۳٪ رشد
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">میلیارد تومان — نیمه اول ۱۴۰۴</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              درآمد واقعی
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-full bg-slate-600" />
              هدف
            </span>
          </div>
          <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-[260px] min-w-[480px]"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {gridLines.map((y, i) => (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={w - padX}
              y2={y}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Y labels */}
          {gridLines.map((y, i) => (
            <text
              key={`y${i}`}
              x={padX - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-600"
              style={{ fontSize: '11px' }}
            >
              {Math.round(max * (1 - i / 4))}
            </text>
          ))}

          {/* Target line */}
          <polyline
            points={tgtPoints}
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />

          {/* Revenue area + line */}
          <polygon points={revArea} fill="url(#revGrad)" />
          <polyline
            points={revPoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-line"
          />

          {/* Points + hover */}
          {revenue.map((v, i) => (
            <g key={i}>
              <rect
                x={toX(i) - xStep / 2}
                y={padY}
                width={xStep}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
              <circle
                cx={toX(i)}
                cy={toY(v)}
                r={hoverIdx === i ? 6 : 4}
                fill="#0f172a"
                stroke="#10b981"
                strokeWidth="2.5"
                className="transition-all duration-150"
              />
              {hoverIdx === i && (
                <g>
                  <line
                    x1={toX(i)}
                    y1={padY}
                    x2={toX(i)}
                    y2={padY + innerH}
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.5"
                  />
                  <g transform={`translate(${toX(i)}, ${toY(v) - 16})`}>
                    <rect
                      x="-34"
                      y="-22"
                      width="68"
                      height="24"
                      rx="6"
                      fill="#1e293b"
                      stroke="#334155"
                    />
                    <text
                      x="0"
                      y="-6"
                      textAnchor="middle"
                      className="fill-emerald-400"
                      style={{ fontSize: '12px', fontWeight: 700 }}
                    >
                      {v} میلیارد
                    </text>
                  </g>
                </g>
              )}
            </g>
          ))}

          {/* X labels */}
          {months.map((m, i) => (
            <text
              key={m}
              x={toX(i)}
              y={h - 8}
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: '11px' }}
            >
              {m}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
