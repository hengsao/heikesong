import type {
  DiagnosisItem,
  Difficulty,
  ExamQuestionPattern,
  KnowledgeCard,
  KnowledgePoint,
  QuestionBlueprint,
  ContentType,
  QuizQuestion,
  QuizResult,
  QuizSettings,
  ReinforcementQuestion,
  ReviewPlanDay,
  SubjectType,
  UserAnswer,
} from '../types';
import { evaluateQuizAnswers } from '../utils/scoring';
import { getExamStrategy, inferSubjectType } from './examStrategy';
import { callLLMJson, getAIStatus } from './llmClient';
import { buildDiagnosisPrompt, buildKnowledgePrompt, buildQuizPrompt } from './promptTemplates';
import { generateKnowledgeCards, generateQuestionBlueprints, validateBlueprint } from './questionBlueprintService';
import { reviewQuestionQuality, reviewQuestionsQuality } from './questionQualityService';
import { regenerateLowQualityQuestions } from './questionRegenerationService';
import { generateFallbackQuestionsFromBlueprints } from './fallbackQuestionFactory';
import { generateFallbackReinforcementQuestions } from './reinforcementFactory';

export { getAIStatus };

// 有效的考试题型模式
const VALID_EXAM_PATTERNS: ExamQuestionPattern[] = [
  '基础概念题',
  '公式套用题',
  '条件辨析题',
  '易错判断题',
  '材料分析题',
  '变式迁移题',
  '综合解答题',
];

// ========== 知识点提取：强制使用API，失败则报错 ==========
const isKnowledgePoint = (item: unknown): item is KnowledgePoint => {
  const value = item as Partial<KnowledgePoint>;
  return Boolean(
    value?.id &&
    value.title &&
    value.description &&
    value.importance &&
    value.masteryTarget &&
    value.examType
  );
};

const normalizeKnowledgePoints = (input: unknown): KnowledgePoint[] => {
  const record = input as Record<string, unknown>;
  const list = Array.isArray(record?.knowledgePoints) ? record.knowledgePoints : [];

  return list
    .filter(isKnowledgePoint)
    .map((item, index): KnowledgePoint => {
      const rawPatterns = Array.isArray(item.examPatterns) ? item.examPatterns : [];
      const filteredPatterns: ExamQuestionPattern[] = [];

      for (const p of rawPatterns) {
        if (VALID_EXAM_PATTERNS.includes(p as ExamQuestionPattern)) {
          filteredPatterns.push(p as ExamQuestionPattern);
        }
      }

      return {
        id: item.id || `kp-${index + 1}`,
        title: item.title,
        description: item.description,
        importance: item.importance,
        masteryTarget: item.masteryTarget,
        examType: item.examType,
        sourceEvidence: item.sourceEvidence || item.description,
        keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 5) : [],
        subjectType: item.subjectType || '通用',
        examPatterns: filteredPatterns.length > 0 ? filteredPatterns : ['基础概念题', '易错判断题'],
        formulas: Array.isArray(item.formulas) ? item.formulas.slice(0, 4) : [],
        commonMistakes: Array.isArray(item.commonMistakes) ? item.commonMistakes.slice(0, 4) : [],
        keyMethods: Array.isArray(item.keyMethods) ? item.keyMethods.slice(0, 4) : [],
      };
    })
    .slice(0, 8);
};

// ========== 试卷自动识别 ==========
export function detectContentType(text: string): ContentType {
  const examKeywords = [
    '考试', '真题', 'Directions', 'Section A', 'Section B', 'Section C',
    'Part I', 'Part II', 'Part III', 'Part IV',
    '选择题', '答案', '听力', '阅读理解', '翻译', '写作',
  ];
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const keyword of examKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  return matchCount >= 3 ? 'exam' : 'material';
}

export interface ExamPaperResult {
  examType: string;
  questions: QuizQuestion[];
}

