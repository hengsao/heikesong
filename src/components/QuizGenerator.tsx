import { ClipboardList, PlayCircle } from 'lucide-react';
import type { AIStatus, KnowledgePoint, QuizQuestion } from '../types';
import AIStatusBadge from './AIStatusBadge';

interface QuizGeneratorProps {
  questions: QuizQuestion[];
  knowledgePoints: KnowledgePoint[];
  aiStatus: AIStatus;
  onStart: () => void;
}

const typeLabel = {
  single: '单选题',
  judge: '判断题',
  short: '简答题',
  fill: '填空题',
  solution: '解答题',
  material: '材料分析题',
};

export default function QuizGenerator({ questions, knowledgePoints, aiStatus, onStart }: QuizGeneratorProps) {
  const getKnowledgeTitle = (id: string) => knowledgePoints.find((item) => item.id === id)?.title ?? '知识点';
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">测评题库</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">智能测评题目</h2>
          <p className="mt-2 text-slate-600">题目覆盖单选、判断和简答，题干、选项、解析与来源依据均可在路演中直接展示。</p>
          <div className="mt-3">
            <AIStatusBadge status={aiStatus} />
          </div>
        </div>
        <button onClick={onStart} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
          <PlayCircle className="h-5 w-5" />
          开始答题
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">{typeLabel[question.type]}</span>
              {question.examPattern ? <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">{question.examPattern}</span> : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">{question.difficulty}</span>
              <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">{getKnowledgeTitle(question.knowledgePointId)}</span>
            </div>
            <div className="mt-4 flex gap-3">
              <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-7 text-slate-950">{index + 1}. {question.question}</h3>
                {question.options ? (
                  <div className="mt-3 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <p key={`${question.id}-${optionIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                        <span className="mr-2 font-semibold text-slate-900">{String.fromCharCode(65 + optionIndex)}.</span>
                        {option}
                      </p>
                    ))}
                  </div>
                ) : null}
                {question.sourceEvidence ? (
                  <details className="mt-3 rounded-xl bg-sky-50 p-3 text-sm leading-6 text-sky-700">
                    <summary className="cursor-pointer font-semibold">来源依据</summary>
                    <p className="mt-2">{question.sourceEvidence}</p>
                  </details>
                ) : null}
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  {question.learningObjective ? (
                    <details className="rounded-xl bg-slate-50 p-3 leading-6 text-slate-600">
                      <summary className="cursor-pointer font-semibold text-slate-900">考查目标</summary>
                      <p className="mt-2">{question.learningObjective}</p>
                    </details>
                  ) : null}
                  {question.commonMistake ? <p className="rounded-xl bg-rose-50 p-3 leading-6 text-rose-700"><span className="font-semibold">常见误区：</span>{question.commonMistake}</p> : null}
                  {question.scoringRubric?.length ? <p className="rounded-xl bg-emerald-50 p-3 leading-6 text-emerald-700 md:col-span-2"><span className="font-semibold">得分点：</span>{question.scoringRubric.join('；')}</p> : null}
                </div>
                {import.meta.env.DEV && typeof question.qualityScore === 'number' ? <p className="mt-2 text-xs text-slate-400">题目质量评分：{question.qualityScore}/100</p> : null}
                <p className="mt-2 text-sm text-slate-500">解析将在提交测评后展示。</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
