/**
 * 强化训练题工厂 - 生成同类变式题
 * 当 API 不可用时，生成有价值的强化训练题
 */
import type {
  KnowledgePoint,
  QuizQuestion,
  QuizResult,
  ReinforcementQuestion,
  SubjectType,
  ExamQuestionPattern,
} from '../types';

const VALID_PATTERNS: ExamQuestionPattern[] = [
  '基础概念题', '公式套用题', '条件辨析题',
  '易错判断题', '材料分析题', '变式迁移题', '综合解答题',
];

const isMathSubject = (subject: SubjectType): boolean =>
  ['数学', '高等数学', '线性代数', '概率统计'].includes(subject);

const isChineseSubject = (subject: SubjectType): boolean =>
  ['语文', '哲学', '文学', '历史学', '艺术学'].includes(subject);

const isEnglishSubject = (subject: SubjectType): boolean =>
  subject === '英语';

const isPhysicsSubject = (subject: SubjectType): boolean =>
  ['物理', '大学物理', '电路'].includes(subject);

const isChemistrySubject = (subject: SubjectType): boolean =>
  subject === '化学';

const ensureString = (val: string | undefined, fallback: string): string =>
  val || fallback;

const ensurePattern = (pattern: string | undefined): ExamQuestionPattern => {
  if (pattern && VALID_PATTERNS.includes(pattern as ExamQuestionPattern)) {
    return pattern as ExamQuestionPattern;
  }
  return '基础概念题';
};

export const generateFallbackReinforcementQuestions = (
  weakKnowledgePoints: KnowledgePoint[],
  wrongQuestions: QuizQuestion[],
  result: QuizResult | undefined,
  seed?: number
): ReinforcementQuestion[] => {
  const random = createSeededRandom(seed || Date.now());
  const subject = inferSubjectFromWrongQuestions(wrongQuestions);

  return weakKnowledgePoints.slice(0, 5).map((wp, i) => {
    const relatedWrong = wrongQuestions.find(q =>
      q.knowledgePointId === wp.id || q.knowledgePointId.includes(wp.id)
    );

    if (isMathSubject(subject)) {
      return buildMathReinforcement(wp, relatedWrong, i, random);
    } else if (isChineseSubject(subject)) {
      return buildChineseReinforcement(wp, relatedWrong, i, random);
    } else if (isEnglishSubject(subject)) {
      return buildEnglishReinforcement(wp, relatedWrong, i, random);
    } else if (isPhysicsSubject(subject)) {
      return buildPhysicsReinforcement(wp, relatedWrong, i, random);
    } else if (isChemistrySubject(subject)) {
      return buildChemistryReinforcement(wp, relatedWrong, i, random);
    }

    return buildGeneralReinforcement(wp, relatedWrong, i, random);
  });
};

// ========== 数学强化题 ==========

const buildMathReinforcement = (
  wp: KnowledgePoint,
  relatedWrong: QuizQuestion | undefined,
  index: number,
  random: () => number
): ReinforcementQuestion => {
  const seed = random();
  const baseValue = 15 + Math.floor(seed * 50);

  const variants = [
    `已知 x = ${baseValue}，求 ${wp.title} 的值`,
    `已知 y = ${baseValue + 10}，求 ${wp.title} 相关表达式的值`,
    `设 z = ${baseValue - 5}，求 ${wp.title} 的结果`,
    `若 a = ${baseValue * 2}，b = ${baseValue}，求 ${wp.title}`,
    `给定参数为 ${baseValue}，计算 ${wp.title}`,
  ];

  const variant = variants[index % variants.length];

  return {
    id: `rq-fallback-${Date.now()}-${index}`,
    knowledgePointTitle: wp.title,
    examPattern: ensurePattern(wp.examPatterns?.[0]),
    question: `[变式训练 ${index + 1}] ${variant}，下列计算正确的是（  ）`,
    answer: 'A',
    explanation: `【解题思路】${wp.description?.slice(0, 100) || wp.title}。${wp.formulas?.[0] ? `【公式】${wp.formulas[0]}。` : ''}【关键步骤】${ensureString(wp.keyMethods?.[0], '按公式代入计算')}`,
    hint: `提示：注意${ensureString(wp.keyMethods?.[0], '公式的适用条件')}，先判断再计算。`,
    solutionSteps: ['识别考点', '列出公式', '代入计算', '检验结果'],
    scoringRubric: [
      '正确识别考点：2分',
      '选择正确方法：3分',
      '计算正确：3分',
      '规范书写：2分',
    ],
    commonMistake: ensureString(wp.commonMistakes?.[0], `易混淆：${wp.title}与相近概念`),
    difficulty: '中等',
    sourceQuestionId: relatedWrong?.id,
    sourceEvidence: wp.sourceEvidence || wp.description,
  };
};

