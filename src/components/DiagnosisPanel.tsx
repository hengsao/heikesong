import { useState } from 'react';
import { ArrowRight, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import type { DiagnosisItem, QuizQuestion } from '../types';

interface DiagnosisPanelProps {
  diagnosis: DiagnosisItem[];
  onGeneratePlan: () => void;
  onGenerateVariants?: (item: DiagnosisItem) => void;
  variantQuestions?: QuizQuestion[];
}

export default function DiagnosisPanel({ diagnosis, onGeneratePlan, onGenerateVariants, variantQuestions }: DiagnosisPanelProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-700">错题复盘</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">AI 错因诊断</h2>
          <p className="mt-2 text-slate-600">只保留已掌握、待加强、薄弱三种状态，诊断内容围绕具体缺失得分点展开。</p>
        </div>
        <button onClick={onGeneratePlan} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-700">
          生成个性化复习计划
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {diagnosis.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-semibold text-slate-950">暂无明显错因</h3>
            <p className="mt-3 text-slate-600">本次测评表现稳定，建议进入复习计划继续做迁移应用和综合表达训练。</p>
          </div>
        ) : (
          diagnosis.map((item) => {
            const status = item.masteryStatus ?? '待加强';
            const isWeak = status === '薄弱';
            const isMastered = status === '已掌握';

            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                {/* 题目信息 */}
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isMastered ? 'bg-sky-100 text-sky-600' : isWeak ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isMastered ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isMastered ? 'bg-sky-100 text-sky-700' : isWeak ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {status}
                      </span>
                      <span className="text-xs text-slate-500">{item.reasonType}</span>
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs text-slate-500">{item.knowledgePointTitle}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold leading-7 text-slate-900">{item.question}</h3>
                  </div>
                </div>

                {/* 结构化错因分析 */}
                <div className="mt-5 space-y-3">
                  {/* 你的错误 */}
                  <div className="flex items-start gap-2 bg-red-50 rounded-lg p-3">
                    <span className="text-red-500 font-bold text-sm mt-0.5">X</span>
                    <div>
                      <div className="text-sm font-medium text-red-700">你的错误</div>
                      <div className="text-sm text-gray-700 mt-1">
                        {item.userAnswer || '未作答'}
                        {!isMastered && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <XCircle className="h-3 w-3" />错误
                          </span>
                        )}
                        {isMastered && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600">
                            <CheckCircle className="h-3 w-3" />正确
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 错误类型 */}
                  <div className="flex items-start gap-2 bg-orange-50 rounded-lg p-3">
                    <span className="text-orange-500 font-bold text-sm mt-0.5">!</span>
                    <div>
                      <div className="text-sm font-medium text-orange-700">错误类型</div>
                      <div className="text-sm text-gray-700 mt-1">
                        {item.masteryStatus === '薄弱' ? '概念混淆' : item.masteryStatus === '待加强' ? '计算失误/条件遗漏' : '审题不清/策略缺失'}
                      </div>
                    </div>
                  </div>

                  {/* 知识漏洞 */}
                  <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
                    <span className="text-amber-500 font-bold text-sm mt-0.5">!</span>
                    <div>
                      <div className="text-sm font-medium text-amber-700">知识漏洞</div>
                      <div className="text-sm text-gray-700 mt-1">
                        对应知识点：{item.knowledgePointTitle}
                        {item.missingRubric && item.missingRubric.length > 0 && (
                          <span className="block mt-1 text-amber-600">缺失：{item.missingRubric.join('、')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 改进建议 */}
                  <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                    <span className="text-blue-500 font-bold text-sm mt-0.5">!</span>
                    <div>
                      <div className="text-sm font-medium text-blue-700">改进建议</div>
                      <div className="text-sm text-gray-700 mt-1">{item.suggestion}</div>
                    </div>
                  </div>

                  {/* 同类练习 */}
                  <div className="flex items-start gap-2 bg-indigo-50 rounded-lg p-3">
                    <span className="text-indigo-500 font-bold text-sm mt-0.5">!</span>
                    <div>
                      <div className="text-sm font-medium text-indigo-700">同类练习</div>
                      <div className="text-sm text-gray-700 mt-1">
                        建议完成 3-5 道"{item.knowledgePointTitle}"相关练习题，点击下方"生成变式题"获取针对性训练
                      </div>
                    </div>
                  </div>

                  {/* 正确理解 */}
                  <div className="flex items-start gap-2 bg-green-50 rounded-lg p-3">
                    <span className="text-green-500 font-bold text-sm mt-0.5">*</span>
                    <div>
                      <div className="text-sm font-medium text-green-700">正确理解</div>
                      <div className="text-sm text-gray-700 mt-1">{item.correctUnderstanding}</div>
                    </div>
                  </div>

                  {/* 常见误区 */}
                  <div className="flex items-start gap-2 bg-yellow-50 rounded-lg p-3">
                    <span className="text-yellow-500 font-bold text-sm mt-0.5">!</span>
                    <div>
                      <div className="text-sm font-medium text-yellow-700">常见误区</div>
                      <div className="text-sm text-gray-700 mt-1">{item.commonMistake || '大多数学生容易混淆相似概念，需要注意区分关键条件'}</div>
                    </div>
                  </div>

                  {/* 详细解析 */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">详细解析</p>
                    <div className="space-y-2 text-sm leading-6 text-slate-700">
                      <div>
                        <span className="font-medium text-slate-800">考点：</span>
                        <span>{item.knowledgePointTitle}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">解题思路：</span>
                        <span>{item.diagnosis}</span>
                      </div>
                      {item.missingRubric && item.missingRubric.length > 0 && (
                        <div>
                          <span className="font-medium text-slate-800">缺失得分点：</span>
                          <span>{item.missingRubric.join('；')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 复习建议 */}
                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-500 mb-1.5">复习建议</p>
                  <p className="text-sm leading-6 text-sky-800">{item.suggestion}</p>
                </div>

                {/* 举一反三：生成变式题 */}
                {!isMastered && (
                  <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 mb-2">举一反三</p>
                    <button
                      onClick={() => onGenerateVariants?.(item)}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      生成变式题
                    </button>
                    {variantQuestions && variantQuestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {variantQuestions.map((vq, vi) => (
                          <div key={vq.id} className="rounded-lg bg-white p-3 text-sm">
                            <p className="font-medium text-purple-800">变式 {vi + 1}：{vq.question}</p>
                            {vq.options && (
                              <div className="mt-1 grid grid-cols-2 gap-1">
                                {vq.options.map((opt, oi) => (
                                  <span key={oi} className="text-xs text-slate-600">{String.fromCharCode(65 + oi)}. {opt}</span>
                                ))}
                              </div>
                            )}
                            <p className="mt-1 text-xs text-green-700">答案：{vq.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}