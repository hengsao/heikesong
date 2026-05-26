import type { KnowledgePoint, QuestionResult, QuizQuestion, QuizResult, UserAnswer } from '../types';

const normalizeAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。；：、,.!?！？]/g, '');

const splitKeywords = (value: string) =>
  value
    .split(/[，。、；：\s/+()（）=]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

const containsMeaning = (answer: string, target: string) => {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedTarget = normalizeAnswer(target);
  if (!normalizedTarget) return false;
  if (normalizedAnswer.includes(normalizedTarget)) return true;
  const keywords = splitKeywords(target);
  if (keywords.length === 0) return false;
  const matched = keywords.filter((keyword) => normalizedAnswer.includes(normalizeAnswer(keyword)));
  return matched.length >= Math.ceil(keywords.length * 0.45);
};

const evaluateShortAnswer = (question: QuizQuestion, userAnswer: string, maxScore: number): QuestionResult => {
  const rubric = question.scoringRubric?.length
    ? question.scoringRubric
    : splitKeywords(question.answer).slice(0, 6).map((item) => `包含关键词：${item}`);
  const steps = question.solutionSteps ?? [];
  const matchedRubric = rubric.filter((item) => containsMeaning(userAnswer, item));
  const matchedSteps = steps.filter((item) => containsMeaning(userAnswer, item));
  const formulaHints = [question.answer, question.explanation, ...(question.solutionSteps ?? [])]
    .join('\n')
    .match(/(?:sin|cos|tan)[²^]?[αa-z]?|平方关系|商数关系|象限|正负号|公式|步骤|材料依据/g) ?? [];
  const matchedFormulaHints = [...new Set(formulaHints)].filter((item) => containsMeaning(userAnswer, item));

  const totalUnits = Math.max(rubric.length + steps.length + Math.min(matchedFormulaHints.length + 1, 3), 1);
  const matchedUnits = matchedRubric.length + matchedSteps.length + Math.min(matchedFormulaHints.length, 3);
  const score = Math.min(maxScore, Math.round((matchedUnits / totalUnits) * maxScore));
  const missingRubric = rubric.filter((item) => !matchedRubric.includes(item));

  return {
    questionId: question.id,
    isCorrect: score >= 7,
    score,
    maxScore,
    userAnswer,
    matchedKeywords: [...matchedSteps, ...matchedFormulaHints],
    matchedRubric,
    missingRubric,
    feedback:
      score >= 8
        ? '步骤和得分点较完整。'
        : score >= 5
          ? `已命中部分得分点，但仍缺少：${missingRubric.slice(0, 2).join('；') || '关键步骤'}。`
          : `答案缺少主要步骤和得分点，建议对照标准步骤重做。`,
  };
};

export const evaluateQuizAnswers = (
  questions: QuizQuestion[],
  answers: UserAnswer[],
  knowledgePoints: KnowledgePoint[],
): QuizResult => {
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
  const maxPerQuestion = 10;

  const evaluated: QuestionResult[] = questions.map((question) => {
    const userAnswer = answerMap.get(question.id) ?? '';
    if (['short', 'fill', 'solution', 'material'].includes(question.type)) return evaluateShortAnswer(question, userAnswer, maxPerQuestion);

    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.answer);
    return {
      questionId: question.id,
      isCorrect,
      score: isCorrect ? maxPerQuestion : 0,
      maxScore: maxPerQuestion,
      userAnswer,
      matchedRubric: isCorrect ? question.scoringRubric ?? [] : [],
      missingRubric: isCorrect ? [] : question.scoringRubric ?? ['正确选项判断'],
      feedback: isCorrect ? '选择判断正确。' : question.commonMistake || '选项判断错误，请对照解析和易错项复盘。',
    };
  });

  const score = evaluated.reduce((sum, item) => sum + item.score, 0);
  const correctCount = evaluated.filter((item) => item.isCorrect).length;
  const wrongQuestions = evaluated.filter((item) => !item.isCorrect);
  const masteryRate = Math.round((score / (questions.length * maxPerQuestion)) * 100);

  const byKnowledgePoint = knowledgePoints.map((knowledgePoint) => {
    const relatedQuestions = questions.filter((question) => question.knowledgePointId === knowledgePoint.id);
    const relatedResults = relatedQuestions.map((question) => evaluated.find((item) => item.questionId === question.id)!);
    const kpScore = relatedResults.reduce((sum, item) => sum + item.score, 0);
    const kpMax = relatedResults.length * maxPerQuestion;
    return {
      knowledgePoint,
      correct: relatedResults.filter((item) => item.isCorrect).length,
      total: relatedResults.length,
      masteryRate: kpMax > 0 ? Math.round((kpScore / kpMax) * 100) : 100,
    };
  });

  const weakKnowledgePoints = byKnowledgePoint
    .filter((item) => item.total > 0 && item.masteryRate < 75)
    .map((item) => item.knowledgePoint);

  return {
    score,
    totalQuestions: questions.length,
    correctCount,
    wrongCount: wrongQuestions.length,
    masteryRate,
    weakKnowledgePoints,
    wrongQuestions,
    byKnowledgePoint,
  };
};
