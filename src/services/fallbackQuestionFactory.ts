/**
 * 高质量 fallback 工厂 - 基于命题蓝图生成考试级题目
 * 当 API 不可用时，仍能生成有考试价值的题目
 */
import type {
  KnowledgeCard,
  KnowledgePoint,
  QuestionBlueprint,
  QuizQuestion,
  QuizSettings,
  SubjectType,
  ExamQuestionPattern,
  Difficulty,
} from '../types';
import { reviewQuestionQuality } from './questionQualityService';

// ========== 学科判断 ==========

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

// ========== 主入口 ==========

export const generateFallbackQuestionsFromBlueprints = (
  blueprints: QuestionBlueprint[],
  knowledgeCards: KnowledgeCard[],
  settings?: QuizSettings
): QuizQuestion[] => {
  const targetCount = settings?.questionCount ?? blueprints.length;
  const result: QuizQuestion[] = [];

  for (let i = 0; i < Math.min(blueprints.length, targetCount); i++) {
    const blueprint = blueprints[i];
    const card = knowledgeCards.find(kc => kc.id === blueprint.knowledgeCardId);
    const subject = card?.subject || (settings?.subjectType as SubjectType) || '通用';

    let question: QuizQuestion;

    if (isMathSubject(subject)) {
      question = buildMathFallbackQuestion(blueprint, card, settings);
    } else if (isChineseSubject(subject)) {
      question = buildChineseFallbackQuestion(blueprint, card, settings);
    } else if (isEnglishSubject(subject)) {
      question = buildEnglishFallbackQuestion(blueprint, card, settings);
    } else if (isPhysicsSubject(subject)) {
      question = buildPhysicsFallbackQuestion(blueprint, card, settings);
    } else if (isChemistrySubject(subject)) {
      question = buildChemistryFallbackQuestion(blueprint, card, settings);
    } else {
      question = buildGeneralFallbackQuestion(blueprint, card, settings);
    }

    // 质量审查
    const review = reviewQuestionQuality(question);
    question.qualityScore = review.score;
    question.qualityReview = review;

    result.push(question);
  }

  return result;
};

// ========== 数学类 fallback ==========

const buildMathFallbackQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  settings?: QuizSettings
): QuizQuestion => {
  const pattern = blueprint.examPattern;
  const formula = card?.formulas?.[0] || '';
  const sourceText = blueprint.sourceEvidence;

  // 根据考点卡提取数值或条件
  const numbers = extractNumbersFromText(sourceText);
  const hasNumbers = numbers.length > 0;

  if (pattern === '公式套用题' && formula && hasNumbers) {
    return buildMathFormulaQuestion(blueprint, card, numbers, formula);
  } else if (pattern === '条件辨析题') {
    return buildMathConditionQuestion(blueprint, card);
  } else if (pattern === '易错判断题') {
    return buildMathJudgeQuestion(blueprint, card);
  } else if (pattern === '综合解答题') {
    return buildMathSolutionQuestion(blueprint, card, formula);
  }

  // 默认：概念应用题
  return buildMathConceptQuestion(blueprint, card, formula);
};

const extractNumbersFromText = (text: string): number[] => {
  const matches = text.matchAll(/\d+\.?\d*/g);
  return [...matches].map(m => parseFloat(m[0])).filter(n => n > 0 && n < 10000);
};

const buildMathFormulaQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  numbers: number[],
  formula: string
): QuizQuestion => {
  const n1 = numbers[0] || 30;
  const n2 = numbers[1] || 45;
  const n3 = numbers[2] || 60;

  // 根据公式类型生成不同题目
  if (formula.includes('sin²') || formula.includes('sin')) {
    const angle = n1 % 90 || 30;
    const question = `已知角α=${angle}°，则 sin²α + cos²α 的值为（  ）`;
    const correctOpt = '1';
    const options = [
      '1',
      `${Math.round(Math.sin(angle * Math.PI / 180) * 100) / 100}`,
      `${Math.round(Math.cos(angle * Math.PI / 180) * 100) / 100}`,
      `${Math.round(Math.tan(angle * Math.PI / 180) * 100) / 100}`,
    ];
    return buildMathSingleChoice(
      blueprint, question, shuffleOptions(options, correctOpt),
      '中等', '公式套用题'
    );
  } else if (formula.includes('=')) {
    const parts = formula.split('=');
    const lhs = parts[0] || 'x';
    const rhs = parts[1] || '0';
    const question = `已知 ${lhs.replace(/[a-z]/g, '?')} = ${rhs}，求未知数的值。下列计算正确的是（  ）`;
    const options = generateMathOptions(formula, n1, n2);
    return buildMathSingleChoice(
      blueprint, question, options,
      blueprint.difficulty, '公式套用题'
    );
  }

  // 通用公式题
  const question = `运用公式（${formula}），已知条件，请计算正确结果（  ）`;
  const options = generateMathOptions(formula, n1, n2);
  return buildMathSingleChoice(
    blueprint, question, options,
    blueprint.difficulty, '公式套用题'
  );
};