export const extractExamPaper = async (materialText: string): Promise<ExamPaperResult> => {
  const systemPrompt = '你是一个专业的考试试题提取助手。你的唯一任务是从试卷内容中提取所有题目。你必须逐行扫描，不放过任何一道题。你只能输出 JSON。';
  const userPrompt = `请从以下内容中提取所有考试题目。

【重要提示】以下内容可能是多页试卷合并而成（通过OCR识别多张图片后拼接）。如果看到 "========== 第X页 ==========" 这样的分页标记，说明这是多页内容，请把所有页的题目合并提取，当作一份完整试卷处理。

【强制规则 - 逐条执行】
1. 遍历全部内容，逐行扫描，找到所有包含 "A) B) C) D)" 或 "A. B. C. D." 或 "1. 2. 3. 4." 选项标记的题目
2. 听力题：只有题目文本+选项，没有原文段落，正常提取，type 为 "single"
3. 阅读题：有文章段落+题目+选项，提取题目和选项，explanation 中注明原文出处
4. 写作题：提取写作要求作为题干（question 字段），type 为 "short"，options 为空数组 []
5. 翻译题：提取翻译要求作为题干，type 为 "short"，options 为空数组 []
6. 填空题：提取填空内容作为题干，type 为 "fill"
7. 多页内容：把所有页的题目全部提取出来，不要遗漏任何一页！忽略分页标记，把所有内容当作一份完整试卷
8. 哪怕只有 1 道题，也要正常返回，绝对不能返回空数组！
9. 如果实在找不到任何题目，返回 {"examType": "fallback", "questions": []}，让系统降级处理

输出格式：
\`\`\`json
{
  "examType": "试卷类型（如：大学英语六级考试）",
  "questions": [
    {
      "id": "q-1",
      "type": "single",
      "question": "题干内容（听力题直接写题目文本，写作题写写作要求）",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案（如果试卷中有答案就填，没有就填\"见解析\"）",
      "explanation": "答案解析或原文出处",
      "difficulty": "中等",
      "qualityScore": 85
    }
  ]
}
\`\`\`

试卷内容（多页合并）：
${materialText.slice(0, 20000)}`;

  const llmResult = await callLLMJson(systemPrompt, userPrompt);
  
  if (!llmResult) {
    throw new Error('AI服务暂时不可用');
  }

  const record = llmResult as Record<string, unknown>;
  const examType = (record.examType as string) || '';
  const questions = Array.isArray(record.questions) 
    ? record.questions.filter((q: any) => Boolean(q?.question)).map((q: any, i: number) => ({
        ...q,
        id: q.id || `exam-q-${i + 1}`,
        type: q.type || 'single',
        difficulty: q.difficulty || '中等',
        qualityScore: q.qualityScore ?? 85,
        sourceEvidence: q.sourceEvidence || materialText.slice(0, 200),
      }))
    : [];

  // 降级保护：如果提取到0道题，标记为 fallback 让前端降级到学习资料模式
  if (questions.length === 0) {
    console.warn('[真题提取] 提取到0道题，触发降级保护');
    return { examType: 'fallback', questions: [] };
  }

  return { examType, questions };
};

export const extractKnowledgePoints = async (materialText: string): Promise<KnowledgePoint[]> => {
  const subjectType = inferSubjectType(materialText);
  const prompt = buildKnowledgePrompt(materialText, subjectType);
  const llmResult = await callLLMJson(prompt.systemPrompt, prompt.userPrompt);

  if (!llmResult) {
    throw new Error('AI服务暂时不可用，请检查网络连接或稍后重试');
  }

  const knowledgePoints = normalizeKnowledgePoints(llmResult);

  if (knowledgePoints.length === 0) {
    throw new Error('未能从资料中提取到有效的知识点，请检查资料内容是否包含可考查的考点');
  }

  return knowledgePoints;
};

// ========== 题目生成：考点卡 → 命题蓝图 → LLM生成 → 质量审查 → 重生成 → fallback ==========

const isQuizQuestion = (item: unknown): item is QuizQuestion => {
  const value = item as Partial<QuizQuestion>;
  return Boolean(
    value?.id &&
    value.type &&
    value.question &&
    value.answer &&
    value.explanation &&
    value.knowledgePointId &&
    value.difficulty
  );
};

