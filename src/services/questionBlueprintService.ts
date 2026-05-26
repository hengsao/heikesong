import type { KnowledgePoint, KnowledgeCard, QuestionBlueprint, QuizSettings, SubjectType, Difficulty, ExamQuestionPattern } from '../types';
import { inferSubjectType, getExamPatternsBySubject, getCommonMistakesBySubject, getMethodsBySubject, getDefaultDifficultyRatio } from './examStrategy';

// 从知识点生成考点卡
export const generateKnowledgeCards = (
  materialText: string,
  knowledgePoints: KnowledgePoint[],
  subjectType?: SubjectType
): KnowledgeCard[] => {
  const subject = subjectType || inferSubjectType(materialText);

  // 把每个 KnowledgePoint 转换成 KnowledgeCard
  return knowledgePoints.map((kp, index) => ({
    id: `kc-${index + 1}`,
    title: kp.title,
    subject,
    coreMeaning: extractCoreMeaning(kp),
    formulas: extractFormulas(kp.sourceEvidence || kp.description),
    rules: extractRules(kp.sourceEvidence || kp.description),
    conditions: extractConditions(kp.sourceEvidence || kp.description),
    examMethods: kp.examPatterns || getExamPatternsBySubject(subject),
    commonMistakes: kp.commonMistakes || getCommonMistakesBySubject(subject),
    sourceEvidence: kp.sourceEvidence || kp.description,
  }));
};

// 从考点卡生成命题蓝图
export const generateQuestionBlueprints = (
  knowledgeCards: KnowledgeCard[],
  settings?: QuizSettings
): QuestionBlueprint[] => {
  const count = settings?.questionCount || 10;
  const blueprints: QuestionBlueprint[] = [];

  // 为每个考点卡生成1-2个蓝图
  for (let i = 0; i < count; i++) {
    const card = knowledgeCards[i % knowledgeCards.length];
    const pattern = card.examMethods[i % card.examMethods.length];
    const difficulty = calculateDifficulty(i, count, settings);

    blueprints.push({
      id: `bp-${i + 1}`,
      knowledgeCardId: card.id,
      knowledgePoint: card.title,
      examPattern: pattern,
      difficulty,
      targetAbility: generateTargetAbility(card, pattern),
      requiredMethods: generateRequiredMethods(card, pattern),
      commonWrongMethods: generateCommonWrongMethods(card),
      scoringPoints: generateScoringPoints(card, pattern),
      sourceEvidence: card.sourceEvidence,
    });
  }

  return blueprints;
};

// 验证蓝图是否合格
export const validateBlueprint = (blueprint: QuestionBlueprint): boolean => {
  // 检查：
  // - targetAbility 是否具体
  // - scoringPoints 是否有具体内容
  // - 不是空泛标题
  if (!blueprint.targetAbility || blueprint.targetAbility.length < 10) return false;
  if (!blueprint.scoringPoints || blueprint.scoringPoints.length === 0) return false;
  if (blueprint.scoringPoints.every(p => p.length < 5)) return false;
  return true;
};

// 辅助函数：从 description 或 sourceEvidence 提取核心含义
const extractCoreMeaning = (kp: KnowledgePoint): string => {
  const text = kp.sourceEvidence || kp.description || '';

  // 尝试提取"是..."的定义
  const definitionMatch = text.match(/([^，。]+)(?:是|指|指的是)([^，。]+)/);
  if (definitionMatch) {
    return `${definitionMatch[1].trim()}指的是${definitionMatch[2].trim()}`;
  }

  // 尝试提取"用于..."的用途
  const usageMatch = text.match(/(?:用于|用来|可以)([^，。]+)/);
  if (usageMatch) {
    return `用于${usageMatch[1].trim()}`;
  }

  // 避免"主要作用""考查重点"这种空泛描述
  const cleaned = text
    .replace(/主要作用|考查重点|重要意义|核心内容/g, '')
    .replace(/^(是|指|表示)/, '')
    .trim();

  return cleaned.length > 10 ? cleaned.slice(0, 80) : text.slice(0, 80);
};

