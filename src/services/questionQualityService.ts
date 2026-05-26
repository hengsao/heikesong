import type { QuizQuestion, QuestionQualityReview } from '../types';

// 审查题目质量
export const reviewQuestionQuality = (question: QuizQuestion): QuestionQualityReview => {
  const problems: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 1. 明确考点 20分
  if (!question.knowledgePointId || question.question.length < 15) {
    score -= 20;
    problems.push('题干不够具体，考点不明确');
    suggestions.push('基于资料原文改写题干，明确考查点');
  }

  // 2. 符合考试题型 20分
  if (!question.examPattern) {
    score -= 20;
    problems.push('未明确考试题型');
    suggestions.push('明确标注题型，如公式套用题、条件辨析题等');
  }

  // 3. 干扰项合理 20分
  if (question.type === 'single' && question.options) {
    const hasWeakDistractor = question.options.some(opt =>
      opt.includes('只要') || opt.includes('不需要') || opt.length < 10
    );
    if (hasWeakDistractor) {
      score -= 20;
      problems.push('干扰项太弱，一眼可排除');
      suggestions.push('干扰项应来自真实易错点，不是明显错误');
    }

    // 检查选项是否过于相似或重复
    const optionTexts = question.options.map(opt =>
      opt.replace(/^[A-D][.、]\s*/, '').replace(/\s+/g, '')
    );
    const uniqueOptions = new Set(optionTexts);
    if (uniqueOptions.size < question.options.length) {
      score -= 15;
      problems.push('选项存在重复或过于相似');
      suggestions.push('确保四个选项内容有明显区分度');
    }
  }

  // 4. 解析能教会学生 20分
  if (!question.explanation || question.explanation.length < 20) {
    score -= 20;
    problems.push('解析过于简单，无法教会学生');
    suggestions.push('解析应包含：考点定位、解题思路、关键步骤');
  }

  // 5. 有得分点和常见误区 20分
  if (!question.scoringRubric || question.scoringRubric.length === 0) {
    score -= 20;
    problems.push('缺少得分点');
    suggestions.push('明确列出每步得分');
  }
  if (!question.commonMistake) {
    score -= 10;
    problems.push('缺少常见误区提示');
    suggestions.push('添加学生常见错误提示');
  }

  // 额外检查：避免空泛题目
  if (question.question.includes('为什么重要') ||
      question.question.includes('请谈谈理解') ||
      question.question.includes('有什么意义')) {
    score -= 25;
    problems.push('题目过于空泛，缺乏具体考查点');
    suggestions.push('改为具体的能力考查，如"能根据...求..."');
  }

  // 检查资料依据
  if (!question.sourceEvidence || question.sourceEvidence.length < 10) {
    score -= 15;
    problems.push('缺少资料依据');
    suggestions.push('添加题目对应的资料原文依据');
  }

  // 直接不通过的情况
  const passed = score >= 80 &&
    !question.question.includes('为什么重要') &&
    !question.question.includes('请谈谈理解') &&
    question.options?.every(opt => opt.length > 8) !== false;

  return {
    questionId: question.id,
    score: Math.max(0, score),
    problems,
    suggestions,
    passed,
  };
};

// 批量审查
export const reviewQuestionsQuality = (questions: QuizQuestion[]): QuestionQualityReview[] => {
  return questions.map(reviewQuestionQuality);
};

// 获取质量等级
export const getQualityLevel = (score: number): '优秀' | '良好' | '合格' | '不合格' => {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 60) return '合格';
  return '不合格';
};

// 生成质量报告
export const generateQualityReport = (reviews: QuestionQualityReview[]): {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
  qualityLevel: '优秀' | '良好' | '合格' | '不合格';
  commonProblems: string[];
} => {
  const total = reviews.length;
  const passed = reviews.filter(r => r.passed).length;
  const failed = total - passed;
  const averageScore = total > 0
    ? Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / total)
    : 0;

  // 统计常见问题
  const problemCount: Record<string, number> = {};
  for (const review of reviews) {
    for (const problem of review.problems) {
      problemCount[problem] = (problemCount[problem] || 0) + 1;
    }
  }

  const commonProblems = Object.entries(problemCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([problem, count]) => `${problem}(${count}题)`);

  return {
    total,
    passed,
    failed,
    averageScore,
    qualityLevel: getQualityLevel(averageScore),
    commonProblems,
  };
};
