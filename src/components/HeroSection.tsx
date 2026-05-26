interface HeroSectionProps {
  onStart: () => void;
}

const flowItems = [
  { step: '01', title: '资料导入', text: 'TXT / PDF / DOCX / PPTX' },
  { step: '02', title: '智能测评', text: '考点提取与真题化训练' },
  { step: '03', title: '错因定位', text: '证据化评分与薄弱点归因' },
  { step: '04', title: '个性复习', text: '3 天计划与同类变式' },
];

const compactBlocks = [
  {
    label: '学习痛点',
    title: '从资料到行动的断层',
    items: ['资料难整理', '重点难提取', '错因难定位'],
  },
  {
    label: '闭环方案',
    title: '让每次测评都生成下一步',
    items: ['资料驱动', '测评闭环', '错因诊断', '个性复习'],
  },
  {
    label: '使用场景',
    title: '面向真实备考现场',
    items: ['期末复习', '随堂测', '考证备考', '题库生成'],
  },
];

export default function HeroSection({ onStart }: HeroSectionProps) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[420px] w-[min(760px,90vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(125,211,252,0.22),_rgba(16,185,129,0.10)_42%,_transparent_72%)]" />

      <div className="mx-auto max-w-5xl text-center">
        <div className="inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 ring-1 ring-slate-200/80 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          AI Study Loop · Demo System
        </div>

        <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
          智学闭环
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-700 sm:text-xl">
          基于 AI 的学习资料智能测评与个性化复习工具
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
          把资料导入、考点提取、在线测评、错因诊断、复习计划和强化训练收束成一个清晰的备考闭环。
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onStart}
            className="group focus-ring inline-flex min-h-12 items-center gap-4 rounded-full bg-[#07111f] px-6 py-3 text-base font-semibold text-white ring-1 ring-slate-950/10 shadow-[0_22px_58px_rgba(7,17,31,0.30)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            开始体验
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:bg-white/18">
              →
            </span>
          </button>
          <span className="inline-flex min-h-12 items-center rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200 shadow-[0_16px_48px_rgba(15,23,42,0.07)]">
            支持 TXT / PDF / DOCX / PPTX
          </span>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl rounded-[2.5rem] bg-slate-950/[0.045] p-2 ring-1 ring-slate-950/[0.055] shadow-[0_40px_120px_rgba(15,23,42,0.12)]">
        <div className="rounded-[2rem] bg-white p-5 ring-1 ring-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-7">
          <div className="flex flex-col justify-between gap-4 text-center md:flex-row md:items-end md:text-left">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">Learning Loop Console</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">一屏看懂学习闭环</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {flowItems.map((item) => (
              <div
                key={item.step}
                className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200/80 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
              >
                <p className="text-[11px] font-semibold tracking-[0.18em] text-sky-700">{item.step}</p>
                <h3 className="mt-3 font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {compactBlocks.map((block) => (
              <div key={block.label} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200/80">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{block.label}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-950">{block.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {block.items.map((item) => (
                    <span key={item} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/70">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
