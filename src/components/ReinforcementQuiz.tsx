import { CheckCircle2, FileCheck2, Lightbulb, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { ReinforcementQuestion } from '../types';

interface ReinforcementQuizProps {
  reinforcementQuiz: ReinforcementQuestion[];
  onRefresh: () => void;
  onReport: () => void;
}

export default function ReinforcementQuiz({ reinforcementQuiz, onRefresh, onReport }: ReinforcementQuizProps) {
  const [visibleAnswers, setVisibleAnswers] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mastery, setMastery] = useState<Record<string, 'mastered' | 'review'>>({});
  const toggleAnswer = (id: string) => {
    setVisibleAnswers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">错因驱动变式训练</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">二次强化训练：同类变式与错因修复</h2>
          <p className="mt-2 text-slate-600">题目来自薄弱知识点和错题题型，默认隐藏答案，先作答再对照标准步骤和得分点。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onRefresh} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50">
            <RotateCcw className="h-5 w-5" />
            刷新生成同类变式
          </button>
          <button onClick={onReport} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
            <FileCheck2 className="h-5 w-5" />
            生成学习报告
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reinforcementQuiz.map((item, index) => (
          <article key={item.id} className="glass-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">{item.knowledgePointTitle}</span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">{item.examPattern}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{item.difficulty}</span>
            </div>
            <h3 className="mt-4 font-semibold leading-7 text-slate-950">{index + 1}. {item.question}</h3>
            <p className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {item.hint}
            </p>
            <textarea
              value={answers[item.id] ?? ''}
              onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
              className="focus-ring mt-4 min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 shadow-sm"
              placeholder="先独立作答，再查看标准答案和解析..."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => toggleAnswer(item.id)} className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50">
                {visibleAnswers.includes(item.id) ? '收起答案' : '查看答案'}
              </button>
              <button onClick={() => setMastery((current) => ({ ...current, [item.id]: 'mastered' }))} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                我已掌握
              </button>
              <button onClick={() => setMastery((current) => ({ ...current, [item.id]: 'review' }))} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
                <RotateCcw className="h-4 w-4" />
                仍需复习
              </button>
            </div>
            {mastery[item.id] ? (
              <p className={`mt-3 rounded-xl p-3 text-sm ${mastery[item.id] === 'mastered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                当前标记：{mastery[item.id] === 'mastered' ? '我已掌握' : '仍需复习'}
              </p>
            ) : null}
            {visibleAnswers.includes(item.id) ? (
              <div className="mt-4 space-y-3">
                <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-700"><span className="font-semibold">标准答案：</span>{item.answer}</p>
                <div className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm">
                  <p className="font-semibold text-slate-950">标准步骤</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 font-mono text-[13px]">
                    {item.solutionSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </div>
                <p className="rounded-xl bg-sky-50 p-3 text-sm leading-6 text-sky-700"><span className="font-semibold">得分点：</span>{item.scoringRubric.join('；')}</p>
                <p className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700"><span className="font-semibold">常见误区：</span>{item.commonMistake}</p>
                {item.sourceEvidence ? <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><span className="font-semibold">来源依据：</span>{item.sourceEvidence}</p> : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
