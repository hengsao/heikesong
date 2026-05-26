import { useState } from 'react';
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

  const goToStep = (nextStep: AppStep) => {
    setStep(nextStep);
    if (nextStep !== 'home') {
      setVisitedSteps((current) => (current.includes(nextStep) ? current : [...current, nextStep]));
    }
  };

  const runWithLoading = async (label: string, task: () => Promise<void>) => {
    setLoadingLabel(label);
    await new Promise((resolve) => window.setTimeout(resolve, 360));
    await task();
    setLoadingLabel('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  };

  const handleAnalyze = () =>
    runWithLoading('AI 正在提取知识点并学习标准考点...', async () => {
      setIsLearning(true);
      const points = await extractKnowledgePoints(material.content);
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
      const generated = await generateQuiz(knowledgePoints, material.content, quizSettings);
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
      const generated = await generateDiagnosis(result, questions, answers);
      setDiagnosis(generated);
      setAiStatus(getAIStatus());
      goToStep('diagnosis');
    });

  const handleReviewPlan = () =>
    runWithLoading('AI 正在规划复习路径...', async () => {
      if (!result) return;
      const generated = await generateReviewPlan(diagnosis, result.weakKnowledgePoints);
      setReviewPlan(generated);
      goToStep('plan');
    });

  const handleReinforcement = () =>
    runWithLoading('AI 正在生成强化练习...', async () => {
      if (!result) return;
      const generated = await generateReinforcementQuiz(result.weakKnowledgePoints, questions, result);
      setReinforcementQuiz(generated);
      goToStep('reinforcement');
    });

  const handleRefreshReinforcement = () =>
    runWithLoading('AI 正在刷新同类变式...', async () => {
      if (!result) return;
      const generated = await generateReinforcementQuiz(result.weakKnowledgePoints, questions, result, Date.now());
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
      {step === 'quiz' ? <QuizGenerator questions={questions} knowledgePoints={knowledgePoints} aiStatus={aiStatus} onStart={() => goToStep('taking')} /> : null}
      {step === 'taking' ? <QuizTaking questions={questions} answers={answers} setAnswers={setAnswers} onSubmit={handleSubmitQuiz} /> : null}
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
