import type { ReactNode } from 'react';

type BadgeVariant = 'blue' | 'yellow' | 'purple' | 'emerald' | 'muted';

const variants: Record<BadgeVariant, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  yellow: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  muted: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
};

export function Badge({
  children,
  variant = 'muted',
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
