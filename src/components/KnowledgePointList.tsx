import { ArrowRight, BadgeCheck, Bot, FileText } from 'lucide-react';
import type { ContentType, KnowledgePoint, QuizSettings } from '../types';
import QuizSettingsPanel from './QuizSettingsPanel';
import LearningStatus from './LearningStatus';
import type { StandardKnowledgePoint } from '../services/knowledgeBase';

interface KnowledgePointListProps {
  knowledgePoints: KnowledgePoint[];
  quizSettings: QuizSettings;
  setQuizSettings: (settings: QuizSettings) => void;
  onGenerateQuiz: () => void;
  matchedKnowledgePoints?: StandardKnowledgePoint[];
  isLearning?: boolean;
  contentType?: ContentType;
  examType?: string;
  examQuestionCount?: number;
}

const importanceClass = {
  高: 'bg-rose-50 text-rose-700 border-rose-100',
  中: 'bg-amber-50 text-amber-700 border-amber-100',
  低: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export default function KnowledgePointList({ knowledgePoints, quizSettings, setQuizSettings, onGenerateQuiz, matchedKnowledgePoints = [], isLearning = false, contentType, examType, examQuestionCount = 0 }: KnowledgePointListProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">知识结构化</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">AI 知识点提取结果</h2>
          <p className="mt-2 text-slate-600">已从资料中抽取核心概念、掌握目标、来源依据与可能考查方式。</p>
        </div>
        <button onClick={onGenerateQuiz} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
          提交生成题目
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <LearningStatus matchedPoints={matchedKnowledgePoints} isLearning={isLearning} />
      </div>

      <div className="mb-6">
        <QuizSettingsPanel settings={quizSettings} onChange={setQuizSettings} />
      </div>

      {contentType === 'exam' ? (
        <div className="mb-6 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-bold text-amber-800">AI 已识别到您上传的是真题试卷</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="text-amber-600 font-medium">提取真题</div>
              <div className="text-2xl font-bold text-gray-800">{examQuestionCount || 0} 道</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-amber-600 font-medium">试卷类型</div>
              <div className="text-gray-700 font-medium">{examType || '考试试卷'}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-amber-600 font-medium">预计答题时长</div>
              <div className="text-2xl font-bold text-gray-800">{Math.ceil((examQuestionCount || 0) * 1.5)} 分钟</div>
            </div>
          </div>
          <button
            onClick={onGenerateQuiz}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            开始做真题 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {contentType !== 'exam' ? (
      <div className="mb-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-blue-800">AI 已完成资料分析</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3">
            <div className="text-blue-600 font-medium">核心知识点</div>
            <div className="text-2xl font-bold text-gray-800">{knowledgePoints.length} 个</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-blue-600 font-medium">重点考点</div>
            <div className="text-gray-700">
              {knowledgePoints.slice(0, 3).map((p, i) => (
                <span key={i} className="inline-block bg-blue-100 text-blue-700 rounded px-2 py-0.5 mr-1 mb-1 text-xs">
                  {p.title}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-blue-600 font-medium">预计学习时长</div>
            <div className="text-2xl font-bold text-gray-800">{Math.max(15, knowledgePoints.length * 5)} 分钟</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-blue-600 font-medium">推荐学习顺序</div>
            <div className="text-gray-700 text-xs">基础概念 - 公式应用 - 综合练习</div>
          </div>
        </div>
      </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {knowledgePoints.map((item) => (
          <article key={item.id} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${importanceClass[item.importance]}`}>{item.importance}</span>
            </div>
            <p className="mt-4 min-h-[72px] leading-6 text-slate-600">{item.description}</p>
            <div className="mt-5 space-y-3 text-sm">
              <p className="rounded-xl bg-slate-50 p-3 text-slate-600"><span className="font-semibold text-slate-800">建议掌握：</span>{item.masteryTarget}</p>
              <p className="rounded-xl bg-slate-50 p-3 text-slate-600"><span className="font-semibold text-slate-800">考查方式：</span>{item.examType}</p>
              {item.subjectType ? <p className="rounded-xl bg-violet-50 p-3 text-violet-700"><span className="font-semibold">学科识别：</span>{item.subjectType}</p> : null}
              {item.examPatterns?.length ? <p className="rounded-xl bg-amber-50 p-3 text-amber-800"><span className="font-semibold">考试题型：</span>{item.examPatterns.join('、')}</p> : null}
              {item.formulas?.length ? <p className="rounded-xl bg-emerald-50 p-3 font-mono text-[13px] leading-6 text-emerald-700"><span className="font-sans font-semibold">公式/规则：</span>{item.formulas.join('；')}</p> : null}
              {item.commonMistakes?.length ? <p className="rounded-xl bg-rose-50 p-3 text-rose-700"><span className="font-semibold">常见误区：</span>{item.commonMistakes.join('；')}</p> : null}
              {item.sourceEvidence ? <p className="rounded-xl bg-sky-50 p-3 text-sky-700"><span className="font-semibold">来源依据：</span>{item.sourceEvidence}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