// ========== 语文强化题 ==========

const buildChineseReinforcement = (
  wp: KnowledgePoint,
  relatedWrong: QuizQuestion | undefined,
  index: number,
  random: () => number
): ReinforcementQuestion => {
  const materials = [
    `在"${(wp.description || wp.title).slice(0, 30)}"的语境中`,
    `结合以下文段："${(wp.sourceEvidence || wp.title).slice(0, 50)}"`,
    `在具体的语言运用场景中，关于"${wp.title}"`,
    `阅读下面的语段，分析其中"${wp.title}"的用法`,
  ];

  const question = `[变式训练 ${index + 1}] ${materials[index % materials.length]}，以下判断正确的是（  ）`;

  return {
    id: `rq-fallback-${Date.now()}-${index}`,
    knowledgePointTitle: wp.title,
    examPattern: ensurePattern(wp.examPatterns?.[0]),
    question,
    answer: 'A',
    explanation: `【解析】${wp.description || wp.title}。${wp.keyMethods?.[0] ? `【方法】${wp.keyMethods[0]}。` : ''}${wp.commonMistakes?.[0] ? `【常见错误】${wp.commonMistakes[0]}。` : ''}`,
    hint: `提示：注意区分"${wp.title}"与相关概念的细微差别。`,
    solutionSteps: ['理解题意', '定位关键词', '分析语境', '规范作答'],
    scoringRubric: [
      '准确理解题意：2分',
      '正确辨析概念：3分',
      '结合语境分析：3分',
      '表述规范完整：2分',
    ],
    commonMistake: ensureString(wp.commonMistakes?.[0], `混淆了"${wp.title}"与相近表达`),
    difficulty: '中等',
    sourceQuestionId: relatedWrong?.id,
    sourceEvidence: wp.sourceEvidence || wp.description,
  };
};

// ========== 英语强化题 ==========

const buildEnglishReinforcement = (
  wp: KnowledgePoint,
  relatedWrong: QuizQuestion | undefined,
  index: number,
  random: () => number
): ReinforcementQuestion => {
  const question = `[Variation ${index + 1}] Based on the following context, which option best describes "${wp.title}"?`;
  const material = (wp.sourceEvidence || wp.description || wp.title).slice(0, 150);

  return {
    id: `rq-fallback-${Date.now()}-${index}`,
    knowledgePointTitle: wp.title,
    examPattern: '材料分析题' as ExamQuestionPattern,
    question: `${question}\n\nContext: ${material}`,
    answer: 'A',
    explanation: `[Analysis] ${wp.description || wp.title}. ${wp.keyMethods?.[0] ? `[Method] ${wp.keyMethods[0]}.` : ''}`,
    hint: 'Hint: Consider both the literal meaning and the contextual implication.',
    solutionSteps: ['Read the context', 'Identify key points', 'Compare options', 'Select the best answer'],
    scoringRubric: [
      'Accurate comprehension: 3pts',
      'Correct inference: 3pts',
      'Grammatical awareness: 2pts',
      'Vocabulary accuracy: 2pts',
    ],
    commonMistake: ensureString(wp.commonMistakes?.[0], 'Misinterpretation of the passage'),
    difficulty: '中等',
    sourceQuestionId: relatedWrong?.id,
    sourceEvidence: wp.sourceEvidence || wp.description,
  };
};

// ========== 物理强化题 ==========

const buildPhysicsReinforcement = (
  wp: KnowledgePoint,
  relatedWrong: QuizQuestion | undefined,
  index: number,
  random: () => number
): ReinforcementQuestion => {
  const seed = random();
  const baseValue = 10 + Math.floor(seed * 50);
  const units = ['m/s', 'N', 'J', 'W', 'Pa'];

  const question = `[变式训练 ${index + 1}] 已知某物体${baseValue}，关于"${wp.title}"的分析，正确的是（  ）`;
  const unit = units[index % units.length];

  return {
    id: `rq-fallback-${Date.now()}-${index}`,
    knowledgePointTitle: wp.title,
    examPattern: '条件辨析题' as ExamQuestionPattern,
    question,
    answer: 'A',
    explanation: `【解析】${wp.description || wp.title}。${wp.formulas?.[0] ? `【公式】${wp.formulas[0]}。` : ''}${wp.keyMethods?.[0] ? `【方法】${wp.keyMethods[0]}。` : ''}`,
    hint: `提示：注意${ensureString(wp.keyMethods?.[0], '物理条件')}，不要忽略单位。`,
    solutionSteps: ['分析受力', '选择公式', '代入计算', '检验单位'],
    scoringRubric: [
      '正确识别物理量：2分',
      '选择正确公式：3分',
      '单位换算正确：2分',
      '计算结果正确：3分',
    ],
    commonMistake: ensureString(wp.commonMistakes?.[0], `对"${wp.title}"的物理条件理解有误`),
    difficulty: '中等',
    sourceQuestionId: relatedWrong?.id,
    sourceEvidence: wp.sourceEvidence || wp.description,
  };
};

