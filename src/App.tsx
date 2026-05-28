import { useEffect, useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StepIndicator from './components/StepIndicator';
import MaterialInput from './components/MaterialInput';
import KnowledgePointList from './components/KnowledgePointList';
import QuizGenerator from './components/QuizGenerator';
import QuizTaking from './components/QuizTaking';
import ResultSummary from './components/ResultSummary';
import DiagnosisPanel from './components/DiagnosisPanel';
import ReviewPlan from './components/ReviewPlan';
import ReinforcementQuiz from './components/ReinforcementQuiz';
import ReportExport from './components/ReportExport';
import { defaultQuizSettings } from './components/QuizSettingsPanel';
import {
  evaluateAnswers,
  extractKnowledgePoints,
  generateDiagnosis,
  generateQuiz,
  generateReinforcementQuiz,
  generateReviewPlan,
  getAIStatus,
} from './services/aiService';
import { autoDetectAPIOnStartup, hasRealAIConfig } from './services/llmClient';
import { learnFromMaterial } from './services/learningMatcher';
import { generateFallbackQuestionsFromBlueprints } from './services/fallbackQuestionFactory';
import type { StandardKnowledgePoint } from './services/knowledgeBase';
import type {
  AIStatus,
  AppStep,
  DiagnosisItem,
  KnowledgePoint,
  MaterialInput as MaterialInputType,
  QuizQuestion,
  QuizResult,
  QuizSettings,
  ReinforcementQuestion,
  ReviewPlanDay,
  SubjectType,
  UserAnswer,
} from './types';

const emptyMaterial: MaterialInputType = {
  title: '',
  content: '',
  sourceType: 'text',
};

/** 判断学科是否需要显示阅读原文 */
function isReadingSubject(subjectType?: string): boolean {
  if (!subjectType) return false;
  const readingSubjects = ['英语', '语文', '哲学', '文学', '历史学', '艺术学'];
  return readingSubjects.includes(subjectType);
}

export default function App() {
  const [step, setStep] = useState<AppStep>('home');
  const [visitedSteps, setVisitedSteps] = useState<AppStep[]>([]);
  const [material, setMaterial] = useState<MaterialInputType>(emptyMaterial);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizSettings, setQuizSettings] = useState<QuizSettings>(defaultQuizSettings);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisItem[]>([]);
  const [reviewPlan, setReviewPlan] = useState<ReviewPlanDay[]>([]);
  const [reinforcementQuiz, setReinforcementQuiz] = useState<ReinforcementQuestion[]>([]);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [aiStatus, setAiStatus] = useState<AIStatus>(getAIStatus());
  const [matchedKnowledgePoints, setMatchedKnowledgePoints] = useState<StandardKnowledgePoint[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [originalArticle, setOriginalArticle] = useState('');

  // 启动时自动检测 API 可用性
  useEffect(() => {
    autoDetectAPIOnStartup().then(({ status, degraded }) => {
      setAiStatus(status);
      if (degraded) {
        console.warn('[智学闭环] 启动检测：当前API不可用，已进入演示模式');
      }
    });
  }, []);

  const goToStep = (nextStep: AppStep) => {
    setStep(nextStep);
    if (nextStep !== 'home') {
      setVisitedSteps((current) => (current.includes(nextStep) ? current : [...current, nextStep]));
    }
  };

  const runWithLoading = async (label: string, task: () => Promise<void>) => {
    setLoadingLabel(label);
    await new Promise((resolve) => window.setTimeout(resolve, 360));
    try {
      await task();
    } catch (error) {
      console.error('[智学闭环] 任务执行失败：', error);
    } finally {
      setLoadingLabel('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const reset = () => {
    goToStep('home');
    setMaterial(emptyMaterial);
    setKnowledgePoints([]);
    setQuestions([]);
    setQuizSettings(defaultQuizSettings);
    setAnswers([]);
    setResult(null);
    setDiagnosis([]);
    setReviewPlan([]);
    setReinforcementQuiz([]);
    setLoadingLabel('');
    setVisitedSteps([]);
    setAiStatus(getAIStatus());
    setOriginalArticle('');
  };

  // ========== Mock 模式下的知识点提取 fallback ==========
  const mockExtractKnowledgePoints = (content: string, subjectType: string): KnowledgePoint[] => {
    const fallback = learnFromMaterial(content, [], subjectType);
    if (fallback.matchedPoints.length > 0) {
      return fallback.matchedPoints.map((mp, i) => ({
        id: `kp-${i + 1}`,
        title: mp.title,
        description: mp.coreConcept,
        importance: (['高', '中', '低'] as const)[i % 3],
        masteryTarget: mp.commonQuestionTypes[0] ? `掌握${mp.commonQuestionTypes[0]}的解题方法` : '理解并掌握该考点',
        examType: mp.commonQuestionTypes.join('、') || '选择题、判断题',
        sourceEvidence: content.slice(0, 100),
        keywords: mp.keywords || [],
        subjectType: (subjectType || '通用') as SubjectType,
        examPatterns: (['基础概念题', '易错判断题'] as any),
        formulas: mp.formulas || [],
        commonMistakes: mp.commonMistakes || [],
        keyMethods: mp.commonMistakes.slice(0, 3),
      }));
    }
    // 兜底：拆分句子
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 5).map((s, i) => ({
      id: `kp-${i + 1}`,
      title: s.trim().slice(0, 20) + (s.trim().length > 20 ? '...' : ''),
      description: s.trim(),
      importance: (['高', '中', '低'] as const)[i % 3],
      masteryTarget: '理解并掌握该概念',
      examType: '选择题、判断题',
      sourceEvidence: s.trim(),
      keywords: [],
      subjectType: (subjectType || '通用') as SubjectType,
      examPatterns: (['基础概念题', '易错判断题'] as any),
      formulas: [],
      commonMistakes: [],
      keyMethods: [],
    }));
  };

  // ========== 核心流程处理函数 ==========

  const handleAnalyze = () =>
    runWithLoading('AI 正在提取知识点并学习标准考点...', async () => {
      setIsLearning(true);

      let points: KnowledgePoint[] = [];
      const isRealAI = hasRealAIConfig();

      if (isRealAI) {
        try {
          points = await extractKnowledgePoints(material.content);
        } catch {
          console.warn('[智学闭环] extractKnowledgePoints 失败，使用 Mock 回退');
        }
      }

      if (points.length === 0) {
        points = mockExtractKnowledgePoints(material.content, quizSettings.subjectType as string);
      }

      setKnowledgePoints(points);

      const learningResult = learnFromMaterial(material.content, points, quizSettings.subjectType as string);
      setMatchedKnowledgePoints(learningResult.matchedPoints);
      setIsLearning(false);

      setAiStatus(getAIStatus());
      goToStep('knowledge');
    });

  const handleGenerateQuiz = () =>
    runWithLoading('AI 正在生成测评题目...', async () => {
      let generated: QuizQuestion[] = [];
      const isRealAI = hasRealAIConfig();

      if (isRealAI && knowledgePoints.length > 0) {
        try {
          // aiService.generateQuiz 内部完整流程：考点卡 → 蓝图 → LLM → 质检 → 重生成 → fallback
          generated = await generateQuiz(knowledgePoints, material.content, quizSettings);
        } catch {
          console.warn('[智学闭环] generateQuiz 失败，使用 fallback');
        }
      }

      if (generated.length === 0) {
        // 无 API 或 API 失败：由 aiService.generateQuiz 内部处理 fallback，
        // 此处仅作兜底：直接调用 fallbackQuestionFactory（生成高质量模板题）
        const subjectType = quizSettings.subjectType as string;
        const kpList = knowledgePoints.length > 0
          ? knowledgePoints
          : mockExtractKnowledgePoints(material.content, subjectType);

        // 从知识点生成伪蓝图
        const pseudoBlueprints = kpList.slice(0, quizSettings.questionCount ?? 5).map((kp, i) => ({
          id: `bp-kp-${kp.id}`,
          knowledgeCardId: kp.id,
          knowledgePoint: kp.title,
          targetAbility: kp.masteryTarget || `理解并掌握"${kp.title}"`,
          requiredMethods: kp.keyMethods?.slice(0, 3) || ['理解核心概念'],
          examPattern: (kp.examPatterns?.[0] || '基础概念题') as any,
          difficulty: (['简单', '中等', '较难'] as const)[i % 3],
          scoringPoints: [kp.description?.slice(0, 50) || '核心概念正确'],
          commonWrongMethods: kp.commonMistakes?.slice(0, 3) || ['对该概念理解模糊'],
          sourceEvidence: kp.sourceEvidence || kp.description || '',
          estimatedTime: 3,
        }));

        generated = generateFallbackQuestionsFromBlueprints(pseudoBlueprints, [], quizSettings);
      }

      // 英语/语文科目：保留原文用于阅读原文卡片
      const subjectType = quizSettings.subjectType as string;
      if (isReadingSubject(subjectType)) {
        setOriginalArticle(material.content);
      } else {
        setOriginalArticle('');
      }

      // ===== 题目质量过滤 + 控制台日志 =====
      const allQuestions = generated.map(q => ({
        ...q,
        qualityScore: q.qualityScore ?? 90,
      }));

      // 控制台输出质量审查日志
      console.group('[质量审查] 题目质量评分报告');
      allQuestions.forEach((q, i) => {
        const score = q.qualityScore;
        const passed = score >= 80;
        const status = passed ? '通过' : '已过滤';
        let reason = '';
        if (!passed) {
          const reasons: string[] = [];
          if (q.question.includes('下列说法正确的是') || q.question.includes('下列选项正确的是')) reasons.push('万能题干格式');
          if (q.options?.some(o => o.includes('以上都不对') || o.includes('与该考点无关') || o.includes('该考点的常见误区'))) reasons.push('干扰项包含无效内容');
          if (!q.explanation || q.explanation.length < 10) reasons.push('解析不完整');
          if (!q.sourceEvidence) reasons.push('缺少来源依据');
          if (reasons.length === 0) reasons.push('综合评分不足');
          reason = ` | 扣分原因：${reasons.join('、')}`;
        }
        console.log(`[质量审查] 第${i + 1}题：得分${score}分 | 状态：${status}${reason}`);
        if (!passed) {
          console.log(`  → 被过滤题目内容：${q.question.slice(0, 80)}...`);
          console.log(`  → 选项：${JSON.stringify(q.options?.slice(0, 2))}`);
        }
      });
      console.groupEnd();

      // 过滤低于80分的题目
      const filtered = allQuestions.filter(q => q.qualityScore >= 80);
      const filteredCount = allQuestions.length - filtered.length;
      if (filteredCount > 0) {
        console.warn(`[质量审查] 已过滤 ${filteredCount} 道低质量题目，保留 ${filtered.length} 道`);
      }

      setQuestions(filtered);
      setAnswers([]);
      setAiStatus(getAIStatus());
      goToStep('quiz');
    });

  const handleSubmitQuiz = () =>
    runWithLoading('系统正在评分并分析薄弱点...', async () => {
      const evaluated = await evaluateAnswers(questions, answers, knowledgePoints);
      setResult(evaluated);
      goToStep('result');
    });

  const handleDiagnosis = () =>
    runWithLoading('AI 正在生成错因诊断...', async () => {
      if (!result) return;
      let generated: DiagnosisItem[] = [];
      const isRealAI = hasRealAIConfig();

      if (isRealAI) {
        try {
          generated = await generateDiagnosis(result, questions, answers);
        } catch {
          console.warn('[智学闭环] generateDiagnosis 失败');
        }
      }

      if (generated.length === 0) {
        // 使用 aiService 内置的备用逻辑
        generated = await generateDiagnosis(result, questions, answers);
      }

      setDiagnosis(generated);
      setAiStatus(getAIStatus());
      goToStep('diagnosis');
    });

  const handleReviewPlan = () =>
    runWithLoading('AI 正在规划复习路径...', async () => {
      if (!result) return;
      let generated: ReviewPlanDay[] = [];
      const isRealAI = hasRealAIConfig();

      if (isRealAI) {
        try {
          generated = await generateReviewPlan(diagnosis, result.weakKnowledgePoints);
        } catch {
          console.warn('[智学闭环] generateReviewPlan 失败');
        }
      }

      if (generated.length === 0) {
        generated = await generateReviewPlan(diagnosis, result.weakKnowledgePoints);
      }

      setReviewPlan(generated);
      goToStep('plan');
    });

  const handleReinforcement = () =>
    runWithLoading('AI 正在生成强化练习...', async () => {
      if (!result) return;
      let generated: ReinforcementQuestion[] = [];
      const isRealAI = hasRealAIConfig();

      if (isRealAI) {
        try {
          generated = await generateReinforcementQuiz(
            result.weakKnowledgePoints,
            questions,
            result,
            Date.now()
          );
        } catch {
          console.warn('[智学闭环] generateReinforcementQuiz 失败');
        }
      }

      if (generated.length === 0) {
        generated = await generateReinforcementQuiz(
          result.weakKnowledgePoints,
          questions,
          result,
          Date.now()
        );
      }

      setReinforcementQuiz(generated);
      goToStep('reinforcement');
    });

  const handleRefreshReinforcement = () =>
    runWithLoading('AI 正在刷新同类变式...', async () => {
      if (!result) return;
      let generated: ReinforcementQuestion[] = [];
      const isRealAI = hasRealAIConfig();

      if (isRealAI) {
        try {
          generated = await generateReinforcementQuiz(
            result.weakKnowledgePoints,
            questions,
            result,
            Date.now()
          );
        } catch {
          console.warn('[智学闭环] refreshReinforcementQuiz 失败');
        }
      }

      if (generated.length === 0) {
        generated = await generateReinforcementQuiz(
          result.weakKnowledgePoints,
          questions,
          result,
          Date.now()
        );
      }

      setReinforcementQuiz(generated);
    });

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f7fbff_0%,_#eef7f4_45%,_#f8fafc_100%)] text-slate-900">
      <Header onReset={reset} aiStatus={aiStatus} onAIStatusChange={setAiStatus} />
      <StepIndicator currentStep={step} visitedSteps={visitedSteps} onStepClick={goToStep} />
      {loadingLabel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-5 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl px-8 py-6 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <p className="mt-4 font-medium text-slate-900">{loadingLabel}</p>
          </div>
        </div>
      ) : null}

      {step === 'home' ? <HeroSection onStart={() => goToStep('material')} /> : null}
      {step === 'material' ? <MaterialInput material={material} setMaterial={setMaterial} onAnalyze={handleAnalyze} /> : null}
      {step === 'knowledge' ? (
        <KnowledgePointList
          knowledgePoints={knowledgePoints}
          quizSettings={quizSettings}
          setQuizSettings={setQuizSettings}
          onGenerateQuiz={handleGenerateQuiz}
          matchedKnowledgePoints={matchedKnowledgePoints}
          isLearning={isLearning}
        />
      ) : null}
      {step === 'quiz' ? (
        <QuizGenerator
          questions={questions}
          knowledgePoints={knowledgePoints}
          aiStatus={aiStatus}
          onStart={() => goToStep('taking')}
          originalArticle={originalArticle}
        />
      ) : null}
      {step === 'taking' ? (
        <QuizTaking
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onSubmit={handleSubmitQuiz}
          originalArticle={originalArticle}
        />
      ) : null}
      {step === 'result' && result ? (
        <ResultSummary result={result} questions={questions} knowledgePoints={knowledgePoints} onDiagnosis={handleDiagnosis} />
      ) : null}
      {step === 'diagnosis' ? <DiagnosisPanel diagnosis={diagnosis} onGeneratePlan={handleReviewPlan} /> : null}
      {step === 'plan' ? <ReviewPlan reviewPlan={reviewPlan} onGenerateReinforcement={handleReinforcement} /> : null}
      {step === 'reinforcement' ? (
        <ReinforcementQuiz
          reinforcementQuiz={reinforcementQuiz}
          onRefresh={handleRefreshReinforcement}
          onReport={() => goToStep('report')}
        />
      ) : null}
      {step === 'report' && result ? (
        <ReportExport
          material={material}
          knowledgePoints={knowledgePoints}
          result={result}
          diagnosis={diagnosis}
          reviewPlan={reviewPlan}
          reinforcementQuiz={reinforcementQuiz}
        />
      ) : null}
    </div>
  );
}
