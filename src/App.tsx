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
  UserAnswer,
} from './types';

const emptyMaterial: MaterialInputType = {
  title: '',
  content: '',
  sourceType: 'text',
};

/** 判断学科是否需要显示阅读原文（英语或语文类科目） */
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

  // ========== Mock 模式下的 fallback 逻辑 ==========

  /** 从资料内容中提取句子作为知识点（Mock 兜底） */
  const mockExtractKnowledgePoints = (content: string, subjectType: string): KnowledgePoint[] => {
    const fallback = learnFromMaterial(content, [], subjectType);
    if (fallback.matchedPoints.length > 0) {
      return fallback.matchedPoints.map((mp, i) => ({
        id: `kp-${i + 1}`,
        title: mp.title,
        description: mp.coreConcept,
        importance: (['高', '中', '低'] as const)[i % 3],
        masteryTarget: mp.keyMethods?.[0] || '理解并掌握该考点',
        examType: mp.examPatterns?.join('、') || '选择题、判断题',
        sourceEvidence: content.slice(0, 100),
        keywords: mp.keywords || [],
        subjectType: subjectType || '通用',
        examPatterns: ['基础概念题', '易错判断题'],
        formulas: mp.formulas || [],
        commonMistakes: mp.commonMistakes || [],
        keyMethods: mp.keyMethods || [],
      }));
    }
    // 兜底：从资料内容中拆分句子
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
      subjectType: subjectType || '通用',
      examPatterns: ['基础概念题', '易错判断题'],
      formulas: [],
      commonMistakes: [],
      keyMethods: [],
    }));
  };

  /** Mock 模式下生成题目 */
  const mockGenerateQuiz = (kpList: KnowledgePoint[], targetCount: number): QuizQuestion[] => {
    return kpList.slice(0, targetCount).map((kp, i) => {
      const wrongOptions = kpList.filter((_, j) => j !== i).slice(0, 3).map(k => k.title.slice(0, 15));
      while (wrongOptions.length < 3) wrongOptions.push('以上都不对');
      const correctIdx = i % 4;
      const allOptions = [...wrongOptions.slice(0, correctIdx), kp.description.slice(0, 20), ...wrongOptions.slice(correctIdx)];
      return {
        id: `q-${i + 1}`,
        type: 'single' as const,
        question: `根据原文，关于"${kp.title}"的描述，下列选项正确的是`,
        options: allOptions,
        answer: String.fromCharCode(65 + correctIdx),
        explanation: `考点：${kp.title}。${kp.description}`,
        difficulty: (['简单', '中等', '较难'] as const)[i % 3],
        examPattern: '基础概念题' as const,
        knowledgePointId: kp.id,
        sourceEvidence: kp.sourceEvidence || '',
        scoringRubric: [],
        solutionSteps: [],
        commonMistake: kp.commonMistakes?.[0] || '',
        optionExplanations: {},
      };
    });
  };

  /** Mock 模式下生成错因诊断 */
  const mockGenerateDiagnosis = (
    qs: QuizQuestion[],
    ans: UserAnswer[],
    kps: KnowledgePoint[],
  ): DiagnosisItem[] => {
    return qs.map((q, i) => {
      const userAns = ans[i];
      const isCorrect = userAns?.answer === q.answer;
      return {
        id: `diag-q-${i + 1}`,
        questionId: q.id,
        question: q.question,
        knowledgePointTitle: kps.find(kp => kp.id === q.knowledgePointId)?.title || '未知考点',
        userAnswer: userAns?.answer || '未作答',
        reasonType: isCorrect ? '已掌握' : '概念混淆',
        diagnosis: isCorrect
          ? '回答正确，对该考点掌握良好。'
          : `你的答案是"${userAns?.answer || '未作答'}"，正确答案是"${q.answer}"。${q.explanation}`,
        correctUnderstanding: q.answer,
        suggestion: isCorrect
          ? '继续保持，可以尝试更难的变式训练。'
          : `建议重新复习"${kps.find(kp => kp.id === q.knowledgePointId)?.title || '该考点'}"，理解${q.commonMistake || '常见误区'}，然后重做同类题目。`,
        missingRubric: q.scoringRubric || [],
        commonMistake: q.commonMistake || '',
        masteryStatus: isCorrect ? '已掌握' : '薄弱',
      };
    }).filter(d => d.masteryStatus !== '已掌握');
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

      // 自主学习：匹配知识库中的标准考点
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
          generated = await generateQuiz(knowledgePoints, material.content, quizSettings);
        } catch {
          console.warn('[智学闭环] generateQuiz 失败，使用 Mock 回退');
        }
      }

      if (generated.length === 0) {
        const kpList = knowledgePoints.length > 0
          ? knowledgePoints
          : mockExtractKnowledgePoints(material.content, quizSettings.subjectType as string);
        const targetCount = quizSettings.questionCount ?? 5;
        generated = mockGenerateQuiz(kpList, targetCount);
      }

      // 英语/语文科目：保留原文用于阅读原文卡片
      const subjectType = quizSettings.subjectType as string;
      if (isReadingSubject(subjectType)) {
        setOriginalArticle(material.content);
      } else {
        setOriginalArticle('');
      }

      setQuestions(generated);
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
          console.warn('[智学闭环] generateDiagnosis 失败，使用 Mock 回退');
        }
      }

      if (generated.length === 0) {
        generated = mockGenerateDiagnosis(questions, answers, knowledgePoints);
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
          console.warn('[智学闭环] generateReviewPlan 失败，使用 Mock 回退');
        }
      }

      if (generated.length === 0) {
        const weakPoints = result.weakKnowledgePoints.length > 0
          ? result.weakKnowledgePoints
          : knowledgePoints.slice(0, 3);
        generated = [
          { day: 1, title: '巩固基础', tasks: weakPoints.slice(0, 2).map(wp => ({ knowledgePoint: wp.title, task: `复习"${wp.title}"的核心概念，完成基础练习`, duration: 30 })) },
          { day: 2, title: '强化薄弱', tasks: weakPoints.slice(1, 3).map(wp => ({ knowledgePoint: wp.title, task: `针对"${wp.title}"进行专项训练`, duration: 40 })) },
          { day: 3, title: '综合检测', tasks: [{ knowledgePoint: '综合', task: '完成一套综合练习，检验整体掌握情况', duration: 50 }] },
        ];
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
          generated = await generateReinforcementQuiz(result.weakKnowledgePoints, questions, result);
        } catch {
          console.warn('[智学闭环] generateReinforcementQuiz 失败，使用 Mock 回退');
        }
      }

      if (generated.length === 0) {
        const weakPoints = result.weakKnowledgePoints.length > 0
          ? result.weakKnowledgePoints
          : knowledgePoints.slice(0, 3);
        generated = weakPoints.slice(0, 3).map((wp, i) => ({
          id: `rq-${i + 1}`,
          originalQuestionId: questions[i]?.id || `q-${i + 1}`,
          knowledgePointId: wp.id,
          knowledgePointTitle: wp.title,
          question: `[变式训练] 关于"${wp.title}"，以下哪项理解是正确的？`,
          options: [
            wp.title + '的核心概念',
            '以上选项均不正确',
            '与该考点无关的内容',
            '该考点的常见误区',
          ],
          answer: 'A',
          explanation: `正确答案：${wp.title}的核心概念。${wp.description || '请回顾相关知识点。'}`,
          difficulty: '中等' as const,
        }));
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
          generated = await generateReinforcementQuiz(result.weakKnowledgePoints, questions, result, Date.now());
        } catch {
          console.warn('[智学闭环] refreshReinforcementQuiz 失败，使用 Mock 回退');
        }
      }

      if (generated.length === 0) {
        const weakPoints = result.weakKnowledgePoints.length > 0
          ? result.weakKnowledgePoints
          : knowledgePoints.slice(0, 3);
        generated = weakPoints.slice(0, 3).map((wp, i) => ({
          id: `rq-refresh-${Date.now()}-${i + 1}`,
          originalQuestionId: questions[i]?.id || `q-${i + 1}`,
          knowledgePointId: wp.id,
          knowledgePointTitle: wp.title,
          question: `[刷新变式] 关于"${wp.title}"的深入理解，以下说法正确的是？`,
          options: [
            wp.description?.slice(0, 20) || wp.title + '的深层含义',
            '对该考点的错误理解',
            '与该考点无关的内容',
            '常见的误解之一',
          ],
          answer: 'A',
          explanation: `正确答案涉及${wp.title}的深层理解。请仔细复习相关内容。`,
          difficulty: '较难' as const,
        }));
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
      {step === 'quiz' ? <QuizGenerator questions={questions} knowledgePoints={knowledgePoints} aiStatus={aiStatus} onStart={() => goToStep('taking')} originalArticle={originalArticle} /> : null}
      {step === 'taking' ? <QuizTaking questions={questions} answers={answers} setAnswers={setAnswers} onSubmit={handleSubmitQuiz} originalArticle={originalArticle} /> : null}
      {step === 'result' && result ? <ResultSummary result={result} questions={questions} knowledgePoints={knowledgePoints} onDiagnosis={handleDiagnosis} /> : null}
      {step === 'diagnosis' ? <DiagnosisPanel diagnosis={diagnosis} onGeneratePlan={handleReviewPlan} /> : null}
      {step === 'plan' ? <ReviewPlan reviewPlan={reviewPlan} onGenerateReinforcement={handleReinforcement} /> : null}
      {step === 'reinforcement' ? <ReinforcementQuiz reinforcementQuiz={reinforcementQuiz} onRefresh={handleRefreshReinforcement} onReport={() => goToStep('report')} /> : null}
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