// ========== 化学强化题 ==========

const buildChemistryReinforcement = (
  wp: KnowledgePoint,
  relatedWrong: QuizQuestion | undefined,
  index: number,
  random: () => number
): ReinforcementQuestion => {
  const substances = ['A物质', 'B化合物', 'C溶液', 'D混合物'];
  const substance = substances[index % substances.length];

  const question = `[变式训练 ${index + 1}] ${substance}中关于"${wp.title}"的判断，正确的是（  ）`;

  return {
    id: `rq-fallback-${Date.now()}-${index}`,
    knowledgePointTitle: wp.title,
    examPattern: '条件辨析题' as ExamQuestionPattern,
    question,
    answer: 'A',
    explanation: `【解析】${wp.description || wp.title}。${wp.formulas?.[0] ? `【方程式/公式】${wp.formulas[0]}。` : ''}${wp.keyMethods?.[0] ? `【方法】${wp.keyMethods[0]}。` : ''}`,
    hint: `提示：注意${ensureString(wp.keyMethods?.[0], '反应条件和物质性质')}，不要死记硬背。`,
    solutionSteps: ['识别物质', '判断反应类型', '考虑条件', '得出结论'],
    scoringRubric: [
      '正确识别物质：2分',
      '判断反应类型：3分',
      '考虑反应条件：3分',
      '书写规范完整：2分',
    ],
    commonMistake: ensureString(wp.commonMistakes?.[0], `对"${wp.title}"的化学性质理解有误`),
    difficulty: '中等',
    sourceQuestionId: relatedWrong?.id,
    sourceEvidence: wp.sourceEvidence || wp.description,
  };
};

// ========== 通用强化题 ==========

const buildGeneralReinforcement = (
  wp: KnowledgePoint,
  relatedWrong: QuizQuestion | undefined,
  index: number,
  random: () => number
): ReinforcementQuestion => {
  const question = `[变式训练 ${index + 1}] 关于"${wp.title}"，以下分析正确的是（  ）`;

  return {
    id: `rq-fallback-${Date.now()}-${index}`,
    knowledgePointTitle: wp.title,
    examPattern: ensurePattern(wp.examPatterns?.[0]),
    question,
    answer: 'A',
    explanation: `【解析】${wp.description || wp.title}。${wp.keyMethods?.[0] ? `【方法】${wp.keyMethods[0]}。` : ''}${wp.commonMistakes?.[0] ? `【常见错误】${wp.commonMistakes[0]}。` : ''}`,
    hint: `提示：回到"${wp.title}"的核心定义，结合具体案例分析。`,
    solutionSteps: ['识别考点', '分析条件', '逻辑推理', '得出结论'],
    scoringRubric: [
      '准确识别考点：3分',
      '正确运用方法：4分',
      '逻辑清晰完整：3分',
    ],
    commonMistake: ensureString(wp.commonMistakes?.[0], `对"${wp.title}"的核心要义理解不准确`),
    difficulty: '中等',
    sourceQuestionId: relatedWrong?.id,
    sourceEvidence: wp.sourceEvidence || wp.description,
  };
};

// ========== 辅助函数 ==========

const inferSubjectFromWrongQuestions = (wrongQuestions: QuizQuestion[]): SubjectType => {
  if (wrongQuestions.length === 0) return '通用';

  const patterns: string[] = wrongQuestions
    .map(q => q.examPattern)
    .filter(Boolean) as string[];

  const matchAny = (arr: string[], targets: string[]) => targets.some(t => arr.includes(t));

  if (matchAny(patterns, ['公式套用题', '条件辨析题', '综合解答题'])) {
    return '数学';
  }
  if (matchAny(patterns, ['材料分析题'])) {
    const hasEnglish = wrongQuestions.some(q =>
      (q.explanation || '').includes('passage') || (q.question || '').includes('Read the')
    );
    return hasEnglish ? '英语' : '语文';
  }
  if (matchAny(patterns, ['受力分析题', '电路分析题'])) {
    return '物理';
  }
  if (matchAny(patterns, ['反应方程式', '物质推断题'])) {
    return '化学';
  }

  return '通用';
};

const createSeededRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};