const normalizeQuestions = (
  input: unknown,
  knowledgePoints: KnowledgePoint[],
  blueprints: QuestionBlueprint[]
): QuizQuestion[] => {
  const record = input as Record<string, unknown>;
  const list = Array.isArray(record?.questions) ? record.questions : [];

  return list
    .filter(isQuizQuestion)
    .map((item, index) => {
      const point = knowledgePoints[index % knowledgePoints.length];
      const blueprint = blueprints[index % blueprints.length];
      return {
        ...item,
        id: item.id || `q-${index + 1}`,
        knowledgePointId: item.knowledgePointId || point?.id || `kp-${index}`,
        blueprintId: item.blueprintId || blueprint?.id || '',
        sourceEvidence: item.sourceEvidence || point?.sourceEvidence || '',
        examPattern: item.examPattern || blueprint?.examPattern || '基础概念题',
        targetAbility: item.targetAbility || blueprint?.targetAbility || '',
        requiredMethods: Array.isArray(item.requiredMethods)
          ? item.requiredMethods
          : blueprint?.requiredMethods || [],
        scoringRubric: Array.isArray(item.scoringRubric) ? item.scoringRubric : [],
        solutionSteps: Array.isArray(item.solutionSteps) ? item.solutionSteps : [],
        commonMistake: item.commonMistake || '',
        optionExplanations: item.optionExplanations || {},
        qualityScore: item.qualityScore ?? 90,
      };
    })
    .slice(0, 15);
};

const difficultyFromSettings = (index: number, total: number, settings?: QuizSettings): Difficulty => {
  if (!settings?.difficultyRatio) return index < 3 ? '简单' : index < 7 ? '中等' : '较难';

  const { easy, medium } = settings.difficultyRatio;
  const totalRatio = easy + medium + (100 - easy - medium);
  const easyCount = Math.max(1, Math.round(total * (easy / totalRatio)));
  const mediumCount = Math.max(1, Math.round(total * (medium / totalRatio)));

  if (index < easyCount) return '简单';
  if (index < easyCount + mediumCount) return '中等';
  return '较难';
};

/**
 * 完整的题目生成流程：
 * 1. 生成考点卡（KnowledgeCard）
 * 2. 生成命题蓝图（QuestionBlueprint）
 * 3. 调用 LLM 生成题目
 * 4. 质量审查（每道题）
 * 5. 低质量题重生成
 * 6. 仍不合格则用 fallback 模板替换
 */