// 辅助函数：用正则提取公式
const extractFormulas = (text: string): string[] => {
  const formulas: string[] = [];

  // 匹配数学公式模式
  const formulaPatterns = [
    // sin²α + cos²α = 1 类型
    /[A-Za-zαβθ0-9²^+\-*/=()（）√]+(?:sin|cos|tan|=)[A-Za-zαβθ0-9²^+\-*/=()（）√\s]*/gi,
    // 三角函数公式
    /(?:sin|cos|tan)[²^]?[αβθ]?\s*[+\-*/=]\s*[A-Za-z0-9αβθ²^+\-*/=()（）√\s]+/gi,
    // 一般等式
    /[A-Za-z0-9]+\s*=\s*[A-Za-z0-9+\-*/()\s]+/g,
  ];

  for (const pattern of formulaPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const formula = match[0].trim();
      if (formula.length >= 5 && formula.includes('=')) {
        formulas.push(formula);
      }
    }
  }

  // 特定公式补充
  if (/三角函数|sin|cos|tan/.test(text)) {
    if (!formulas.some(f => f.includes('sin²') && f.includes('cos²'))) {
      formulas.push('sin²α + cos²α = 1');
    }
    if (!formulas.some(f => f.includes('tanα') && f.includes('sinα'))) {
      formulas.push('tanα = sinα / cosα');
    }
  }

  return [...new Set(formulas)].slice(0, 4);
};

// 辅助函数：提取规则条款
const extractRules = (text: string): string[] => {
  const rules: string[] = [];

  // 匹配"规则""定律""定理"等
  const rulePatterns = [
    /(?:规则|定律|定理|原则|定则)[：:]\s*([^。；]+)/g,
    /(?:满足|符合|遵循|遵守)([^。；]{5,50})/g,
  ];

  for (const pattern of rulePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const rule = match[1]?.trim() || match[0]?.trim();
      if (rule && rule.length >= 5) {
        rules.push(rule);
      }
    }
  }

  return rules.slice(0, 3);
};

// 辅助函数：提取适用条件
const extractConditions = (text: string): string[] => {
  const conditions: string[] = [];

  // 匹配条件描述
  const conditionPatterns = [
    /(?:当|在)([^时]+)(?:时|情况下)/g,
    /(?:前提是|条件是|只有)([^，。]+)/g,
    /(?:适用于|针对)([^，。]+)/g,
  ];

  for (const pattern of conditionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const condition = match[1]?.trim();
      if (condition && condition.length >= 3) {
        conditions.push(condition);
      }
    }
  }

  return conditions.slice(0, 3);
};

// 辅助函数：根据比例分配难度
const calculateDifficulty = (index: number, total: number, settings?: QuizSettings): Difficulty => {
  const ratio = settings?.difficultyRatio || getDefaultDifficultyRatio();
  const easyCount = Math.max(1, Math.round(total * ratio.easy / 100));
  const mediumCount = Math.max(1, Math.round(total * ratio.medium / 100));

  if (index < easyCount) return '简单';
  if (index < easyCount + mediumCount) return '中等';
  return '较难';
};

// 辅助函数：生成具体的考查能力描述
const generateTargetAbility = (card: KnowledgeCard, pattern: ExamQuestionPattern): string => {
  const abilityMap: Record<ExamQuestionPattern, string> = {
    基础概念题: `能准确复述"${card.title}"的核心定义和关键特征`,
    公式套用题: `能正确运用"${card.title}"相关公式进行计算和推导`,
    条件辨析题: `能识别"${card.title}"的适用条件和限制范围`,
    易错判断题: `能辨析"${card.title}"的常见误区和错误理解`,
    材料分析题: `能结合材料分析"${card.title}"的具体应用`,
    变式迁移题: `能将"${card.title}"的知识迁移到新情境中`,
    综合解答题: `能综合运用"${card.title}"的知识解决复杂问题`,
  };

  // 根据考点卡内容定制
  if (card.formulas && card.formulas.length > 0 && pattern === '公式套用题') {
    return `能根据已知条件，运用${card.formulas[0]}求解相关问题`;
  }

  if (card.conditions && card.conditions.length > 0 && pattern === '条件辨析题') {
    return `能在${card.conditions[0]}的情况下正确应用"${card.title}"`;
  }

  return abilityMap[pattern] || `能理解并应用"${card.title}"的相关知识`;
};

// 辅助函数：生成所需方法
const generateRequiredMethods = (card: KnowledgeCard, pattern: ExamQuestionPattern): string[] => {
  const baseMethods = getMethodsBySubject(card.subject);
  const methods: string[] = [];

  // 根据题型添加特定方法
  switch (pattern) {
    case '公式套用题':
      methods.push('公式识别');
      if (card.formulas && card.formulas.length > 0) {
        methods.push('条件代入');
      }
      methods.push('计算求解');
      break;
    case '条件辨析题':
      methods.push('条件识别');
      methods.push('范围判断');
      break;
    case '易错判断题':
      methods.push('误区识别');
      methods.push('正误辨析');
      break;
    case '材料分析题':
      methods.push('材料定位');
      methods.push('信息提取');
      break;
    case '变式迁移题':
      methods.push('模式识别');
      methods.push('知识迁移');
      break;
    case '综合解答题':
      methods.push('问题分解');
      methods.push('综合分析');
      break;
    default:
      methods.push('概念理解');
  }

  // 添加学科通用方法
  return [...methods, ...baseMethods.slice(0, 2)].slice(0, 4);
};

