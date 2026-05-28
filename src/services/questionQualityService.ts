import type { QuizQuestion, QuestionQualityReview } from '../types';

// 禁止的万能题干模式
const BANNED_QUESTION_PATTERNS = [
  '下列说法正确的是',
  '下列理解恰当的是',
  '关于.*下列说法正确的是',
  '以下关于.*的描述.*正确的是',
  '根据原文.*下列选项正确的是',
  '下列选项中.*符合原文的是',
  '为什么重要',
  '请谈谈理解',
  '有什么意义',
];

// 审查题目质量
export const reviewQuestionQuality = (question: QuizQuestion): QuestionQualityReview => {
  const problems: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 1. 题干多样化检查（25分）- 最高优先级
  const hasBannedPattern = BANNED_QUESTION_PATTERNS.some(pattern => {
    try {
      return new RegExp(pattern).test(question.question);
    } catch {
      return question.question.includes(pattern);
    }
  });
  if (hasBannedPattern) {
    score -= 25;
    problems.push('题干使用了禁止的万能格式（如"下列说法正确的是"），缺乏具体考查目标');
    suggestions.push('基于原文具体内容改写题干，如"根据原文第X段，关于XXX的描述，错误的一项是"');
  }

  // 2. 题干具体性检查（15分）
  if (!question.knowledgePointId || question.question.length < 15) {
    score -= 15;
    problems.push('题干不够具体，考点不明确');
    suggestions.push('基于资料原文改写题干，明确考查点');
  }

  // 3. 符合考试题型（10分）
  if (!question.examPattern) {
    score -= 10;
    problems.push('未明确考试题型');
    suggestions.push('明确标注题型，如公式套用题、条件辨析题等');
  }

  // 4. 干扰项质量检查（25分）- 核心检查
  if (question.type === 'single' && question.options && question.options.length >= 4) {
    // 检查是否有明显不符合常识的干扰项
    const hasObviousWrong = question.options.some(opt =>
      opt.includes('只要') && opt.includes('就可以') ||
      opt.includes('不需要') && opt.length < 15 ||
      opt.includes('只能') && opt.includes('不能') ||
      opt.includes('从来没有') ||
      opt.includes('完全不可能') ||
      opt.length < 8
    );
    if (hasObviousWrong) {
      score -= 25;
      problems.push('干扰项存在明显不符合常识的内容，学生无需思考即可排除');
      suggestions.push('所有干扰项必须100%来自原文内容，使用偷换概念、扩大范围、因果倒置等错误类型');
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

    // 检查正确答案是否有特殊语言特征
    const answerIndex = question.options.findIndex(opt => {
      const cleaned = opt.replace(/^[A-D][.、]\s*/, '');
      return cleaned === question.answer || opt.startsWith(question.answer);
    });
    if (answerIndex >= 0) {
      const correctOpt = question.options[answerIndex].replace(/^[A-D][.、]\s*/, '');
      const otherOpts = question.options.filter((_, i) => i !== answerIndex).map(o => o.replace(/^[A-D][.、]\s*/, ''));
      const avgLen = otherOpts.reduce((sum, o) => sum + o.length, 0) / Math.max(otherOpts.length, 1);
      // 正确答案明显更长
      if (correctOpt.length > avgLen * 1.5) {
        score -= 10;
        problems.push('正确答案明显比其他选项长，具有特殊语言特征');
        suggestions.push('调整选项长度，使正确答案不因长度而被轻易识别');
      }
    }
  }

  // 5. 解析质量检查（15分）
  if (!question.explanation || question.explanation.length < 30) {
    score -= 15;
    problems.push('解析过于简单，无法教会学生');
    suggestions.push('解析应包含：考点定位、解题思路、关键步骤、原文依据');
  }

  // 6. 得分点和常见误区（10分）
  if (!question.scoringRubric || question.scoringRubric.length === 0) {
    score -= 10;
    problems.push('缺少得分点');
    suggestions.push('明确列出每步得分');
  }
  if (!question.commonMistake || question.commonMistake.length < 10) {
    score -= 10;
    problems.push('缺少常见误区提示或过于简略');
    suggestions.push('添加具体的学生常见错误提示，不能是模板废话');
  }

  // 7. 原文依据检查（10分）
  if (!question.sourceEvidence || question.sourceEvidence.length < 10) {
    score -= 10;
    problems.push('缺少原文依据或依据过于简略');
    suggestions.push('添加题目对应的原文具体句子作为依据');
  }

  // 直接不通过的情况
  const passed = score >= 80 &&
    !hasBannedPattern &&
    question.options?.every(opt => opt.length > 8) !== false &&
    (question.explanation?.length ?? 0) >= 20;

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