export const generateQuiz = async (
  knowledgePoints: KnowledgePoint[],
  materialText: string,
  settings?: QuizSettings
): Promise<QuizQuestion[]> => {
  if (knowledgePoints.length === 0) {
    throw new Error('没有可用的知识点，无法生成题目');
  }

  const targetCount = settings?.questionCount ?? 10;
  const subjectType = settings?.subjectType || inferSubjectType(materialText);

  // ===== 步骤1: 生成考点卡 =====
  let knowledgeCards: KnowledgeCard[] = [];
  try {
    knowledgeCards = await generateKnowledgeCards(materialText, knowledgePoints, subjectType === '自动识别' ? undefined : subjectType);
  } catch (err) {
    console.warn('[智学闭环] 考点卡生成失败，使用备用方案:', err);
  }

  // ===== 步骤2: 生成命题蓝图 =====
  let blueprints: QuestionBlueprint[] = [];
  try {
    blueprints = await generateQuestionBlueprints(knowledgeCards, settings);
    // 过滤不合格蓝图
    blueprints = blueprints.filter(bp => validateBlueprint(bp));
  } catch (err) {
    console.warn('[智学闭环] 命题蓝图生成失败，使用备用方案:', err);
  }

  // 如果蓝图不足，用知识点补齐
  if (blueprints.length < targetCount) {
    const extraBlueprints = knowledgePoints.slice(0, targetCount).map((kp, i) => ({
      id: `bp-kp-${kp.id}`,
      knowledgeCardId: knowledgeCards[i % Math.max(knowledgeCards.length, 1)]?.id || kp.id,
      knowledgePoint: kp.title,
      targetAbility: kp.masteryTarget || `理解并掌握"${kp.title}"的核心概念`,
      requiredMethods: kp.keyMethods?.slice(0, 3) || ['理解核心概念', '辨别易错点'],
      examPattern: (kp.examPatterns?.[0] || '基础概念题') as ExamQuestionPattern,
      difficulty: (['简单', '中等', '较难'] as Difficulty[])[i % 3],
      scoringPoints: [kp.description?.slice(0, 50) || '核心概念正确'].concat(
        kp.commonMistakes?.slice(0, 2) || []
      ),
      commonWrongMethods: kp.commonMistakes?.slice(0, 3) || ['对该概念理解模糊'],
      sourceEvidence: kp.sourceEvidence || kp.description || '',
      estimatedTime: 3,
    }));
    blueprints = [...blueprints, ...extraBlueprints].slice(0, targetCount);
  }

  // ===== 步骤3: 调用 LLM 生成题目 =====
  let questions: QuizQuestion[] = [];
  let llmFailed = false;

  try {
    const prompt = buildQuizPrompt(materialText, knowledgePoints, settings, knowledgeCards, blueprints);
    const llmResult = await callLLMJson(prompt.systemPrompt, prompt.userPrompt);

    if (llmResult) {
      questions = normalizeQuestions(llmResult, knowledgePoints, blueprints);
    } else {
      llmFailed = true;
    }
  } catch (err) {
    console.warn('[智学闭环] LLM 生成题目失败:', err);
    llmFailed = true;
  }

  // ===== 步骤4: 质量审查 =====
  const allReviews = reviewQuestionsQuality(questions);
  questions = questions.map((q, i) => ({
    ...q,
    qualityScore: allReviews[i]?.score ?? 100,
    qualityReview: allReviews[i],
  }));

  // ===== 步骤5: 重生成低质量题 =====
  const failedQuestions = questions.filter(q => (q.qualityScore ?? 100) < 80);
  const failedReviews = allReviews.filter((r, i) => (questions[i].qualityScore ?? 100) < 80);

  if (failedQuestions.length > 0 && !llmFailed) {
    try {
      const { regeneratedQuestions, replacedQuestions } = await regenerateLowQualityQuestions({
        failedQuestions,
        qualityReviews: failedReviews,
        blueprints,
        knowledgeCards,
        materialText,
        settings: settings!,
      });

      // 替换失败题
      let result = questions;
      for (const regen of regeneratedQuestions) {
        const idx = result.findIndex(q => q.id === regen.id);
        if (idx >= 0) {
          result[idx] = regen;
        }
      }

      // 标记仍不合格的题
      for (const replaced of replacedQuestions) {
        const idx = result.findIndex(q => q.id === replaced.id);
        if (idx >= 0) {
          result[idx] = { ...replaced, qualityScore: 0 };
        }
      }

      questions = result;
    } catch (err) {
      console.warn('[智学闭环] 重生成失败:', err);
    }
  }

  // ===== 步骤6: fallback 替换仍不合格的题 =====
  const stillLowQuality = questions.filter(q => (q.qualityScore ?? 100) < 80);

  if (stillLowQuality.length > 0 && blueprints.length > 0) {
    console.warn(`[智学闭环] ${stillLowQuality.length} 道题质量仍不合格，使用 fallback 模板替换`);

    try {
      const fallbackQuestions = generateFallbackQuestionsFromBlueprints(blueprints, knowledgeCards, settings);

      for (const fl of fallbackQuestions) {
        // 找到第一道不合格的题，用 fallback 题替换
        const lowIdx = questions.findIndex(q => (q.qualityScore ?? 100) < 80);
        if (lowIdx >= 0) {
          questions[lowIdx] = fl;
        }
      }
    } catch (err) {
      console.warn('[智学闭环] fallback 生成失败:', err);
    }
  }

  // 过滤所有低于 80 分的题
  const finalQuestions = questions.filter(q => (q.qualityScore ?? 100) >= 80);

  // 如果最终题数不足，用 fallback 补充
  if (finalQuestions.length < targetCount && blueprints.length > 0) {
    try {
      const additional = generateFallbackQuestionsFromBlueprints(
        blueprints.slice(0, targetCount - finalQuestions.length),
        knowledgeCards,
        settings
      );
      questions = [...finalQuestions, ...additional];
    } catch {
      questions = finalQuestions;
    }
  } else {
    questions = finalQuestions;
  }

  if (questions.length === 0) {
    throw new Error('未能生成有效题目，请稍后重试');
  }

  // 应用难度设置
  return questions.slice(0, targetCount).map((q, index) => ({
    ...q,
    difficulty: difficultyFromSettings(index, Math.min(questions.length, targetCount), settings),
  }));
};

