import type { Difficulty, ExamQuestionPattern, QuizQuestion } from '../types';

// 标准考点定义
export interface StandardKnowledgePoint {
  id: string;
  subject: string;
  title: string;
  keywords: string[];  // 匹配关键词
  coreConcept: string; // 核心概念
  formulas?: string[]; // 相关公式
  commonQuestionTypes: string[]; // 常见题型
  commonMistakes: string[]; // 常见错误
  examFrequency: '高频' | '中频' | '低频'; // 考试频率
  difficulty: Difficulty;
  typicalQuestions: {  // 典型例题
    question: string;
    answer: string;
    explanation: string;
  }[];
}

// 数学考点库 - 同角三角函数
const mathTrigKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'math-trig-001',
    subject: '数学',
    title: '同角三角函数基本关系',
    keywords: ['三角函数', 'sin', 'cos', 'tan', '同角', '平方关系', '商数关系'],
    coreConcept: 'sin²α + cos²α = 1，tanα = sinα/cosα，利用已知一角函数值求其他函数值',
    formulas: ['sin²α + cos²α = 1', 'tanα = sinα / cosα', '1 + tan²α = sec²α'],
    commonQuestionTypes: ['已知一角函数求其他', '化简求值', '恒等式证明'],
    commonMistakes: ['忽略象限判断符号', '混淆sin和cos', '计算错误'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '已知sinα = 3/5，且α是第二象限角，求cosα和tanα',
        answer: 'cosα = -4/5，tanα = -3/4',
        explanation: '由sin²α + cos²α = 1，得cos²α = 1 - (3/5)² = 16/25。第二象限cosα < 0，所以cosα = -4/5。tanα = sinα/cosα = (3/5)/(-4/5) = -3/4'
      }
    ]
  },
  {
    id: 'math-trig-002',
    subject: '数学',
    title: '诱导公式',
    keywords: ['诱导公式', '奇变偶不变', '符号看象限', 'π/2', 'π', '3π/2'],
    coreConcept: '奇变偶不变，符号看象限：π/2的奇数倍变函数名，偶数倍不变；符号由原函数在对应象限的符号决定',
    formulas: ['sin(π/2-α) = cosα', 'cos(π/2-α) = sinα', 'sin(π+α) = -sinα', 'cos(π+α) = -cosα'],
    commonQuestionTypes: ['化简求值', '证明恒等式', '求三角函数值'],
    commonMistakes: ['符号判断错误', '函数名变换错误', '象限判断错误'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '化简：sin(π + α) + cos(π/2 - α)',
        answer: '0',
        explanation: 'sin(π + α) = -sinα（第三象限sin为负），cos(π/2 - α) = sinα，所以原式 = -sinα + sinα = 0'
      }
    ]
  },
  {
    id: 'math-trig-003',
    subject: '数学',
    title: '三角函数象限判断',
    keywords: ['象限', '第一象限', '第二象限', '第三象限', '第四象限', '正负'],
    coreConcept: '第一象限全正，第二象限sin正，第三象限tan正，第四象限cos正',
    formulas: [],
    commonQuestionTypes: ['判断符号', '确定象限', '综合求值'],
    commonMistakes: ['象限口诀记错', '忽略tan在第三象限为正', '混淆cos在第四象限为正'],
    examFrequency: '高频',
    difficulty: '简单',
    typicalQuestions: [
      {
        question: '若sinα > 0且cosα < 0，则α在第几象限？',
        answer: '第二象限',
        explanation: 'sinα > 0说明α在第一或第二象限，cosα < 0说明α在第二或第三象限，同时满足两个条件的是第二象限'
      }
    ]
  }
];

