import type {
  DiagnosisItem,
  Difficulty,
  ExamQuestionPattern,
  KnowledgePoint,
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

// ========== 题目生成：强制使用API，失败则报错 ==========
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

const normalizeQuestions = (input: unknown, knowledgePoints: KnowledgePoint[]): QuizQuestion[] => {
  const record = input as Record<string, unknown>;
  const list = Array.isArray(record?.questions) ? record.questions : [];

  return list
    .filter(isQuizQuestion)
    .map((item, index) => {
      const point = knowledgePoints[index % knowledgePoints.length];
      return {
        ...item,
        id: item.id || `q-${index + 1}`,
        knowledgePointId: item.knowledgePointId || point?.id || `kp-${index}`,
        sourceEvidence: item.sourceEvidence || point?.sourceEvidence || '',
        examPattern: item.examPattern || '基础概念题',
        scoringRubric: Array.isArray(item.scoringRubric) ? item.scoringRubric : [],
        solutionSteps: Array.isArray(item.solutionSteps) ? item.solutionSteps : [],
        commonMistake: item.commonMistake || '',
        optionExplanations: item.optionExplanations || {},
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

export const generateQuiz = async (
  knowledgePoints: KnowledgePoint[],
  materialText: string,
  settings?: QuizSettings
): Promise<QuizQuestion[]> => {
  if (knowledgePoints.length === 0) {
    throw new Error('没有可用的知识点，无法生成题目');
  }

  const prompt = buildQuizPrompt(materialText, knowledgePoints, settings);
  const llmResult = await callLLMJson(prompt.systemPrompt, prompt.userPrompt);

  if (!llmResult) {
    throw new Error('AI服务暂时不可用，请检查网络连接或稍后重试');
  }

  const questions = normalizeQuestions(llmResult, knowledgePoints);

  if (questions.length === 0) {
    throw new Error('未能生成有效的题目，请检查知识点内容或稍后重试');
  }

  // 应用难度设置
  const targetCount = settings?.questionCount ?? 10;
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

// ========== 强化题生成 ==========
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
  const pool =
    wrongQuestions.length > 0
      ? wrongQuestions
      : questions.filter((item) => weak.some((kp) => kp.id === item.knowledgePointId));

  const subjectType = weak[0]?.subjectType || '通用';
  const isMath = ['数学', '高等数学', '线性代数', '概率统计'].includes(subjectType);

  return weak.slice(0, 5).map((item, index) => {
    const variantIndex = index + (variantSeed % 7);
    const sourceQuestion = pool[variantIndex % Math.max(pool.length, 1)];

    const pattern =
      sourceQuestion?.examPattern ||
      item.examPatterns?.[variantIndex % Math.max(item.examPatterns.length, 1)] ||
      '变式迁移题';

    const formula = item.formulas?.[0] || '';

    // 根据学科类型生成不同的强化题
    let questionText: string;
    let answerText: string;
    let solutionSteps: string[];
    let scoringRubric: string[];

    if (isMath && formula) {
      // 数学类：生成公式应用题
      questionText = `已知相关条件，请运用"${item.title}"的公式${formula ? `(${formula})` : ''}求解，并写出完整步骤。`;
      answerText = `【解题步骤】1.识别考点"${item.title}"; 2.写出公式${formula}; 3.代入条件计算; 4.验证结果。【答案】根据具体条件计算得出。`;
      solutionSteps = [
        `识别本题考查"${item.title}"`,
        `写出公式：${formula || '相关公式'}`,
        '将题干条件代入并分步推导',
        '检查条件限制、符号或范围',
        '写出最终答案并验证',
      ];
      scoringRubric = [
        '准确识别考点',
        '正确写出公式',
        '代入计算正确',
        '步骤完整规范',
        '最终答案正确',
      ];
    } else {
      // 其他学科：生成概念应用题
      questionText = `围绕"${item.title}"完成一道变式训练题：先写考点依据，再说明判断方法，最后指出易错点。`;
      answerText = `【考点依据】${item.sourceEvidence || item.description}\n【判断方法】${item.keyMethods?.[0] || '结合材料关键词和语境进行分析'}\n【易错点】${item.commonMistakes?.[0] || '脱离材料依据，只写泛泛结论。'}`;
      solutionSteps = [
        `定位材料中的"${item.title}"`,
        '提取题干关键词或语境条件',
        '结合材料依据进行分析',
        '排除常见错误理解',
        '给出符合材料依据的结论',
      ];
      scoringRubric = [
        '准确定位考点',
        '引用材料依据',
        '分析方法正确',
        '结论规范完整',
      ];
    }

    return {
      id: `reinforce-${index + 1}`,
      knowledgePointTitle: item.title,
      examPattern: pattern,
      question: questionText,
      hint: `先定位考点，再写公式/规则${formula ? `：${formula}` : ''}；最后检查条件和易错项。`,
      answer: answerText,
      solutionSteps,
      scoringRubric,
      commonMistake:
        item.commonMistakes?.[0] ||
        (isMath ? '只求结果，不写步骤和依据。' : '脱离材料依据，只写泛泛结论。'),
      sourceQuestionId: sourceQuestion?.id,
      sourceEvidence: item.sourceEvidence,
      difficulty: index < 2 ? '中等' : '较难',
    };
  });
};
