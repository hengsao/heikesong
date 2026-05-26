import { BrainCircuit, KeyRound, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { AIStatus } from '../types';
import AISettingsPanel from './AISettingsPanel';
import AIStatusBadge from './AIStatusBadge';

interface HeaderProps {
  onReset: () => void;
  aiStatus: AIStatus;
  onAIStatusChange: (status: AIStatus) => void;
}

export default function Header({ onReset, aiStatus, onAIStatusChange }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <button onClick={onReset} className="focus-ring flex items-center gap-3 rounded-xl text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-950">智学闭环</span>
            <span className="block text-xs text-slate-500">AI 学习测评与复习工具</span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <AIStatusBadge status={aiStatus} />
          <button
            onClick={() => setSettingsOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
          >
            <KeyRound className="h-4 w-4" />
            接入真实 AI
          </button>
          <button
            onClick={onReset}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
          >
            <RotateCcw className="h-4 w-4" />
            重新演示
          </button>
        </div>
      </div>
      <AISettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onStatusChange={onAIStatusChange} />
    </header>
  );
}