// 数学考点库 - 函数
const mathFunctionKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'math-func-001',
    subject: '数学',
    title: '函数单调性',
    keywords: ['单调性', '单调递增', '单调递减', '导数', 'f(x)'],
    coreConcept: '函数在区间内单调递增：x1 < x2时f(x1) < f(x2)；单调递减：x1 < x2时f(x1) > f(x2)',
    formulas: ['f\'(x) > 0 → 单调递增', 'f\'(x) < 0 → 单调递减'],
    commonQuestionTypes: ['判断单调性', '求单调区间', '利用单调性比较大小'],
    commonMistakes: ['忽略定义域限制', '导数计算错误', '端点值判断错误'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '函数f(x) = x² - 2x的单调递减区间是？',
        answer: '(-∞, 1]',
        explanation: 'f\'(x) = 2x - 2，令f\'(x) < 0得x < 1，所以单调递减区间是(-∞, 1]'
      }
    ]
  },
  {
    id: 'math-func-002',
    subject: '数学',
    title: '函数奇偶性',
    keywords: ['奇函数', '偶函数', '奇偶性', 'f(-x)', '对称'],
    coreConcept: '奇函数：f(-x) = -f(x)，图像关于原点对称；偶函数：f(-x) = f(x)，图像关于y轴对称',
    formulas: ['f(-x) = -f(x) → 奇函数', 'f(-x) = f(x) → 偶函数'],
    commonQuestionTypes: ['判断奇偶性', '利用奇偶性求值', '奇偶函数图像性质'],
    commonMistakes: ['定义域不对称时误判', '忽略f(0)=0（奇函数）', '混淆奇偶性定义'],
    examFrequency: '中频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '判断f(x) = x³ - x的奇偶性',
        answer: '奇函数',
        explanation: 'f(-x) = (-x)³ - (-x) = -x³ + x = -(x³ - x) = -f(x)，满足奇函数定义'
      }
    ]
  }
];

// 数学考点库 - 数列
const mathSequenceKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'math-seq-001',
    subject: '数学',
    title: '等差数列',
    keywords: ['等差数列', '公差', '通项公式', '前n项和', 'aₙ'],
    coreConcept: '相邻两项差为常数d，通项公式an = a1 + (n-1)d，前n项和Sn = n(a1+an)/2 = na1 + n(n-1)d/2',
    formulas: ['an = a1 + (n-1)d', 'Sn = n(a1+an)/2', 'Sn = na1 + n(n-1)d/2'],
    commonQuestionTypes: ['求通项公式', '求前n项和', '已知Sn求an'],
    commonMistakes: ['项数计算错误', '公差符号错误', 'Sn公式记错'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '等差数列{an}中，a1 = 2，d = 3，求a10和S10',
        answer: 'a10 = 29，S10 = 155',
        explanation: 'a10 = a1 + 9d = 2 + 27 = 29；S10 = 10×(2+29)/2 = 155'
      }
    ]
  },
  {
    id: 'math-seq-002',
    subject: '数学',
    title: '等比数列',
    keywords: ['等比数列', '公比', '通项公式', '前n项和', '等比中项'],
    coreConcept: '相邻两项比为常数q，通项公式an = a1·q^(n-1)，前n项和Sn = a1(1-q^n)/(1-q)（q≠1）',
    formulas: ['an = a1·q^(n-1)', 'Sn = a1(1-q^n)/(1-q) (q≠1)', 'G² = ab（等比中项）'],
    commonQuestionTypes: ['求通项公式', '求前n项和', '等比中项计算'],
    commonMistakes: ['忽略q≠1的条件', '公比为负数时符号错误', '指数运算错误'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '等比数列{an}中，a1 = 1，q = 2，求a5和S5',
        answer: 'a5 = 16，S5 = 31',
        explanation: 'a5 = 1×2⁴ = 16；S5 = 1×(1-2⁵)/(1-2) = (1-32)/(-1) = 31'
      }
    ]
  }
];

