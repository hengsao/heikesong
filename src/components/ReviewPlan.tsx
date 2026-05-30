import { BookOpenCheck, Brain, CalendarDays, Dumbbell, MessageCircle, Timer } from 'lucide-react';
import type { ReviewPlanDay } from '../types';

interface ReviewPlanProps {
  reviewPlan: ReviewPlanDay[];
  onGenerateReinforcement: () => void;
  onOpenTutor?: () => void;
}

const ListBlock = ({ title, items, tone = 'slate' }: { title: string; items?: string[]; tone?: 'slate' | 'sky' | 'amber' | 'rose' | 'emerald' }) => {
  if (!items?.length) return null;
  const toneClass = {
    slate: 'bg-white text-slate-700 ring-slate-200',
    sky: 'bg-sky-50 text-slate-700 ring-sky-100',
    amber: 'bg-amber-50 text-slate-700 ring-amber-100',
    rose: 'bg-rose-50 text-slate-700 ring-rose-100',
    emerald: 'bg-emerald-50 text-slate-700 ring-emerald-100',
  }[tone];
  return (
    <div className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${toneClass}`}>
      <p className="mb-2 font-semibold text-slate-950">{title}</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
};

export default function ReviewPlan({ reviewPlan, onGenerateReinforcement, onOpenTutor }: ReviewPlanProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">复习路径</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">艾宾浩斯智能复习计划</h2>
          <p className="mt-2 text-slate-600">基于遗忘曲线自动安排复习节点：1天后错题重做 → 3天后变式练习 → 7天后知识点回顾 → 15天后综合测试。</p>
          {/* 艾宾浩斯遗忘曲线说明卡片 */}
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-sky-600" />
              <span className="text-sm font-semibold text-sky-800">艾宾浩斯遗忘曲线复习法</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-2">
                <div className="font-bold text-red-600">1天后</div>
                <div className="text-slate-500">错题重做</div>
                <div className="text-slate-400">记忆留存 58%</div>
              </div>
              <div className="rounded-lg bg-white p-2">
                <div className="font-bold text-orange-600">3天后</div>
                <div className="text-slate-500">变式练习</div>
                <div className="text-slate-400">记忆留存 44%</div>
              </div>
              <div className="rounded-lg bg-white p-2">
                <div className="font-bold text-blue-600">7天后</div>
                <div className="text-slate-500">知识点回顾</div>
                <div className="text-slate-400">记忆留存 33%</div>
              </div>
              <div className="rounded-lg bg-white p-2">
                <div className="font-bold text-green-600">15天后</div>
                <div className="text-slate-500">综合测试</div>
                <div className="text-slate-400">记忆留存 25%</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onGenerateReinforcement} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
            <Dumbbell className="h-5 w-5" />
            生成强化练习
          </button>
          {onOpenTutor && (
            <button onClick={onOpenTutor} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 font-semibold text-purple-700 shadow-sm hover:bg-purple-100">
              <MessageCircle className="h-5 w-5" />
              AI 引导答疑
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {reviewPlan.map((day) => (
          <article key={day.day} className="glass-panel rounded-[2rem] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-500">Day {day.day}</p>
                  <h3 className="text-2xl font-semibold text-slate-950">第 {day.day} 天：{day.goal}</h3>
                  {/* 艾宾浩斯复习节点 */}
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      day.day === 1 ? 'bg-red-100 text-red-700' :
                      day.day === 3 ? 'bg-orange-100 text-orange-700' :
                      day.day === 7 ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {day.day === 1 ? '1天后 · 错题重做' :
                       day.day === 3 ? '3天后 · 变式练习' :
                       day.day === 7 ? '7天后 · 知识点回顾' :
                       '15天后 · 综合测试'}
                    </span>
                    <span className="text-xs text-slate-400">
                      距复习还有 {day.day} 天
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                  <Timer className="h-4 w-4" />
                  {day.duration} · {day.practiceCount} 道练习
                </span>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-950">重点抓手：</span>{day.focusKnowledgePoints.join('、')}。
              <span className="ml-2 font-semibold text-slate-950">方法：</span>{day.method}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {/* 今日目标 */}
              <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 ring-1 ring-blue-100">
                <p className="mb-2 font-semibold text-blue-800">今日目标</p>
                <p className="text-slate-700">{day.goal}</p>
                <p className="mt-1 text-slate-500 text-xs">方法：{day.method}</p>
              </div>

              {/* 必背内容 */}
              <div className="rounded-2xl bg-purple-50 p-4 text-sm leading-6 ring-1 ring-purple-100">
                <p className="mb-2 font-semibold text-purple-800">必背内容</p>
                {day.mustRemember && day.mustRemember.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {day.mustRemember.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-500">暂无必背内容</p>
                )}
              </div>

              {/* 推荐练习 */}
              <div className="rounded-2xl bg-green-50 p-4 text-sm leading-6 ring-1 ring-green-100">
                <p className="mb-2 font-semibold text-green-800">推荐练习</p>
                {day.exampleTasks && day.exampleTasks.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {day.exampleTasks.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-500">暂无推荐练习</p>
                )}
                {day.reinforcementTasks && day.reinforcementTasks.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-green-700 mb-1">强化训练：</p>
                    <ul className="list-disc space-y-1 pl-5 text-slate-700">
                      {day.reinforcementTasks.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* 自测标准 */}
              <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 ring-1 ring-orange-100">
                <p className="mb-2 font-semibold text-orange-800">自测标准</p>
                {day.selfCheckCriteria && day.selfCheckCriteria.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {day.selfCheckCriteria.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-500">暂无自测标准</p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              <p className="mb-2 inline-flex items-center gap-2 font-semibold text-slate-950">
                <BookOpenCheck className="h-4 w-4" />
                今天最容易丢分的地方
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {(day.commonMistakes?.length ? day.commonMistakes : ['只写结论，缺少材料依据和得分步骤。']).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
