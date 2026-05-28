import { BookOpenCheck, CalendarDays, Dumbbell, Timer } from 'lucide-react';
import type { ReviewPlanDay } from '../types';

interface ReviewPlanProps {
  reviewPlan: ReviewPlanDay[];
  onGenerateReinforcement: () => void;
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

export default function ReviewPlan({ reviewPlan, onGenerateReinforcement }: ReviewPlanProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">复习路径</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">3 天个性化复习计划</h2>
          <p className="mt-2 text-slate-600">把复习建议改成可执行的每日安排：先补核心依据，再做母题和变式，最后按得分点自测。</p>
        </div>
        <button onClick={onGenerateReinforcement} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
          <Dumbbell className="h-5 w-5" />
          生成强化练习
        </button>
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