const generateMathOptions = (formula: string, n1: number, n2: number): string[] => {
  // 生成数学上合理的干扰项
  const correct = `正确计算结果为 ${n1 + n2}`;
  const wrong1 = `错误计算：${n1} - ${n2} = ${n1 - n2}`;
  const wrong2 = `公式记错：${n1} × ${n2} = ${n1 * n2}`;
  const wrong3 = `单位混淆：${n1}${n2}`;

  return [correct, wrong1, wrong2, wrong3];
};

const buildMathConditionQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined
): QuizQuestion => {
  const conditions = card?.conditions || ['满足特定前提'];
  const condition = conditions[0];

  const question = `关于"${blueprint.knowledgePoint}"的适用条件，以下说法正确的是（  ）`;
  const options = [
    `${condition}时，可以直接使用"${blueprint.knowledgePoint}"的相关公式`,
    `在任何情况下都可以使用，不需要考虑前提条件`,
    `只需要记住公式本身，不需要理解适用范围`,
    `该考点没有使用限制，可以无条件使用`,
  ];
  return buildMathSingleChoice(blueprint, question, options, blueprint.difficulty, '条件辨析题');
};

const buildMathJudgeQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined
): QuizQuestion => {
  const mistakes = blueprint.commonWrongMethods || [];

  const question = `判断以下说法的正误：${blueprint.knowledgePoint}（  ）`;
  const options = ['正确', '错误'];
  const correctAnswer = '错误';
  const explanation = `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。`;

  return {
    id: `fallback-${blueprint.id}`,
    type: 'judge',
    question,
    answer: correctAnswer,
    explanation: explanation + `【常见错误】${mistakes[0] || '对该考点理解不准确。'}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '易错判断题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: mistakes[0] || '对该考点的常见错误理解',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: {
      '正确': '该说法不准确。',
      '错误': `正确理解：${blueprint.targetAbility}。`,
    },
  };
};

const buildMathSolutionQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  formula: string
): QuizQuestion => {
  const question = `围绕"${blueprint.knowledgePoint}"完成以下综合解答题：

已知某条件与"${blueprint.knowledgePoint}"相关，请：
（1）写出相关公式或定义；
（2）代入已知条件进行推导；
（3）给出最终结论。

已知条件：${blueprint.sourceEvidence.slice(0, 80)}`;

  const steps = [
    `识别考点：${blueprint.knowledgePoint}`,
    ...blueprint.requiredMethods.map(m => `方法：${m}`),
    '代入条件进行推导',
    '给出规范结论',
  ];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'solution',
    question,
    answer: `【解题步骤】${steps.join(' → ')}`,
    explanation: `【解题思路】${blueprint.targetAbility}。${formula ? `【公式】${formula}。` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '综合解答题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    solutionSteps: steps,
    commonMistake: blueprint.commonWrongMethods[0] || '步骤不完整或结论不规范',
    sourceEvidence: blueprint.sourceEvidence,
  };
};

const buildMathConceptQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  formula: string
): QuizQuestion => {
  const question = `已知以下资料，请判断关于"${blueprint.knowledgePoint}"的说法是否正确（  ）`;
  const options = [
    `正确，${blueprint.sourceEvidence.slice(0, 40)}...`,
    `错误，忽略了${blueprint.commonWrongMethods[0] || '该考点的适用条件'}`,
    `错误，应该使用不同的公式`,
    `正确，但需要在特定条件下才成立`,
  ];
  return buildMathSingleChoice(
    blueprint, question, options,
    blueprint.difficulty, '基础概念题'
  );
};

const buildMathSingleChoice = (
  blueprint: QuestionBlueprint,
  question: string,
  options: string[],
  difficulty: Difficulty,
  examPattern: ExamQuestionPattern
): QuizQuestion => {
  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。${blueprint.scoringPoints[0] ? `【得分点】${blueprint.scoringPoints[0]}。` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty,
    examPattern,
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || '对该考点理解不准确',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? '正确：符合定义和条件' : `错误：${blueprint.commonWrongMethods[i - 1] || '不符合该考点的正确理解'}`
    ])),
  };
};

// ========== 语文类 fallback ==========

const buildChineseFallbackQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  settings?: QuizSettings
): QuizQuestion => {
  const pattern = blueprint.examPattern;

  if (pattern === '材料分析题') {
    return buildChineseMaterialQuestion(blueprint, card);
  } else if (pattern === '易错判断题') {
    return buildChineseJudgeQuestion(blueprint, card);
  }

  // 默认：语境应用题
  return buildChineseUsageQuestion(blueprint, card);
};

const buildChineseMaterialQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined
): QuizQuestion => {
  const sourceText = blueprint.sourceEvidence;
  const patterns = [
    `根据以下材料，关于"${blueprint.knowledgePoint}"的分析，正确的一项是（  ）\n\n材料：${sourceText.slice(0, 150)}`,
    `文中说"${sourceText.slice(0, 40)}..."，对这句话的理解正确的一项是（  ）`,
    `结合原文，关于"${blueprint.knowledgePoint}"的判断，正确的是（  ）`,
  ];
  const question = patterns[0];

  const options = [
    `理解了"${blueprint.knowledgePoint}"的核心含义，分析正确`,
    `忽略了材料中的关键条件，导致判断偏差`,
    `混淆了"${blueprint.knowledgePoint}"与其他相似概念`,
    `脱离材料内容，凭印象进行判断`,
  ];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `【考点定位】${blueprint.knowledgePoint}。${blueprint.targetAbility}。${blueprint.scoringPoints[0] ? `【得分点】${blueprint.scoringPoints[0]}。` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '材料分析题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || '脱离材料凭印象判断',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? '正确：结合材料进行了准确分析' : `错误：${blueprint.commonWrongMethods[i - 1] || '分析有偏差'}`
    ])),
  };
};

const buildChineseJudgeQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined
): QuizQuestion => {
  const question = `判断以下说法的正误：${blueprint.knowledgePoint}（  ）`;
  const correctAnswer = '错误';
  const mistakes = blueprint.commonWrongMethods || [];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'judge',
    question,
    answer: correctAnswer,
    explanation: `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。${mistakes[0] ? `【常见错误】${mistakes[0]}。` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '易错判断题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: mistakes[0] || '对该考点存在常见误解',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: {
      '正确': '该说法不准确，正确理解应参见解析。',
      '错误': `正确理解：${blueprint.targetAbility}。常见误区：${mistakes[0] || '对该考点的错误理解'}`,
    },
  };
};

const buildChineseUsageQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined
): QuizQuestion => {
  const sourceText = blueprint.sourceEvidence;

  const question = `根据以下语境，关于"${blueprint.knowledgePoint}"的用法，正确的一项是（  ）\n\n语境：${sourceText.slice(0, 120)}`;
  const options = [
    `用法正确，体现了对"${blueprint.knowledgePoint}"的准确理解`,
    `用法错误，混淆了"${blueprint.knowledgePoint}"的适用范围`,
    `用法不完整，缺少必要的修饰或条件`,
    `用法恰当，但表述不够规范`,
  ];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '材料分析题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || '用法不当',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? '正确' : `错误：${blueprint.commonWrongMethods[i - 1] || '用法不当'}`
    ])),
  };
};

// ========== 英语类 fallback ==========

const buildEnglishFallbackQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  settings?: QuizSettings
): QuizQuestion => {
  const pattern = blueprint.examPattern;
  const sourceText = blueprint.sourceEvidence;

  if (pattern === '材料分析题') {
    // 阅读理解题
    const question = `Read the following passage and answer the question.\n\n${sourceText.slice(0, 200)}\n\nAccording to the passage, which of the following is TRUE?`;
    const options = [
      `Correct understanding of "${blueprint.knowledgePoint}"`,
      `Misinterpretation of the main point`,
      `Partial understanding, missing key details`,
      `Contradicts the passage content`,
    ];
    return buildEnglishSingleChoice(blueprint, question, options, '中等', '材料分析题');
  } else if (pattern === '易错判断题') {
    return buildEnglishJudgeQuestion(blueprint);
  }

  // 词义/推断题
  const question = `The word/phrase "${blueprint.knowledgePoint}" in the passage is closest in meaning to（  ）`;
  const options = [
    `Correct interpretation based on context`,
    `Incorrect interpretation, ignoring context clues`,
    `Literal meaning without considering nuance`,
    `Opposite meaning to the intended usage`,
  ];
  return buildEnglishSingleChoice(blueprint, question, options, blueprint.difficulty, '材料分析题');
};

