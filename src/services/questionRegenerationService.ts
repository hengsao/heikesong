/**
 * 低质量题重生成服务
 * 当 LLM 生成的题目质量审查不通过时，重写该题
 */
import type {
  QuestionBlueprint,
  KnowledgeCard,
  QuizQuestion,
  QuizSettings,
  QuestionQualityReview,
} from '../types';
import { callLLMJson } from './llmClient';
import { reviewQuestionQuality } from './questionQualityService';

interface RegenerateParams {
  failedQuestions: QuizQuestion[];
  qualityReviews: QuestionQualityReview[];
  blueprints: QuestionBlueprint[];
  knowledgeCards: KnowledgeCard[];
  materialText: string;
  settings: QuizSettings;
}

interface RegenerateResult {
  regeneratedQuestions: QuizQuestion[];
  replacedQuestions: QuizQuestion[];
  finalQuestions: QuizQuestion[];
}

// ========== 主入口 ==========

export const regenerateLowQualityQuestions = async (params: RegenerateParams): Promise<RegenerateResult> => {
  const { failedQuestions, qualityReviews, blueprints, knowledgeCards, materialText, settings } = params;

  const regeneratedQuestions: QuizQuestion[] = [];
  const replacedQuestions: QuizQuestion[] = [];

  for (const failedQ of failedQuestions) {
    const review = qualityReviews.find(r => r.questionId === failedQ.id);
    const blueprint = blueprints.find(b => b.id === failedQ.blueprintId);
    const card = knowledgeCards.find(kc => kc.id === blueprint?.knowledgeCardId);

    if (!blueprint) {
      replacedQuestions.push(failedQ);
      continue;
    }

    try {
      const regenerated = await tryRegenerateQuestion(failedQ, review, blueprint, card, materialText, settings);

      if (regenerated) {
        const newReview = reviewQuestionQuality(regenerated);
        regenerated.qualityScore = newReview.score;
        regenerated.qualityReview = newReview;

        if (newReview.score >= 80) {
          regeneratedQuestions.push(regenerated);
        } else {
          replacedQuestions.push(failedQ);
        }
      } else {
        replacedQuestions.push(failedQ);
      }
    } catch {
      replacedQuestions.push(failedQ);
    }
  }

  return { regeneratedQuestions, replacedQuestions, finalQuestions: regeneratedQuestions };
};

// ========== 重生成单道题 ==========

const tryRegenerateQuestion = async (
  failedQuestion: QuizQuestion,
  review: QuestionQualityReview | undefined,
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  materialText: string,
  settings: QuizSettings
): Promise<QuizQuestion | null> => {
  const problems = review?.problems || [];
  const suggestions = review?.suggestions || [];

  const { systemPrompt, userPrompt } = buildRegeneratePrompt(failedQuestion, blueprint, card, materialText, problems, suggestions);

  try {
    const result = await callLLMJson(systemPrompt, userPrompt, {
      temperature: 0.6,
      max_tokens: 2000,
    }) as { questions: Partial<QuizQuestion>[] } | null;

    if (!result || !result.questions || result.questions.length === 0) {
      return null;
    }

    const regenerated = normalizeRegeneratedQuestion(result.questions[0], blueprint, card);
    return regenerated;
  } catch {
    return null;
  }
};

// ========== 构建重生成 Prompt ==========

