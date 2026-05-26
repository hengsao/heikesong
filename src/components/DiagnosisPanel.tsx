import { ArrowRight, Stethoscope } from 'lucide-react';
import type { DiagnosisItem } from '../types';

interface DiagnosisPanelProps {
  diagnosis: DiagnosisItem[];
  onGeneratePlan: () => void;
}

const statusClass = {
  已掌握: 'bg-emerald-500',
  待加强: 'bg-amber-500',
  薄弱: 'bg-rose-500',
};

export default function DiagnosisPanel({ diagnosis, onGeneratePlan }: DiagnosisPanelProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">错题复盘</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">AI 错因诊断</h2>
          <p className="mt-2 text-slate-600">只保留已掌握、待加强、薄弱三种状态，诊断内容围绕具体缺失得分点展开。</p>
        </div>
        <button onClick={onGeneratePlan} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
          生成个性化复习计划
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {diagnosis.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-slate-950">暂无明显错因</h3>
            <p className="mt-3 text-slate-600">本次测评表现稳定，建议进入复习计划继续做迁移应用和综合表达训练。</p>
          </div>
        ) : (
          diagnosis.map((item) => {
            const status = item.masteryStatus ?? '待加强';
            return (
              <article key={item.id} className="rounded-[2rem] bg-white p-5 ring-1 ring-slate-200 shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                    <span className={`h-2 w-2 rounded-full ${statusClass[status]}`} />
                    {status}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-slate-200">{item.reasonType}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-slate-200">{item.knowledgePointTitle}</span>
                </div>
                <h3 className="mt-4 font-semibold leading-7 text-slate-950">{item.question}</h3>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <p className="mb-1 font-semibold text-slate-950">你的错误</p>
                    {item.userAnswer || item.diagnosis}
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <p className="mb-1 font-semibold text-slate-950">正确理解</p>
                    {item.correctUnderstanding}
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <p className="mb-1 font-semibold text-slate-950">缺失得分点</p>
                    {(item.missingRubric?.length ? item.missingRubric : ['关键步骤或材料依据未写完整']).join('；')}
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <p className="mb-1 font-semibold text-slate-950">常见误区</p>
                    {item.commonMistake || '只写结论，没有说明条件、依据或步骤。'}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  <p className="mb-1 font-semibold text-slate-950">复习建议 / 推荐强化题入口</p>
                  {item.suggestion}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
