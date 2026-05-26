import { Cpu, WifiOff } from 'lucide-react';
import type { AIStatus } from '../types';

interface AIStatusBadgeProps {
  status: AIStatus;
}

export default function AIStatusBadge({ status }: AIStatusBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
        status.isRealAI
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
      title={status.isRealAI ? '当前正在使用真实外部大模型 API' : '当前使用本地 Mock 规则生成，适合离线演示'}
    >
      {status.isRealAI ? <Cpu className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {status.modeLabel}
    </div>
  );
}