const buildRegeneratePrompt = (
  failedQuestion: QuizQuestion,
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  materialText: string,
  problems: string[],
  suggestions: string[]
): { systemPrompt: string; userPrompt: string } => {
  const subject = card?.subject || '通用';

  const isMath = ['数学', '高等数学', '线性代数', '概率统计'].includes(subject);
  const isChinese = ['语文', '哲学', '文学', '历史学', '艺术学'].includes(subject);
  const isEnglish = subject === '英语';
  const isPhysics = ['物理', '大学物理', '电路'].includes(subject);
  const isChemistry = subject === '化学';

  let subjectInstructions = '';

  if (isMath) {
    subjectInstructions = `## 数学题特殊要求
1. 必须包含具体数值（不能只是 x、y 这样的未知数）
2. 公式必须完整，不能省略
3. 干扰项要体现真实计算错误（如符号错误、公式记错、条件漏用）
4. 解答题必须有标准解题步骤`;
  } else if (isChinese) {
    subjectInstructions = `## 语文题特殊要求
1. 题目必须有具体语境或材料
2. 选项不能是泛泛的评价，要有具体分析
3. 禁止使用"正确""错误"这类简单判断作为正确选项
4. 要考查对语言运用或文学手法的理解`;
  } else if (isEnglish) {
    subjectInstructions = `## 英语题特殊要求
1. 题目必须是英文（除了题型标签）
2. 干扰项要有一定的词汇或语法迷惑性
3. 不能出现"与文章内容无关"的选项
4. 正确答案不能明显最长或最短`;
  } else if (isPhysics) {
    subjectInstructions = `## 物理题特殊要求
1. 必须有具体物理量（长度、速度、力等）
2. 干扰项要体现真实物理错误
3. 要有单位意识`;
  } else if (isChemistry) {
    subjectInstructions = `## 化学题特殊要求
1. 要有具体化学方程式或物质名称
2. 干扰项要体现真实化学知识错误
3. 要有反应条件意识`;
  }

  const systemPrompt = `你是一位资深考试命题教研专家。请严格按照以下要求重写题目。

## 质量审查问题（必须全部解决）
${problems.map(p => `- ${p}`).join('\n')}

## 改进建议
${suggestions.map(s => `- ${s}`).join('\n')}

## 命题蓝图
- 考点：${blueprint.knowledgePoint}
- 考查目标：${blueprint.targetAbility}
- 必需方法：${blueprint.requiredMethods.join('、')}
- 得分点：${blueprint.scoringPoints.join('、')}
- 常见错误：${blueprint.commonWrongMethods.join('、')}
- 题型：${blueprint.examPattern}
- 难度：${blueprint.difficulty}
- 来源依据：${blueprint.sourceEvidence.slice(0, 300)}

${subjectInstructions}`;

  const userPrompt = `## 输出格式
请输出以下 JSON（只输出 JSON，不要有其他文字）：
{
  "questions": [
    {
      "id": "regen-1",
      "blueprintId": "${blueprint.id}",
      "type": "${failedQuestion.type}",
      "examPattern": "${blueprint.examPattern}",
      "difficulty": "${blueprint.difficulty}",
      "question": "具体题干",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "answer": "A",
      "explanation": "详细解析",
      "optionExplanations": {
        "A": "解释为什么正确",
        "B": "解释为什么错误",
        "C": "解释为什么错误",
        "D": "解释为什么错误"
      },
      "knowledgePointId": "${blueprint.knowledgeCardId}",
      "targetAbility": "${blueprint.targetAbility}",
      "requiredMethods": [${blueprint.requiredMethods.map(m => `"${m}"`).join(',')}],
      "scoringRubric": [${blueprint.scoringPoints.map(p => `"${p}"`).join(',')}],
      "solutionSteps": ${JSON.stringify(failedQuestion.type === 'solution' || failedQuestion.type === 'material' ? ['识别条件', '选择方法', '规范求解', '检验结论'] : [])},
      "commonMistake": "${blueprint.commonWrongMethods[0] || '对该考点理解不准确'}",
      "sourceEvidence": "${blueprint.sourceEvidence.slice(0, 200)}"
    }
  ]
}`;

  return { systemPrompt, userPrompt };
};

// ========== 规范化重生成的题目 ==========

const normalizeRegeneratedQuestion = (
  raw: Partial<QuizQuestion>,
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined
): QuizQuestion => {
  return {
    id: raw.id || `regen-${blueprint.id}-${Date.now()}`,
    type: raw.type || 'single',
    examPattern: raw.examPattern || blueprint.examPattern,
    difficulty: raw.difficulty || blueprint.difficulty,
    question: raw.question || '题目生成失败',
    options: raw.options || [],
    answer: raw.answer || 'A',
    explanation: raw.explanation || '',
    optionExplanations: raw.optionExplanations || {},
    knowledgePointId: blueprint.knowledgeCardId,
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: raw.requiredMethods || blueprint.requiredMethods,
    scoringRubric: raw.scoringRubric || blueprint.scoringPoints,
    solutionSteps: raw.solutionSteps || [],
    commonMistake: raw.commonMistake || blueprint.commonWrongMethods[0] || '',
    sourceEvidence: raw.sourceEvidence || blueprint.sourceEvidence,
  };
};