// 辅助函数：生成常见错误方法
const generateCommonWrongMethods = (card: KnowledgeCard): string[] => {
  const commonMistakes = card.commonMistakes || getCommonMistakesBySubject(card.subject);

  // 将常见错误转换为"错误方法"
  return commonMistakes.slice(0, 3).map(mistake => {
    if (mistake.includes('忽略') || mistake.includes('忘记')) {
      return mistake.replace(/忽略|忘记/, '不关注');
    }
    if (mistake.includes('错误')) {
      return mistake.replace('错误', '错误地');
    }
    return `错误地认为${mistake}`;
  });
};

// 辅助函数：生成分数点
const generateScoringPoints = (card: KnowledgeCard, pattern: ExamQuestionPattern): string[] => {
  const points: string[] = [];

  // 基础得分点
  points.push(`准确定位考点：${card.title}`);

  // 根据题型添加特定得分点
  switch (pattern) {
    case '公式套用题':
      if (card.formulas && card.formulas.length > 0) {
        points.push(`正确写出公式：${card.formulas[0]}`);
      }
      points.push('准确代入已知条件');
      points.push('计算过程规范');
      break;
    case '条件辨析题':
      points.push('识别关键条件');
      points.push('判断适用范围');
      break;
    case '易错判断题':
      points.push('识别常见误区');
      points.push('给出正确理解');
      break;
    case '材料分析题':
      points.push('定位材料依据');
      points.push('结合材料分析');
      break;
    case '综合解答题':
      points.push('步骤完整清晰');
      points.push('逻辑严密');
      break;
    default:
      points.push('理解核心概念');
  }

  points.push('给出规范结论');

  return points.slice(0, 5);
};

// 根据蓝图生成题干
export const generateQuestionStemFromBlueprint = (blueprint: QuestionBlueprint): string => {
  const templates: Record<ExamQuestionPattern, string[]> = {
    基础概念题: [
      `关于"${blueprint.knowledgePoint}"的基本概念，下列说法正确的是（  ）`,
      `"${blueprint.knowledgePoint}"的核心含义是（  ）`,
    ],
    公式套用题: [
      `已知条件与"${blueprint.knowledgePoint}"相关，下列计算正确的是（  ）`,
      `运用"${blueprint.knowledgePoint}"求解，正确的是（  ）`,
    ],
    条件辨析题: [
      `关于"${blueprint.knowledgePoint}"的适用条件，下列说法正确的是（  ）`,
      `"${blueprint.knowledgePoint}"成立的前提是（  ）`,
    ],
    易错判断题: [
      `关于"${blueprint.knowledgePoint}"，下列说法是否正确？`,
      `判断："${blueprint.knowledgePoint}"的常见理解。`,
    ],
    材料分析题: [
      `根据资料分析，"${blueprint.knowledgePoint}"应如何判断？`,
      `结合材料，说明"${blueprint.knowledgePoint}"的具体应用。`,
    ],
    变式迁移题: [
      `若将"${blueprint.knowledgePoint}"的条件改变，下列结论正确的是（  ）`,
      `类比"${blueprint.knowledgePoint}"，解决类似问题的方法是（  ）`,
    ],
    综合解答题: [
      `围绕"${blueprint.knowledgePoint}"完成一道综合解答题，写出完整步骤。`,
      `结合"${blueprint.knowledgePoint}"，分析并解决下列问题。`,
    ],
  };

  const patternTemplates = templates[blueprint.examPattern] || templates.基础概念题;
  return patternTemplates[0];
};

// 根据蓝图生成解析
export const generateExplanationFromBlueprint = (blueprint: QuestionBlueprint): string => {
  const parts: string[] = [];

  parts.push(`【考点定位】本题考查"${blueprint.knowledgePoint}"。`);
  parts.push(`【考查能力】${blueprint.targetAbility}。`);

  if (blueprint.requiredMethods.length > 0) {
    parts.push(`【解题方法】${blueprint.requiredMethods.join('、')}。`);
  }

  if (blueprint.commonWrongMethods.length > 0) {
    parts.push(`【常见错误】${blueprint.commonWrongMethods[0]}。`);
  }

  parts.push(`【资料依据】${blueprint.sourceEvidence.slice(0, 50)}...`);

  return parts.join('\n');
};