// 英语考点库（六级/高考）
const englishKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'eng-001',
    subject: '英语',
    title: '定语从句关系词选择',
    keywords: ['定语从句', '关系代词', 'which', 'that', 'who', 'whom', 'whose'],
    coreConcept: '先行词是人用who/whom/that，是物用which/that；逗号后只用which/whom；介词后用which/whom',
    commonQuestionTypes: ['选择关系词', '判断从句类型', '改错'],
    commonMistakes: ['逗号后用that', '介词后用who/which', '混淆限制性非限制性'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: 'This is the book _____ I bought yesterday.',
        answer: 'which/that/不填',
        explanation: '先行词是物（book），关系代词可用which或that；关系代词在从句中作宾语时可省略'
      }
    ]
  },
  {
    id: 'eng-002',
    subject: '英语',
    title: '虚拟语气',
    keywords: ['虚拟语气', 'if', 'would', 'should', 'were', 'had done'],
    coreConcept: '与现在事实相反：if + did/were, would/should/could do；与过去相反：if + had done, would have done',
    commonQuestionTypes: ['选择动词形式', '改错', '翻译'],
    commonMistakes: ['if从句用would', '混淆时态', '倒装结构错误'],
    examFrequency: '高频',
    difficulty: '较难',
    typicalQuestions: [
      {
        question: 'If I _____ you, I would accept the offer.',
        answer: 'were',
        explanation: '与现在事实相反的虚拟语气，be动词一律用were'
      }
    ]
  },
  {
    id: 'eng-003',
    subject: '英语',
    title: '时态辨析',
    keywords: ['现在完成时', '过去时', '进行时', 'have done', 'did'],
    coreConcept: '现在完成时强调对现在的影响；一般过去时只表示过去发生的动作；进行时强调正在进行的动作',
    commonQuestionTypes: ['选择时态', '改错', '翻译'],
    commonMistakes: ['有过去时间状语却用完成时', '混淆延续性动词和瞬间动词', '忽略时间状语的影响'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: 'I _____ in this company for ten years.',
        answer: 'have worked',
        explanation: 'for ten years是时间段，表示从过去持续到现在的动作，用现在完成时'
      }
    ]
  },
  {
    id: 'eng-004',
    subject: '英语',
    title: '非谓语动词',
    keywords: ['非谓语', '不定式', '动名词', '分词', 'to do', 'doing'],
    coreConcept: '不定式表目的、将来；动名词表抽象、习惯性动作；现在分词表主动、进行；过去分词表被动、完成',
    commonQuestionTypes: ['选择非谓语形式', '改错', '句子改写'],
    commonMistakes: ['forget to do/doing混淆', 'need doing被动含义不理解', '独立主格结构错误'],
    examFrequency: '高频',
    difficulty: '较难',
    typicalQuestions: [
      {
        question: 'I look forward to _____ from you.',
        answer: 'hearing',
        explanation: 'look forward to中的to是介词，后接动名词hearing'
      }
    ]
  }
];

// 语文考点库
const chineseKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'chi-001',
    subject: '语文',
    title: '冒号的使用',
    keywords: ['冒号', '标点', '提示下文', '总结上文', '引用'],
    coreConcept: '冒号用于提示下文或总结上文；提示语后用冒号；引用话语前用冒号',
    commonQuestionTypes: ['判断正误', '修改标点', '说明作用'],
    commonMistakes: ['提示语后用逗号', '冒号套用', '该用冒号却用破折号'],
    examFrequency: '中频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '下列句子中标点使用正确的是：A. 他说："我明天来。" B. 我想：这件事该怎么办？',
        answer: 'A',
        explanation: '直接引语前用冒号；B项心理活动不用冒号'
      }
    ]
  },
  {
    id: 'chi-002',
    subject: '语文',
    title: '病句辨析',
    keywords: ['病句', '搭配不当', '成分残缺', '语序不当', '表意不明'],
    coreConcept: '常见病句类型：搭配不当、成分残缺、语序不当、表意不明、不合逻辑、结构混乱',
    commonQuestionTypes: ['辨析病句', '修改病句', '说明病因'],
    commonMistakes: ['看不出隐性搭配不当', '忽略多重定语语序', '歧义句判断不准'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '下列句子没有语病的一项是：A. 通过这次活动，使我明白了团结的重要性。B. 他的写作水平明显提高了。',
        answer: 'B',
        explanation: 'A项"通过...使..."导致主语残缺；B项无语病'
      }
    ]
  },
  {
    id: 'chi-003',
    subject: '语文',
    title: '成语辨析',
    keywords: ['成语', '望文生义', '褒贬误用', '对象误用', '语义重复'],
    coreConcept: '成语使用要注意：不望文生义、褒贬得当、对象合适、避免语义重复',
    commonQuestionTypes: ['辨析成语使用', '选择恰当成语', '解释成语含义'],
    commonMistakes: ['望文生义', '褒贬颠倒', '对象误用'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '下列句子中成语使用正确的是：A. 他处心积虑地帮助别人。B. 这部小说情节跌宕起伏，引人入胜。',
        answer: 'B',
        explanation: 'A项"处心积虑"是贬义词，不能用于褒义语境；B项"引人入胜"使用正确'
      }
    ]
  }
];