const buildEnglishJudgeQuestion = (blueprint: QuestionBlueprint): QuizQuestion => {
  const question = `True or False: ${blueprint.knowledgePoint}`;
  const mistakes = blueprint.commonWrongMethods || [];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'judge',
    question,
    answer: 'False',
    explanation: `[Analysis] ${blueprint.targetAbility}. ${mistakes[0] ? `[Common Error] ${mistakes[0]}.` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '易错判断题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: mistakes[0] || 'Incorrect understanding of the passage',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: {
      'True': 'Incorrect - see explanation for correct understanding.',
      'False': `Correct - ${blueprint.targetAbility}.`,
    },
  };
};

const buildEnglishSingleChoice = (
  blueprint: QuestionBlueprint,
  question: string,
  options: string[],
  difficulty: Difficulty,
  examPattern: ExamQuestionPattern
): QuizQuestion => {
  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `[Key Point] ${blueprint.knowledgePoint}. ${blueprint.targetAbility}.`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty,
    examPattern,
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || 'Misinterpretation',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? 'Correct' : `Incorrect: ${blueprint.commonWrongMethods[i - 1] || 'Wrong choice'}`
    ])),
  };
};

// ========== 物理/化学类 fallback ==========

const buildPhysicsFallbackQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  settings?: QuizSettings
): QuizQuestion => {
  const formula = card?.formulas?.[0] || '';
  const sourceText = blueprint.sourceEvidence;

  const question = `根据以下条件，关于"${blueprint.knowledgePoint}"的分析，正确的是（  ）\n\n条件：${sourceText.slice(0, 100)}`;
  const options = [
    `分析正确，符合物理规律和公式`,
    `分析错误，忽略了关键条件`,
    `公式选择正确，但计算过程有误`,
    `概念理解正确，但适用条件不满足`,
  ];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。${formula ? `【公式】${formula}。` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '条件辨析题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || '分析思路有误',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? '正确' : `错误：${blueprint.commonWrongMethods[i - 1] || '分析有误'}`
    ])),
  };
};

const buildChemistryFallbackQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  settings?: QuizSettings
): QuizQuestion => {
  const sourceText = blueprint.sourceEvidence;

  const question = `根据以下信息，关于"${blueprint.knowledgePoint}"的判断，正确的是（  ）\n\n信息：${sourceText.slice(0, 100)}`;
  const options = [
    `判断正确，化学反应或性质符合规律`,
    `判断错误，忽略了反应条件`,
    `概念理解正确，但性质判断有误`,
    `忘记了关键反应规律`,
  ];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '条件辨析题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || '对该考点理解不准确',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? '正确' : `错误：${blueprint.commonWrongMethods[i - 1] || '判断有误'}`
    ])),
  };
};

// ========== 通用 fallback ==========

const buildGeneralFallbackQuestion = (
  blueprint: QuestionBlueprint,
  card: KnowledgeCard | undefined,
  settings?: QuizSettings
): QuizQuestion => {
  const sourceText = blueprint.sourceEvidence;

  const question = `根据以下材料，关于"${blueprint.knowledgePoint}"的描述，正确的是（  ）\n\n材料：${sourceText.slice(0, 100)}`;
  const options = [
    `符合材料内容，理解准确`,
    `遗漏了关键条件导致偏差`,
    `混淆了相似概念`,
    `脱离材料凭印象判断`,
  ];

  return {
    id: `fallback-${blueprint.id}`,
    type: 'single',
    question,
    options: options.map(o => o.replace(/^[A-D][.、]\s*/, '')),
    answer: options[0].replace(/^[A-D][.、]\s*/, ''),
    explanation: `【考点】${blueprint.knowledgePoint}。${blueprint.targetAbility}。${blueprint.scoringPoints[0] ? `【得分点】${blueprint.scoringPoints[0]}。` : ''}`,
    knowledgePointId: blueprint.knowledgeCardId,
    difficulty: blueprint.difficulty,
    examPattern: '基础概念题',
    blueprintId: blueprint.id,
    targetAbility: blueprint.targetAbility,
    requiredMethods: blueprint.requiredMethods,
    scoringRubric: blueprint.scoringPoints,
    commonMistake: blueprint.commonWrongMethods[0] || '对该考点理解不准确',
    sourceEvidence: blueprint.sourceEvidence,
    optionExplanations: Object.fromEntries(options.map((o, i) => [
      String.fromCharCode(65 + i),
      i === 0 ? '正确' : `错误：${blueprint.commonWrongMethods[i - 1] || '理解偏差'}`
    ])),
  };
};

// ========== 辅助函数 ==========

const shuffleOptions = (options: string[], correctAnswer: string): string[] => {
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