// ========== 答案评估 ==========
export const evaluateAnswers = async (
  questions: QuizQuestion[],
  answers: UserAnswer[],
  knowledgePoints: KnowledgePoint[]
): Promise<QuizResult> => evaluateQuizAnswers(questions, answers, knowledgePoints);

// ========== 诊断生成：强制使用API，失败则使用备用逻辑 ==========
const isDiagnosisItem = (item: unknown): item is DiagnosisItem => {
  const value = item as Partial<DiagnosisItem>;
  return Boolean(
    value?.id &&
    value.questionId &&
    value.question &&
    value.knowledgePointTitle &&
    value.reasonType &&
    value.diagnosis &&
    value.correctUnderstanding &&
    value.suggestion
  );
};

export const generateDiagnosis = async (
  result: QuizResult,
  questions: QuizQuestion[],
  answers: UserAnswer[]
): Promise<DiagnosisItem[]> => {
  const prompt = buildDiagnosisPrompt(result, questions, answers);
  const llmResult = await callLLMJson(prompt.systemPrompt, prompt.userPrompt);

  if (llmResult && Array.isArray((llmResult as Record<string, unknown>).diagnosis)) {
    const diagnosis = ((llmResult as Record<string, unknown>).diagnosis as unknown[])
      .filter(isDiagnosisItem);
    if (diagnosis.length > 0) return diagnosis;
  }

  // API失败时使用备用逻辑生成诊断
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
  const reasonTypes: DiagnosisItem['reasonType'][] = [
    '概念混淆',
    '关键词遗漏',
    '应用场景判断错误',
    '记忆不牢固',
    '表达不完整',
  ];

  return result.wrongQuestions.map((wrong, index) => {
    const question = questions.find((item) => item.id === wrong.questionId);
    if (!question) {
      return {
        id: `diag-${wrong.questionId}`,
        questionId: wrong.questionId,
        question: '未知题目',
        knowledgePointTitle: '未知知识点',
        userAnswer: answerMap.get(wrong.questionId) || '未作答',
        reasonType: '记忆不牢固',
        diagnosis: '无法定位题目信息',
        correctUnderstanding: '请查看原题和答案',
        suggestion: '请重新进行测评',
      };
    }

    const kp = result.byKnowledgePoint.find(
      (item) => item.knowledgePoint.id === question.knowledgePointId
    )?.knowledgePoint;

    const reasonType = ['short', 'fill', 'solution', 'material'].includes(question.type)
      ? '表达不完整'
      : reasonTypes[index % reasonTypes.length];

    const userAnswer = answerMap.get(question.id) || '未作答';

    const missingRubric = [
      ...(wrong.missingRubric?.length ? wrong.missingRubric : []),
      ...(question.scoringRubric ?? []),
    ].slice(0, 5);

    const commonMistake =
      question.commonMistake ||
      kp?.commonMistakes?.[0] ||
      '只看结论，没有结合条件、步骤或材料依据。';

    const masteryStatus: DiagnosisItem['masteryStatus'] =
      wrong.score <= 3 ? '薄弱' : wrong.score <= 7 ? '待加强' : '已掌握';

    const correctUnderstanding = `标准答案/结论：${question.answer}。解析：${question.explanation}${
      question.solutionSteps?.length ? ` 标准步骤：${question.solutionSteps.join('；')}` : ''
    }`;

    const targetedSuggestion = `你在本题中主要缺少"${
      missingRubric.slice(0, 3).join('、') || '关键得分点'
    }"，建议先回看资料依据"${
      question.sourceEvidence || kp?.sourceEvidence || kp?.description || '对应材料'
    }"，再按"${kp?.title ?? '该知识点'}"的标准步骤重做原题，随后完成 3 道同类变式；练习时重点检查：${commonMistake}`;

    return {
      id: `diag-${question.id}`,
      questionId: question.id,
      question: question.question,
      knowledgePointTitle: kp?.title ?? '相关知识点',
      userAnswer,
      reasonType,
      diagnosis: `你的答案"${userAnswer}"与标准答案"${question.answer}"不一致，主要问题是没有完整覆盖本题的条件、依据或得分步骤。`,
      correctUnderstanding,
      suggestion: targetedSuggestion,
      missingRubric: missingRubric.length ? missingRubric : ['关键得分点未命中', '材料依据未写完整'],
      commonMistake,
      masteryStatus,
    };
  });
};

