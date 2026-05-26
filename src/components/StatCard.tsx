import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: 'cyan' | 'green' | 'yellow' | 'red' | 'violet';
}

const toneClass = {
  cyan: 'bg-sky-50 text-sky-700 border-sky-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  yellow: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-rose-50 text-rose-700 border-rose-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
};

export default function StatCard({ label, value, description, icon: Icon, tone = 'cyan' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {description ? <p className="mt-3 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
