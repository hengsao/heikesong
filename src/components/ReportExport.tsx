import { Check, Clipboard, Download, FileText, FileType2, Printer } from 'lucide-react';
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

export default function ReportExport(props: ReportExportProps) {
  const [copied, setCopied] = useState(false);
  const report: LearningReport = useMemo(() => generateLearningReport(props), [props]);
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
