import type { AppStep } from '../types';

interface StepIndicatorProps {
  currentStep: AppStep;
  visitedSteps: AppStep[];
  onStepClick: (step: AppStep) => void;
}

const mainSteps: Array<{ label: string; steps: AppStep[]; target: AppStep; hint: string }> = [
  { label: '资料输入', steps: ['material'], target: 'material', hint: '导入资料' },
  { label: '知识学习', steps: ['knowledge'], target: 'knowledge', hint: '提取考点' },
  { label: '智能测评', steps: ['quiz', 'taking', 'result'], target: 'quiz', hint: '出题答题' },
  { label: '错题诊断', steps: ['diagnosis'], target: 'diagnosis', hint: '定位错因' },
  { label: '复习强化', steps: ['plan', 'reinforcement'], target: 'plan', hint: '计划与变式' },
  { label: '学习报告', steps: ['report'], target: 'report', hint: '导出文档' },
];

const smallStepLabel: Record<AppStep, string> = {
  home: '首页',
  material: '资料输入',
  knowledge: '知识点与出题设置',
  quiz: '题目预览',
  taking: '在线答题',
  result: '测评结果',
  diagnosis: '错因诊断',
  plan: '复习计划',
  reinforcement: '强化训练',
  report: '学习报告',
};

export default function StepIndicator({ currentStep, visitedSteps, onStepClick }: StepIndicatorProps) {
  if (currentStep === 'home') return null;

  const activeMainIndex = mainSteps.findIndex((item) => item.steps.includes(currentStep));
  const currentMain = mainSteps[activeMainIndex] ?? mainSteps[0];
  const currentSmallSteps = currentMain.steps;

  return (
    <div className="no-print mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <div className="rounded-[1.75rem] bg-white p-2 ring-1 ring-slate-200 shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {mainSteps.map((item, index) => {
              const isActive = index === activeMainIndex;
              const isDone = index < activeMainIndex;
              const canClick = item.steps.some((step) => visitedSteps.includes(step)) && !isActive;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={!canClick}
                  onClick={() => onStepClick(item.target)}
                  className={`flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-[0_14px_38px_rgba(15,23,42,0.20)]'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-400'
                  } ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isActive ? 'bg-white/12' : 'bg-white'}`}>
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`block text-[11px] ${isActive ? 'text-white/65' : 'text-slate-400'}`}>{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 px-2 pb-1">
          {currentSmallSteps.map((step) => {
            const isActive = step === currentStep;
            const canClick = visitedSteps.includes(step) && !isActive;
            return (
              <button
                key={step}
                type="button"
                disabled={!canClick}
                onClick={() => onStepClick(step)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? 'bg-sky-100 text-sky-700' : canClick ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-400'
                }`}
              >
                {smallStepLabel[step]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