// ========== 复习计划生成 ==========
export const generateReviewPlan = async (
  diagnosis: DiagnosisItem[],
  weakKnowledgePoints: KnowledgePoint[]
): Promise<ReviewPlanDay[]> => {
  const focus =
    weakKnowledgePoints.length > 0
      ? weakKnowledgePoints.map((item) => item.title)
      : ['核心概念', '应用场景'];

  const subjectType = weakKnowledgePoints[0]?.subjectType || '通用';
  const strategy = getExamStrategy(subjectType);
  const formulas = [...new Set(weakKnowledgePoints.flatMap((item) => item.formulas ?? []))];
  const mistakes = [
    ...new Set([
      ...weakKnowledgePoints.flatMap((item) => item.commonMistakes ?? []),
      ...strategy.commonMistakes,
    ]),
  ].slice(0, 5);

  const missingItems = [...new Set(diagnosis.flatMap((item) => item.missingRubric ?? []))].slice(
    0,
    6
  );

  const sourceEvidenceTasks = diagnosis.slice(0, 3).map(
    (item, index) =>
      `重做错题 ${index + 1}：先写标准答案，再补齐"${
        (item.missingRubric ?? missingItems).slice(0, 2).join('、') || '缺失得分点'
      }"`
  );

  const isMath = ['数学', '高等数学', '线性代数', '概率统计'].includes(subjectType);

  return [
    {
      day: 1,
      goal: isMath
        ? '掌握核心公式、定义和条件限制，建立母题解法框架。'
        : `巩固${focus.slice(0, 2).join('、')}等基础考点和判断规则。`,
      focusKnowledgePoints: focus.slice(0, 2),
      duration: '35 分钟',
      practiceCount: 6,
      method: isMath
        ? '先默写公式，再做 2 道母题，最后复盘条件和符号。'
        : '先整理规则，再做语境/材料判断题，最后用错因表复盘。',
      mustRemember:
        formulas.length > 0
          ? formulas
          : [`${focus[0]}的定义、适用条件和材料依据`, ...strategy.methods.slice(0, 2)],
      exampleTasks: isMath
        ? [
            '已知函数关系或公式条件，写出完整代入步骤。',
            '完成 1 道母题：公式识别 → 条件代入 → 结果检查。',
            ...sourceEvidenceTasks.slice(0, 1),
          ]
        : [
            '完成 2 道基础概念/规则识别题。',
            '从材料中划出能支撑判断的关键词。',
            ...sourceEvidenceTasks.slice(0, 1),
          ],
      reinforcementTasks: isMath
        ? [
            '换数值变式 2 道：只换数字，保持公式体系不变。',
            '换条件变式 2 道：专门检查符号、范围或单位。',
            ...(missingItems[0] ? [`补齐得分点专项：${missingItems[0]}`] : []),
          ]
        : [
            '新语境判断题 3 道：每题必须写材料依据。',
            '易错项辨析题 2 道：说明每个错误选项错在哪里。',
            ...(missingItems[0] ? [`补齐得分点专项：${missingItems[0]}`] : []),
          ],
      commonMistakes: mistakes.slice(0, 3),
      selfCheckCriteria: isMath
        ? ['能在 5 分钟内写出公式和适用条件。', '能说明每一步推导依据。']
        : ['能说出规则依据。', '能用材料原句支持判断。'],
      checklist: [
        { id: 'd1-1', text: '默写必背公式/定义', done: false },
        { id: 'd1-2', text: '完成母题或基础判断题', done: false },
        { id: 'd1-3', text: '记录 2 个易错点', done: false },
      ],
    },
    {
      day: 2,
      goal: isMath
        ? '强化条件辨析和变式迁移，减少因条件变化导致的失分。'
        : '强化材料中的应用场景、语境条件和易错辨析。',
      focusKnowledgePoints: focus.length > 2 ? focus.slice(1, 4) : focus,
      duration: '45 分钟',
      practiceCount: 8,
      method: isMath
        ? '按"已知条件变化、公式不变、符号/范围变化"做变式训练。'
        : '按"规则、语境、材料依据、易错项"四列制作对比表。',
      mustRemember: formulas.length > 0 ? formulas : strategy.methods,
      exampleTasks: isMath
        ? [
            '把第 1 天母题改 2 个条件重新求解。',
            '用红笔标出每题的条件限制。',
            ...sourceEvidenceTasks.slice(1, 2),
          ]
        : [
            '完成 3 道新语境材料判断题。',
            '说明每个错误选项错在哪里。',
            ...sourceEvidenceTasks.slice(1, 2),
          ],
      reinforcementTasks: isMath
        ? [
            '条件辨析题 3 道：每题写出"条件变化点"。',
            '易错判断题 3 道：专查符号、范围、单位或前提。',
            '综合解答题 2 道：按得分点自评。',
          ]
        : [
            '材料分析题 3 道：每题至少引用 1 处资料依据。',
            '易错判断题 3 道：写出错误原因。',
            '简答表达题 2 道：按要点分层作答。',
          ],
      commonMistakes: mistakes,
      selfCheckCriteria: isMath
        ? ['能主动检查符号、范围、单位或定义域。', '能独立写出至少 3 个得分点。']
        : ['能区分规则本身和语境条件。', '能完整写出判断理由。'],
      checklist: [
        { id: 'd2-1', text: '完成至少 6 道同类变式题', done: false },
        { id: 'd2-2', text: '标注每道题的条件变化', done: false },
        { id: 'd2-3', text: '整理错因和缺失得分点', done: false },
      ],
    },
    {
      day: 3,
      goal: '复盘错题并完成二次强化测试。',
      focusKnowledgePoints:
        diagnosis.length > 0
          ? [...new Set(diagnosis.map((item) => item.knowledgePointTitle))]
          : focus,
      duration: '30 分钟',
      practiceCount: 5,
      method: '先遮住解析重答错题，再完成系统生成的同类变式，最后按得分点自评。',
      mustRemember:
        formulas.length > 0
          ? formulas
          : [`${focus[0]}的易错边界`, '错题对应的标准步骤和得分点'],
      exampleTasks: [
        '重做原错题，不看答案写完整步骤。',
        '把每道错题改成一题同类变式。',
        ...sourceEvidenceTasks.slice(2, 3),
      ],
      reinforcementTasks: [
        '完成系统生成的强化题 3-5 道。',
        '每题对照标准步骤和得分点自评。',
        '把仍然缺失的得分点写成下一轮复习清单。',
      ],
      commonMistakes: mistakes,
      selfCheckCriteria: [
        '能说清原错因。',
        '能在限定时间内完成同类变式。',
        '能对照得分点找出缺失项。',
      ],
      checklist: [
        { id: 'd3-1', text: '遮住答案重做错题', done: false },
        { id: 'd3-2', text: '完成二次强化题', done: false },
        { id: 'd3-3', text: '按得分点自评并记录仍需复习项', done: false },
      ],
    },
  ];
};

