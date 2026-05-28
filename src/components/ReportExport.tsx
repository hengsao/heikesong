import { Bot, Check, Clipboard, Download, FileText, FileType2, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  DiagnosisItem,
  KnowledgePoint,
  LearningReport,
  MaterialInput,
  QuizResult,
  ReinforcementQuestion,
  ReviewPlanDay,
} from '../types';
import { downloadMarkdown, downloadWordReport, generateLearningReport } from '../services/reportService';
import { formatFileSize } from '../utils/textClean';

interface ReportExportProps {
  material: MaterialInput;
  knowledgePoints: KnowledgePoint[];
  result: QuizResult;
  diagnosis: DiagnosisItem[];
  reviewPlan: ReviewPlanDay[];
  reinforcementQuiz: ReinforcementQuestion[];
}

function getMasteryLabel(masteryRate: number): string {
  if (masteryRate >= 80) return '优秀';
  if (masteryRate >= 60) return '良好';
  if (masteryRate >= 40) return '一般';
  return '待加强';
}

function getMasteryColor(masteryRate: number): string {
  if (masteryRate >= 80) return 'text-green-600';
  if (masteryRate >= 60) return 'text-blue-600';
  if (masteryRate >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function extractWeakPoints(diagnosis: DiagnosisItem[]): string[] {
  const weakTitles = new Set<string>();
  for (const item of diagnosis) {
    if (item.masteryStatus === '薄弱') {
      weakTitles.add(item.knowledgePointTitle);
    }
  }
  return Array.from(weakTitles);
}

export default function ReportExport(props: ReportExportProps) {
  const [copied, setCopied] = useState(false);
  const report: LearningReport = useMemo(() => generateLearningReport(props), [props]);
  const weakPoints = useMemo(() => extractWeakPoints(props.diagnosis), [props.diagnosis]);
  const sourceItems = [
    ['输入方式', props.material.sourceType === 'sample' ? '示例资料' : props.material.sourceType === 'file' ? '文件上传' : '文本粘贴'],
    props.material.fileName ? ['文件名', props.material.fileName] : null,
    props.material.fileType ? ['文件类型', props.material.fileType.toUpperCase()] : null,
    typeof props.material.fileSize === 'number' ? ['文件大小', formatFileSize(props.material.fileSize)] : null,
    typeof props.material.wordCount === 'number' ? ['提取字数', `${props.material.wordCount}`] : null,
    typeof props.material.pageCount === 'number' ? ['PDF 页数', `${props.material.pageCount}`] : null,
    typeof props.material.slideCount === 'number' ? ['PPT 页数', `${props.material.slideCount}`] : null,
  ].filter(Boolean) as string[][];

  const copyReport = async () => {
    await navigator.clipboard.writeText(report.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold text-sky-700">报告中心</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">学习报告导出</h2>
        <p className="mt-2 text-slate-600">报告整合资料来源、知识点、测评结果、错因诊断、复习计划和强化练习建议。</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-950">{report.title}</h3>
          <p className="mt-2 text-sm text-slate-500">生成时间：{report.createdAt}</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">资料来源</p>
            <div className="grid gap-2 text-sm">
              {sourceItems.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="break-all text-right font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="no-print mt-6 grid gap-3">
            <button onClick={() => downloadMarkdown(report)} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
              <Download className="h-5 w-5" />
              下载 Markdown 报告
            </button>
            <button onClick={copyReport} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50">
              {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Clipboard className="h-5 w-5" />}
              {copied ? '已复制' : '复制到剪贴板'}
            </button>
            <button onClick={() => window.print()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50">
              <Printer className="h-5 w-5" />
              打印 / 导出 PDF
            </button>
            <button onClick={() => downloadWordReport(props)} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50">
              <FileType2 className="h-5 w-5" />
              导出 Word 报告
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950">正式报告预览</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Document</span>
          </div>
          <div className="max-h-[720px] overflow-auto rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
            <div className="border-b border-slate-200 pb-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">智学闭环学习报告</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">{report.title}</h3>
              <p className="mt-2 text-slate-500">生成时间：{report.createdAt}</p>
            </div>

            {/* AI 学习总结卡片 */}
            <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-blue-800">AI 学习总结报告</h2>
              </div>

              {/* 关键指标网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">{props.result.score ?? 0}</div>
                  <div className="text-xs text-gray-500">总分</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-3xl font-bold text-green-600">{props.result.masteryRate ?? 0}%</div>
                  <div className="text-xs text-gray-500">掌握率</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-3xl font-bold text-purple-600">{props.knowledgePoints?.length ?? 0}</div>
                  <div className="text-xs text-gray-500">知识点数</div>
                </div>
                <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                  <div className={`text-3xl font-bold ${getMasteryColor(props.result.masteryRate ?? 0)}`}>
                    {getMasteryLabel(props.result.masteryRate ?? 0)}
                  </div>
                  <div className="text-xs text-gray-500">掌握程度</div>
                </div>
              </div>

              {/* 薄弱点 + 提升建议 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-red-600 mb-2">核心薄弱点</div>
                  <div className="text-sm text-gray-700">
                    {weakPoints.length > 0
                      ? weakPoints.map((wp, i) => <div key={i}>- {wp}</div>)
                      : '暂无薄弱知识点，继续保持！'
                    }
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-blue-600 mb-2">提升建议</div>
                  <div className="text-sm text-gray-700">
                    <div>1. 重点复习薄弱知识点，确保核心概念理解到位</div>
                    <div>2. 每天完成 3-5 道针对性练习题，巩固易错题型</div>
                    <div>3. 按照复习计划执行，3 天后重新测评检验效果</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">测评概览</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ['总分', `${props.result.score}`],
                    ['掌握率', `${props.result.masteryRate}%`],
                    ['正确题数', `${props.result.correctCount}`],
                    ['错误题数', `${props.result.wrongCount}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-white px-3 py-2">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-1 font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">薄弱知识点排行</p>
                <div className="mt-3 space-y-2">
                  {(props.result.weakKnowledgePoints.length ? props.result.weakKnowledgePoints : props.knowledgePoints.slice(0, 3)).map((item, index) => (
                    <div key={item.id} className="flex justify-between rounded-xl bg-white px-3 py-2">
                      <span>{index + 1}. {item.title}</span>
                      <span className="text-amber-700">待加强</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">知识点</th>
                    <th className="px-4 py-3">掌握率</th>
                    <th className="px-4 py-3">答对/总数</th>
                  </tr>
                </thead>
                <tbody>
                  {props.result.byKnowledgePoint.map((item) => (
                    <tr key={item.knowledgePoint.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{item.knowledgePoint.title}</td>
                      <td className="px-4 py-3">{item.masteryRate}%</td>
                      <td className="px-4 py-3">{item.correct}/{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3">
              {props.reviewPlan.map((day) => (
                <div key={day.day} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">第 {day.day} 天：{day.goal}</p>
                  <p className="mt-2 text-slate-600">任务：{day.checklist?.map((item) => item.text).join('；') || day.method}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}