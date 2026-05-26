import { matchKnowledgePoints, generateQuestionFromKnowledgeBase, StandardKnowledgePoint } from './knowledgeBase';
import type { KnowledgePoint, QuizQuestion, ExamQuestionPattern } from '../types';

export interface LearningResult {
  matchedPoints: StandardKnowledgePoint[];
  learnedConcepts: string[];
  generatedQuestions: Partial<QuizQuestion>[];
}

// 主学习函数
export const learnFromMaterial = (
  materialText: string,
  extractedKnowledgePoints: KnowledgePoint[],
  subject?: string
): LearningResult => {
  // 1. 匹配知识库中的标准考点
  const matchedPoints = matchKnowledgePoints(materialText, subject);

  // 2. 提取学到的概念
  const learnedConcepts = matchedPoints.map(kp => kp.coreConcept);

  // 3. 基于标准考点生成高质量题目
  const generatedQuestions = matchedPoints.slice(0, 5).map(kp =>
    generateQuestionFromKnowledgeBase(kp, materialText.slice(0, 200))
  );

  return {
    matchedPoints,
    learnedConcepts,
    generatedQuestions,
  };
};

// 增强知识点（用知识库信息补充）
export const enhanceKnowledgePoint = (
  kp: KnowledgePoint,
  materialText: string
): KnowledgePoint => {
  const matched = matchKnowledgePoints(materialText);
  const bestMatch = matched.find(m =>
    kp.title.includes(m.title) || m.title.includes(kp.title)
  );

  if (bestMatch) {
    // 将常见题型映射到 ExamQuestionPattern
    const patternMap: Record<string, ExamQuestionPattern> = {
      '已知一角函数求其他': '公式套用题',
      '化简求值': '公式套用题',
      '恒等式证明': '综合解答题',
      '选择关系词': '条件辨析题',
      '判断从句类型': '条件辨析题',
      '改错': '易错判断题',
      '选择动词形式': '条件辨析题',
      '翻译': '综合解答题',
      '判断正误': '易错判断题',
      '修改标点': '易错判断题',
      '说明作用': '材料分析题',
      '判断单调性': '条件辨析题',
      '求单调区间': '公式套用题',
      '判断奇偶性': '基础概念题',
      '求通项公式': '公式套用题',
      '求前n项和': '公式套用题',
      '已知Sn求an': '变式迁移题',
      '利用单调性比较大小': '变式迁移题',
      '奇偶函数图像性质': '基础概念题',
      '等比中项计算': '公式套用题',
      '判断氧化剂还原剂': '条件辨析题',
      '配平方程式': '综合解答题',
      '计算电子转移数': '公式套用题',
      '判断机械能是否守恒': '条件辨析题',
      '利用守恒求速度': '公式套用题',
      '利用守恒求高度': '公式套用题',
      '求加速度': '公式套用题',
      '求力': '公式套用题',
      '连接体问题': '综合解答题',
      '辨析病句': '易错判断题',
      '修改病句': '易错判断题',
      '说明病因': '材料分析题',
      '辨析成语使用': '条件辨析题',
      '选择恰当成语': '条件辨析题',
      '解释成语含义': '基础概念题',
    };

    const examPatterns = bestMatch.commonQuestionTypes
      .map(type => patternMap[type])
      .filter((p): p is ExamQuestionPattern => p !== undefined);

    return {
      ...kp,
      formulas: bestMatch.formulas,
      commonMistakes: bestMatch.commonMistakes,
      examPatterns: examPatterns.length > 0 ? examPatterns : kp.examPatterns,
    };
  }

  return kp;
};

// 获取学习状态文本
export const getLearningStatusText = (matchedCount: number): string => {
  if (matchedCount === 0) return '未发现匹配的标准考点';
  if (matchedCount <= 2) return `已学习 ${matchedCount} 个标准考点`;
  if (matchedCount <= 5) return `已学习 ${matchedCount} 个标准考点，覆盖核心知识`;
  return `已学习 ${matchedCount} 个标准考点，知识体系完整`;
};

// 判断是否需要补充生成题目
export const shouldGenerateFromKnowledgeBase = (
  learningResult: LearningResult,
  targetCount: number
): boolean => {
  return learningResult.generatedQuestions.length > 0 &&
         learningResult.generatedQuestions.length < targetCount;
};