// ========== 错题变式题生成 ==========
export const generateVariantQuestions = async (
  wrongQuestion: QuizQuestion,
  knowledgePoint: KnowledgePoint,
  materialText: string
): Promise<QuizQuestion[]> => {
  const systemPrompt = '你是高考命题专家。你必须只输出 JSON。';
  const userPrompt = `基于以下错题的知识点，生成3道考察同一原理但题干形式不同的变式题，难度略高于原题，帮助用户彻底掌握这个知识点。

原题：
${wrongQuestion.question}
${wrongQuestion.options ? wrongQuestion.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n') : ''}
正确答案：${wrongQuestion.answer}
知识点：${knowledgePoint.title}

要求：
1. 3道题必须考察同一核心原理，但题干场景、数值、条件不同
2. 难度略高于原题
3. 每道题包含完整题干、4个选项、正确答案、详细解析
4. 输出 JSON 格式：
{
  "questions": [
    {
      "id": "v-1",
      "type": "single",
      "question": "变式题题干",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "answer": "正确答案",
      "explanation": "详细解析",
      "difficulty": "中等",
      "qualityScore": 85
    }
  ]
}

资料原文参考：
${materialText.slice(0, 3000)}`;

  const llmResult = await callLLMJson(systemPrompt, userPrompt);
  if (!llmResult) return [];

  const record = llmResult as Record<string, unknown>;
  const questions = Array.isArray(record.questions)
    ? record.questions.map((q: any, i: number) => ({
        ...q,
        id: q.id || `variant-${i + 1}`,
        type: q.type || 'single',
        difficulty: q.difficulty || '中等',
        qualityScore: q.qualityScore ?? 85,
        knowledgePointId: knowledgePoint.id,
        sourceEvidence: materialText.slice(0, 200),
      }))
    : [];

  return questions;
};