// 物理考点库
const physicsKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'phy-001',
    subject: '物理',
    title: '牛顿第二定律',
    keywords: ['牛顿第二定律', 'F=ma', '加速度', '合外力', '质量'],
    coreConcept: '物体的加速度与所受合外力成正比，与质量成反比，方向与合外力方向相同：F = ma',
    formulas: ['F = ma', 'a = F/m', 'F合 = ma'],
    commonQuestionTypes: ['求加速度', '求力', '连接体问题'],
    commonMistakes: ['忽略合外力概念', '单位换算错误', '方向判断错误'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '质量为2kg的物体受到6N的水平拉力，求加速度',
        answer: '3 m/s²',
        explanation: '由F = ma得a = F/m = 6/2 = 3 m/s²'
      }
    ]
  },
  {
    id: 'phy-002',
    subject: '物理',
    title: '机械能守恒',
    keywords: ['机械能守恒', '动能', '势能', '只有重力做功'],
    coreConcept: '只有重力或弹力做功时，物体的动能和势能相互转化，机械能总量保持不变',
    formulas: ['Ek1 + Ep1 = Ek2 + Ep2', 'mgh1 + ½mv1² = mgh2 + ½mv2²'],
    commonQuestionTypes: ['判断机械能是否守恒', '利用守恒求速度', '利用守恒求高度'],
    commonMistakes: ['忽略摩擦力做功', '参考面选择错误', '速度方向不考虑'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '小球从高度h自由落下，求落地时的速度（不计空气阻力）',
        answer: 'v = √(2gh)',
        explanation: '由机械能守恒：mgh = ½mv²，解得v = √(2gh)'
      }
    ]
  }
];

// 化学考点库
const chemistryKnowledgeBase: StandardKnowledgePoint[] = [
  {
    id: 'chem-001',
    subject: '化学',
    title: '氧化还原反应',
    keywords: ['氧化还原', '氧化剂', '还原剂', '电子转移', '化合价'],
    coreConcept: '氧化还原反应的本质是电子转移，特征是元素化合价发生变化；氧化剂得电子被还原，还原剂失电子被氧化',
    formulas: [],
    commonQuestionTypes: ['判断氧化剂还原剂', '配平方程式', '计算电子转移数'],
    commonMistakes: ['混淆氧化剂和被氧化', '化合价计算错误', '电子转移数算错'],
    examFrequency: '高频',
    difficulty: '中等',
    typicalQuestions: [
      {
        question: '在反应2Na + Cl₂ = 2NaCl中，氧化剂是？',
        answer: 'Cl₂',
        explanation: 'Cl₂中Cl的化合价从0降到-1，得到电子，被还原，是氧化剂'
      }
    ]
  }
];

// 导出完整知识库
export const knowledgeBase: StandardKnowledgePoint[] = [
  ...mathTrigKnowledgeBase,
  ...mathFunctionKnowledgeBase,
  ...mathSequenceKnowledgeBase,
  ...englishKnowledgeBase,
  ...chineseKnowledgeBase,
  ...physicsKnowledgeBase,
  ...chemistryKnowledgeBase,
];

// 根据关键词匹配考点
export const matchKnowledgePoints = (materialText: string, subject?: string): StandardKnowledgePoint[] => {
  const matched: Array<StandardKnowledgePoint & { _matchScore: number }> = [];

  for (const kp of knowledgeBase) {
    // 如果指定了学科，先过滤学科
    if (subject && kp.subject !== subject) continue;

    // 计算匹配度
    let matchScore = 0;
    for (const keyword of kp.keywords) {
      if (materialText.toLowerCase().includes(keyword.toLowerCase())) {
        matchScore++;
      }
    }

    // 匹配度超过阈值（至少匹配2个关键词）
    if (matchScore >= 2) {
      matched.push({ ...kp, _matchScore: matchScore });
    }
  }

  // 按匹配度排序
  return matched.sort((a, b) => b._matchScore - a._matchScore);
};

// 获取高频考点
export const getHighFrequencyPoints = (subject?: string): StandardKnowledgePoint[] => {
  let points = knowledgeBase.filter(kp => kp.examFrequency === '高频');
  if (subject) {
    points = points.filter(kp => kp.subject === subject);
  }
  return points;
};

// 根据考点生成题目模板
export const generateQuestionFromKnowledgeBase = (
  kp: StandardKnowledgePoint,
  materialContext?: string
): Partial<QuizQuestion> => {
  // 随机选择一个典型例题作为模板
  const template = kp.typicalQuestions[Math.floor(Math.random() * kp.typicalQuestions.length)];

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
  };

  const examPattern = patternMap[kp.commonQuestionTypes[0]] || '基础概念题';

  return {
    question: template.question,
    answer: template.answer,
    explanation: `${template.explanation}\n\n【考点】${kp.title}\n【常见错误】${kp.commonMistakes.join('；')}`,
    difficulty: kp.difficulty,
    examPattern: examPattern,
    commonMistake: kp.commonMistakes[0],
    sourceEvidence: materialContext || `标准考点：${kp.title}`,
  };
};
