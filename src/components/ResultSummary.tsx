import { AlertTriangle, CheckCircle2, Gauge, Trophy } from 'lucide-react';
import type { KnowledgePoint, QuizQuestion, QuizResult } from '../types';
import StatCard from './StatCard';

interface ResultSummaryProps {
  result: QuizResult;
  questions: QuizQuestion[];
  knowledgePoints: KnowledgePoint[];
  onDiagnosis: () => void;
}

export default function ResultSummary({ result, questions, knowledgePoints, onDiagnosis }: ResultSummaryProps) {
  const getQuestion = (id: string) => questions.find((item) => item.id === id);
  const getKnowledgeTitle = (id: string) => knowledgePoints.find((item) => item.id === id)?.title ?? '知识点';

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">学习分析</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">测评结果</h2>
          <p className="mt-2 text-slate-600">系统已完成自动评分，并按知识点计算掌握情况与错题证据。</p>
        </div>
        <button onClick={onDiagnosis} className="focus-ring rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">生成错因诊断</button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Trophy} label="总分" value={`${result.score} 分`} tone="cyan" />
        <StatCard icon={Gauge} label="掌握率" value={`${result.masteryRate}%`} tone="green" />
        <StatCard icon={CheckCircle2} label="正确题数" value={`${result.correctCount}`} tone="violet" />
        <StatCard icon={AlertTriangle} label="错误题数" value={`${result.wrongCount}`} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-950">各知识点掌握情况</h3>
          <div className="mt-5 space-y-4">
            {result.byKnowledgePoint.map((item) => (
              <div key={item.knowledgePoint.id}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.knowledgePoint.title}</span>
                  <span className="text-slate-500">{item.masteryRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.masteryRate >= 75 ? 'bg-emerald-500' : item.masteryRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${item.masteryRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-950">薄弱知识点</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.weakKnowledgePoints.length === 0 ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">暂无明显薄弱点</span>
            ) : (
              result.weakKnowledgePoints.map((item) => (
                <span key={item.id} className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">{item.title}</span>
              ))
            )}
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">评委可以从下方错题证据看到用户答案、正确答案、标准步骤、得分点命中、缺失得分点和常见误区。</p>
        </div>
      </div>

      <div className="mt-6 glass-panel rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-slate-950">错题证据</h3>
        <div className="mt-5 space-y-3">
          {result.wrongQuestions.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 p-4 text-emerald-700">本次没有错题，可以进入复习计划做迁移训练。</p>
          ) : (
            result.wrongQuestions.map((wrong) => {
              const question = getQuestion(wrong.questionId);
              return (
                <div key={wrong.questionId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold leading-6 text-slate-950">{question?.question}</p>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <p className="rounded-xl bg-rose-50 p-3 text-slate-700"><span className="font-semibold text-rose-700">用户答案：</span>{wrong.userAnswer || '未作答'}</p>
                    <p className="rounded-xl bg-emerald-50 p-3 text-slate-700"><span className="font-semibold text-emerald-700">正确答案：</span>{question?.answer}</p>
                    {question?.solutionSteps?.length ? (
                      <div className="rounded-xl bg-white p-3 leading-6 text-slate-700 md:col-span-2">
                        <span className="font-semibold text-slate-900">标准步骤：</span>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 font-mono text-[13px]">
                          {question.solutionSteps.map((step) => <li key={step}>{step}</li>)}
                        </ol>
                      </div>
                    ) : null}
                    {wrong.matchedRubric?.length ? <p className="rounded-xl bg-emerald-50 p-3 leading-6 text-emerald-700"><span className="font-semibold">已命中得分点：</span>{wrong.matchedRubric.join('；')}</p> : null}
                    {wrong.missingRubric?.length ? <p className="rounded-xl bg-amber-50 p-3 leading-6 text-amber-800"><span className="font-semibold">缺失得分点：</span>{wrong.missingRubric.join('；')}</p> : null}
                    <p className="rounded-xl bg-slate-50 p-3 leading-6 text-slate-700 md:col-span-2"><span className="font-semibold text-slate-900">答案解析：</span>{question?.explanation}</p>
                    {question?.commonMistake ? <p className="rounded-xl bg-rose-50 p-3 leading-6 text-rose-700 md:col-span-2"><span className="font-semibold">常见误区：</span>{question.commonMistake}</p> : null}
                    {wrong.feedback ? <p className="rounded-xl bg-violet-50 p-3 leading-6 text-violet-700 md:col-span-2"><span className="font-semibold">评分反馈：</span>{wrong.feedback}</p> : null}
                    {question?.sourceEvidence ? <p className="rounded-xl bg-sky-50 p-3 leading-6 text-sky-700 md:col-span-2"><span className="font-semibold">来源依据：</span>{question.sourceEvidence}</p> : null}
                    <p className="rounded-xl bg-violet-50 p-3 text-slate-700"><span className="font-semibold text-violet-700">对应知识点：</span>{question ? getKnowledgeTitle(question.knowledgePointId) : '未知'}</p>
                    <p className="rounded-xl bg-amber-50 p-3 text-slate-700"><span className="font-semibold text-amber-700">得分情况：</span>{wrong.score}/{wrong.maxScore}</p>
                    <p className="rounded-xl bg-sky-50 p-3 text-sky-700 md:col-span-2">建议进入二次强化训练，系统会根据该题型生成同类变式题进行错因修复。</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
