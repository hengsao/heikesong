import { useState } from 'react';
import { BookOpen, ClipboardList, ChevronDown, ChevronUp, PlayCircle, Star } from 'lucide-react';
import type { AIStatus, KnowledgePoint, QuizQuestion } from '../types';
import AIStatusBadge from './AIStatusBadge';

interface QuizGeneratorProps {
  questions: QuizQuestion[];
  knowledgePoints: KnowledgePoint[];
  aiStatus: AIStatus;
  onStart: () => void;
  /** 英语/语文阅读原文，非空时在题目上方显示原文卡片 */
  originalArticle?: string;
}

const typeLabel: Record<string, string> = {
  single: '单选题',
  judge: '判断题',
  short: '简答题',
  fill: '填空题',
  solution: '解答题',
  material: '材料分析题',
};

const difficultyColor: Record<string, string> = {
  '简单': 'bg-emerald-50 text-emerald-700',
  '中等': 'bg-amber-50 text-amber-700',
  '较难': 'bg-rose-50 text-rose-700',
};

const qualityColor = (score: number): { bg: string; text: string; label: string } => {
  if (score >= 90) return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '优秀' };
  if (score >= 80) return { bg: 'bg-sky-50', text: 'text-sky-700', label: '良好' };
  return { bg: 'bg-amber-50', text: 'text-amber-700', label: '待改进' };
};

export default function QuizGenerator({ questions, knowledgePoints, aiStatus, onStart, originalArticle }: QuizGeneratorProps) {
  const [articleCollapsed, setArticleCollapsed] = useState(false);
  const getKnowledgeTitle = (id: string) => knowledgePoints.find((item) => item.id === id)?.title ?? '知识点';

  // 整体质量统计
  const totalScore = questions.reduce((sum, q) => sum + (q.qualityScore ?? 100), 0);
  const avgScore = questions.length > 0 ? Math.round(totalScore / questions.length) : 0;
  const avgColor = qualityColor(avgScore);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">测评题库</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">智能测评题目</h2>
          <p className="mt-2 text-slate-600">
            题目覆盖单选、判断和简答，题干、选项、解析与来源依据均可在路演中直接展示。
            {questions.length > 0 && (
              <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${avgColor.bg} ${avgColor.text}`}>
                <Star className="h-3 w-3" />
                整体质量 {avgScore} 分（{avgColor.label}）
              </span>
            )}
          </p>
          <div className="mt-3">
            <AIStatusBadge status={aiStatus} />
          </div>
        </div>
        <button onClick={onStart} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
          <PlayCircle className="h-5 w-5" />
          开始答题
        </button>
      </div>

      {/* 阅读原文卡片 - 英语/语文科目显示 */}
      {originalArticle ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setArticleCollapsed((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-sky-600" />
              <span className="text-lg font-semibold text-slate-900">阅读原文</span>
            </div>
            {articleCollapsed ? (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {!articleCollapsed ? (
            <div className="border-t border-slate-100 px-5 py-4">
              <div
                className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-[15px] leading-[1.8] text-slate-800"
                style={{ wordBreak: 'break-word' }}
              >
                {originalArticle}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {questions.map((question, index) => {
          const score = question.qualityScore ?? 100;
          const qColor = qualityColor(score);
          const targetAbility = question.targetAbility || question.learningObjective;

          return (
            <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* 标签行：题型 + 考试模式 + 难度 + 考点 + 质量 */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">{typeLabel[question.type] || question.type}</span>
                {question.examPattern ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">{question.examPattern}</span>
                ) : null}
                <span className={`rounded-full px-3 py-1 font-medium ${difficultyColor[question.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                  {question.difficulty}
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">{getKnowledgeTitle(question.knowledgePointId)}</span>
                {/* 质量分标签 */}
                <span className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${qColor.bg} ${qColor.text}`}>
                  <Star className="h-3 w-3" />
                  {score} 分
                </span>
              </div>

              {/* 考查目标 */}
              {targetAbility ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-sm">
                  <span className="shrink-0 rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">考查目标</span>
                  <span className="leading-6 text-indigo-800">{targetAbility}</span>
                </div>
              ) : null}

              <div className="mt-4 flex gap-3">
                <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-7 text-slate-950">{index + 1}. {question.question}</h3>

                  {question.options ? (
                    <div className="mt-3 grid gap-2">
                      {question.options.map((option, optionIndex) => (
                        <p
                          key={`${question.id}-${optionIndex}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
                        >
                          <span className="mr-2 font-semibold text-slate-900">{String.fromCharCode(65 + optionIndex)}.</span>
                          {option}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {/* 来源依据（默认折叠） */}
                  {question.sourceEvidence ? (
                    <details className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-sky-700">来源依据（点击展开）</summary>
                      <p className="mt-2 text-sm leading-6 text-sky-800">{question.sourceEvidence}</p>
                    </details>
                  ) : null}

                  {/* 命题蓝图信息（默认折叠） */}
                  {(question.blueprintId || question.requiredMethods?.length) ? (
                    <details className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-violet-700">命题蓝图（点击展开）</summary>
                      <div className="mt-2 space-y-2 text-sm">
                        {question.blueprintId ? (
                          <p className="text-violet-800"><span className="font-semibold">蓝图ID：</span>{question.blueprintId}</p>
                        ) : null}
                        {question.requiredMethods?.length ? (
                          <p className="text-violet-800"><span className="font-semibold">必需方法：</span>{question.requiredMethods.join(' → ')}</p>
                        ) : null}
                      </div>
                    </details>
                  ) : null}

                  {/* 常见误区和得分点 */}
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    {question.commonMistake && question.commonMistake.length > 10 ? (
                      <p className="rounded-xl bg-rose-50 p-3 leading-6 text-rose-700">
                        <span className="font-semibold">常见误区：</span>{question.commonMistake}
                      </p>
                    ) : null}
                    {question.scoringRubric?.length ? (
                      <p className="rounded-xl bg-emerald-50 p-3 leading-6 text-emerald-700 md:col-span-2">
                        <span className="font-semibold">得分点：</span>{question.scoringRubric.join('；')}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">解析将在提交测评后展示。</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