// ========== 强化题生成（优先 LLM，失败用 fallback） ==========
export const generateReinforcementQuiz = async (
  weakKnowledgePoints: KnowledgePoint[],
  questions: QuizQuestion[] = [],
  result?: QuizResult,
  variantSeed = 0
): Promise<ReinforcementQuestion[]> => {
  const weak = weakKnowledgePoints.length > 0 ? weakKnowledgePoints : [];

  if (weak.length === 0) {
    return [];
  }

  const wrongQuestionMap = new Map(
    (result?.wrongQuestions ?? []).map((item) => [
      item.questionId,
      questions.find((question) => question.id === item.questionId),
    ])
  );

  const wrongQuestions = [...wrongQuestionMap.values()].filter(Boolean) as QuizQuestion[];

  // 优先尝试 LLM 生成
  try {
    const subjectType = weak[0]?.subjectType || '通用';
    const isMath = ['数学', '高等数学', '线性代数', '概率统计'].includes(subjectType);

    const basePrompt = isMath
      ? '你是一位数学强化训练命题专家。请为以下薄弱知识点生成同类变式题（换数值/换条件/换表述）。'
      : '你是一位学科强化训练命题专家。请为以下薄弱知识点生成同类变式题（换语境/换角度/换材料）。';

    const questionList = weak.slice(0, 5).map((kp, i) => ({
      knowledgePoint: kp.title,
      description: kp.description,
      formula: kp.formulas?.[0] || '',
      keyMethod: kp.keyMethods?.[0] || '',
      commonMistake: kp.commonMistakes?.[0] || '',
      sourceEvidence: kp.sourceEvidence || kp.description,
    }));

    const llmResult = await callLLMJson(
      `${basePrompt} 每个知识点生成 1 道变式题，包含题干、选项、答案、解析、提示、得分点。输出 JSON 格式：{"questions": [...]}`,
      JSON.stringify({ knowledgePoints: questionList, seed: variantSeed }, null, 2)
    );

    if (llmResult && Array.isArray((llmResult as Record<string, unknown>).questions)) {
      const llmQuestions = (llmResult as Record<string, unknown>).questions as ReinforcementQuestion[];
      if (llmQuestions.length > 0) {
        return llmQuestions.map((q, i) => ({
          ...q,
          id: q.id || `rq-llm-${Date.now()}-${i}`,
          knowledgePointId: weak[i % weak.length]?.id || '',
          knowledgePointTitle: weak[i % weak.length]?.title || '',
          sourceWrongQuestionId: wrongQuestions[i]?.id,
          difficulty: i < 2 ? '中等' : '较难',
        }));
      }
    }
  } catch {
    console.warn('[智学闭环] LLM 强化题生成失败，使用 fallback');
  }

  // Fallback: 使用高质量模板生成
  return generateFallbackReinforcementQuestions(weak, wrongQuestions, result, variantSeed);
};
