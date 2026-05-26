import type { ExamQuestionPattern, SubjectType } from '../types';

export interface ExamStrategy {
  subjectType: SubjectType;
  methods: string[];
  commonMistakes: string[];
  answerRequirements: string[];
}

const hasAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));

// 检测英文占比
const detectEnglishRatio = (text: string): number => {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  const chinese = text.replace(/[^\u4e00-\u9fa5]/g, '');
  const total = letters.length + chinese.length;
  if (total === 0) return 0;
  return letters.length / total;
};

export const inferSubjectType = (materialText: string): SubjectType => {
  // 新增：先检测文本语言
  const englishRatio = detectEnglishRatio(materialText);

  // 如果英文占比超过60%，优先按英语学科处理
  if (englishRatio > 0.6) {
    // 英文技术文档
    if (hasAny(materialText, ['data structure', 'algorithm', 'stack', 'queue', 'binary tree', 'sorting'])) return '数据结构';
    if (hasAny(materialText, ['operating system', 'process', 'thread', 'deadlock', 'scheduling'])) return '操作系统';
    if (hasAny(materialText, ['network', 'tcp', 'udp', 'http', 'protocol', 'routing'])) return '计算机网络';
    if (hasAny(materialText, ['database', 'sql', 'transaction', 'index'])) return '数据库';
    if (hasAny(materialText, ['programming', 'variable', 'function', 'object-oriented', 'class'])) return '程序设计';
    if (hasAny(materialText, ['calculus', 'derivative', 'integral', 'limit', 'differential'])) return '高等数学';
    if (hasAny(materialText, ['matrix', 'determinant', 'eigenvalue', 'vector space'])) return '线性代数';
    if (hasAny(materialText, ['probability', 'statistics', 'distribution', 'variance'])) return '概率统计';
    // 数学需要更精确的匹配：独立的sin/cos/tan，不是单词的一部分
    if (/\b(sin|cos|tan)\b.*\b(alpha|beta|theta|angle|degree|radian)\b/i.test(materialText) ||
        /\btrigonometric\b/i.test(materialText) ||
        /\b(sin²|cos²|tan²)\b/i.test(materialText)) return '数学';
    // 其他英文内容默认为英语学科
    return '英语';
  }

  // 中文内容按原逻辑检测
  if (hasAny(materialText, ['数据结构', '算法', '栈', '队列', '树', '图', '查找', '排序'])) return '数据结构';
  if (hasAny(materialText, ['操作系统', '进程', '线程', '死锁', '调度', '虚拟内存'])) return '操作系统';
  if (hasAny(materialText, ['计算机网络', 'tcp', 'udp', 'ip地址', '路由', 'http', 'osi'])) return '计算机网络';
  if (hasAny(materialText, ['数据库', 'sql', '范式', '事务', '索引', '关系模型'])) return '数据库';
  if (hasAny(materialText, ['程序设计', '编程', '变量', '函数', '指针', '对象', 'class', 'python', 'java', 'c++'])) return '程序设计';
  if (hasAny(materialText, ['极限', '导数', '微分', '积分', '微积分', '级数'])) return '高等数学';
  if (hasAny(materialText, ['矩阵', '行列式', '线性方程组', '特征值', '特征向量', '向量空间'])) return '线性代数';
  if (hasAny(materialText, ['概率', '随机变量', '分布', '方差', '期望', '统计', '假设检验'])) return '概率统计';
  if (hasAny(materialText, ['三角函数', '函数', '方程', '证明', '几何', '代数', '公式', '导数']) ||
      /\b(sin|cos|tan)\s*[²^]?\s*[αβθ]/.test(materialText)) return '数学';
  if (hasAny(materialText, ['电路', '电压', '电流', '电阻', '节点', '网孔', '基尔霍夫'])) return '电路';
  if (hasAny(materialText, ['力', '运动', '能量', '速度', '加速度', '功率', '动量', '场强'])) return hasAny(materialText, ['大学物理', '刚体', '麦克斯韦']) ? '大学物理' : '物理';
  if (hasAny(materialText, ['反应', '方程式', '离子', '溶液', '化合价', '电解质', '酸碱'])) return '化学';
  if (hasAny(materialText, ['标点', '阅读', '病句', '作文', '文言文', '冒号', '分号', '修辞'])) return '语文';
  if (hasAny(materialText, ['grammar', 'reading', 'vocabulary', '完形', '语法', '词汇', '从句', '时态'])) return '英语';
  if (hasAny(materialText, ['细胞', '遗传', '生态', '基因', '光合作用'])) return '生物';
  if (hasAny(materialText, ['政治', '制度', '经济', '哲学', '法治'])) return '政治';
  if (hasAny(materialText, ['经济学', '供给', '需求', '弹性', '边际', '市场均衡'])) return '经济学';
  if (hasAny(materialText, ['管理学', '组织', '计划', '领导', '控制', '战略管理'])) return '管理学';
  if (hasAny(materialText, ['会计', '借方', '贷方', '资产', '负债', '利润表'])) return '会计学';
  if (hasAny(materialText, ['法条', '法律', '合同', '侵权', '刑法', '民法', '行政法'])) return '法学';
  if (hasAny(materialText, ['解剖', '病理', '诊断', '药理', '临床', '护理'])) return hasAny(materialText, ['护理']) ? '护理学' : '医学';
  if (hasAny(materialText, ['机械', '齿轮', '机构', '材料力学', '制图', '加工'])) return '机械';
  if (hasAny(materialText, ['历史', '朝代', '革命', '战争', '改革'])) return '历史';
  if (hasAny(materialText, ['地理', '气候', '地形', '洋流', '人口', '区域'])) return '地理';
  return '通用';
};

export const getExamStrategy = (subjectType: SubjectType): ExamStrategy => {
  const strategies: Partial<Record<SubjectType, ExamStrategy>> = {
    数学: {
      subjectType,
      methods: ['公式记忆', '条件识别', '步骤推导', '符号规范', '变式训练'],
      commonMistakes: ['忽略定义域或取值条件', '只求平方值忘记判断正负号', '公式变形时符号错误', '步骤跳跃导致得分点缺失'],
      answerRequirements: ['写出所用公式', '说明条件来源', '分步代入计算', '给出最终结论'],
    },
    语文: {
      subjectType,
      methods: ['概念识别', '语境判断', '病因分析', '规则应用', '材料依据'],
      commonMistakes: ['脱离语境判断', '只记规则不看表达关系', '病因分类不清', '材料依据不足'],
      answerRequirements: ['指出规则', '结合语境', '说明原因', '给出规范修改或判断'],
    },
    英语: {
      subjectType,
      methods: ['语法规则', '语境判断', '词义辨析', '句法结构'],
      commonMistakes: ['只看单词不看句法', '忽略时态语态', '混淆近义词', '固定搭配记忆不牢'],
      answerRequirements: ['说明语法点', '结合上下文', '排除干扰项', '给出句法依据'],
    },
    物理: {
      subjectType,
      methods: ['模型识别', '公式选择', '受力/过程分析', '单位规范', '条件辨析'],
      commonMistakes: ['公式适用条件错误', '单位换算遗漏', '方向判断错误', '过程状态混淆'],
      answerRequirements: ['画清过程或对象', '列出公式', '代入单位', '说明物理意义'],
    },
    化学: {
      subjectType,
      methods: ['反应规律', '方程式书写', '离子判断', '条件辨析', '实验现象'],
      commonMistakes: ['方程式未配平', '忽略反应条件', '离子共存判断错误', '现象和结论混淆'],
      answerRequirements: ['写出反应依据', '规范方程式', '说明条件', '给出现象或结论'],
    },
    生物: {
      subjectType,
      methods: ['概念识别', '过程图解', '因果分析', '实验变量', '材料分析'],
      commonMistakes: ['概念边界混淆', '变量控制遗漏', '因果关系倒置', '图表信息读取不全'],
      answerRequirements: ['写清结构或过程', '指出变量', '结合材料解释', '形成结论'],
    },
    政治: {
      subjectType,
      methods: ['观点识别', '材料分析', '理论匹配', '规范表达'],
      commonMistakes: ['材料和原理脱节', '术语不规范', '角度遗漏', '答题层次混乱'],
      answerRequirements: ['点明原理', '结合材料', '分点作答', '形成结论'],
    },
    历史: {
      subjectType,
      methods: ['时空定位', '史料分析', '因果影响', '比较辨析'],
      commonMistakes: ['时间线混乱', '史实张冠李戴', '影响角度单一', '材料概括不足'],
      answerRequirements: ['明确时空背景', '引用材料信息', '分析原因影响', '比较归纳'],
    },
    地理: {
      subjectType,
      methods: ['区域定位', '图表读取', '因果分析', '条件评价'],
      commonMistakes: ['区域条件遗漏', '图表信息误读', '自然与人文因素混淆', '因果链不完整'],
      answerRequirements: ['定位区域', '提取图表信息', '分自然/人文分析', '给出结论'],
    },
    计算机: {
      subjectType,
      methods: ['概念定义', '过程追踪', '复杂度分析', '边界条件', '案例调试'],
      commonMistakes: ['只背术语不理解流程', '忽略边界条件', '复杂度判断错误', '把实现细节和原理混淆'],
      answerRequirements: ['说明概念', '给出过程或伪代码', '分析边界和复杂度', '形成明确结论'],
    },
    经济学: {
      subjectType,
      methods: ['概念辨析', '模型图像', '条件变化', '案例分析'],
      commonMistakes: ['只背定义不看前提条件', '供需曲线移动方向判断错误', '把相关关系当因果关系', '图像和文字结论不一致'],
      answerRequirements: ['点明模型或概念', '说明前提条件', '结合案例分析', '给出经济含义'],
    },
    管理学: {
      subjectType,
      methods: ['概念识别', '案例分析', '流程拆解', '措施评价'],
      commonMistakes: ['理论和案例脱节', '措施过于空泛', '遗漏主体或情境', '层次混乱'],
      answerRequirements: ['点明理论', '结合案例证据', '分层提出分析或措施', '形成结论'],
    },
    法学: {
      subjectType,
      methods: ['法条定位', '构成要件', '案例归入', '结论论证'],
      commonMistakes: ['法条适用错误', '构成要件遗漏', '事实与规范脱节', '结论缺少论证'],
      answerRequirements: ['定位规则', '列出要件', '结合事实逐项判断', '给出法律结论'],
    },
    医学: {
      subjectType,
      methods: ['概念识别', '机制解释', '病例分析', '诊疗流程'],
      commonMistakes: ['病因机制混淆', '症状和诊断依据混淆', '流程步骤遗漏', '禁忌和适应证不分'],
      answerRequirements: ['说明机制', '提取病例信息', '按流程分析', '给出依据充分的结论'],
    },
    通用: {
      subjectType,
      methods: ['概念理解', '场景判断', '易错辨析', '材料分析'],
      commonMistakes: ['只记名称不懂含义', '脱离材料判断', '关键词遗漏', '表达不完整'],
      answerRequirements: ['解释概念', '引用材料', '辨析易错点', '形成完整表达'],
    },
  };
  if (strategies[subjectType]) return strategies[subjectType];
  if (['高等数学', '线性代数', '概率统计'].includes(subjectType)) return { ...strategies.数学!, subjectType };
  if (['大学物理', '电路'].includes(subjectType)) return { ...strategies.物理!, subjectType };
  if (['程序设计', '数据结构', '操作系统', '计算机网络', '数据库'].includes(subjectType)) return { ...strategies.计算机!, subjectType };
  if (['会计学'].includes(subjectType)) return { ...strategies.经济学!, subjectType };
  if (['护理学'].includes(subjectType)) return { ...strategies.医学!, subjectType };
  if (['哲学', '文学', '历史学', '艺术学'].includes(subjectType)) return { ...strategies.语文!, subjectType };
  if (['理学', '工学', '农学', '交叉学科'].includes(subjectType)) return { ...strategies.通用!, subjectType };
  return { ...strategies.通用!, subjectType };
};

export const getQuestionPatternPlan = (subjectType: SubjectType): ExamQuestionPattern[] => {
  if (['数学', '高等数学', '线性代数', '概率统计'].includes(subjectType)) {
    return ['基础概念题', '基础概念题', '公式套用题', '公式套用题', '条件辨析题', '条件辨析题', '易错判断题', '易错判断题', '综合解答题', '变式迁移题'];
  }
  if (subjectType === '语文') {
    return ['基础概念题', '基础概念题', '条件辨析题', '条件辨析题', '条件辨析题', '易错判断题', '易错判断题', '材料分析题', '材料分析题', '综合解答题'];
  }
  if (['物理', '化学', '大学物理', '电路'].includes(subjectType)) {
    return ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '材料分析题', '公式套用题', '条件辨析题', '易错判断题', '综合解答题', '变式迁移题'];
  }
  if (['计算机', '程序设计', '数据结构', '操作系统', '计算机网络', '数据库'].includes(subjectType)) {
    return ['基础概念题', '条件辨析题', '易错判断题', '材料分析题', '变式迁移题', '基础概念题', '综合解答题', '材料分析题', '综合解答题', '变式迁移题'];
  }
  return ['基础概念题', '基础概念题', '条件辨析题', '易错判断题', '材料分析题', '条件辨析题', '易错判断题', '材料分析题', '综合解答题', '变式迁移题'];
};

// 获取学科对应的考查题型
export const getExamPatternsBySubject = (subject: SubjectType): ExamQuestionPattern[] => {
  const patternMap: Record<SubjectType, ExamQuestionPattern[]> = {
    数学: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '变式迁移题', '综合解答题'],
    高等数学: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '变式迁移题', '综合解答题'],
    线性代数: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '变式迁移题', '综合解答题'],
    概率统计: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '变式迁移题', '综合解答题'],
    语文: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
    英语: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
    物理: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '材料分析题', '综合解答题'],
    化学: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '材料分析题', '综合解答题'],
    生物: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
    政治: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    历史: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    地理: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    大学物理: ['基础概念题', '公式套用题', '条件辨析题', '易错判断题', '材料分析题', '综合解答题'],
    电路: ['基础概念题', '公式套用题', '条件辨析题', '综合解答题'],
    计算机: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题', '变式迁移题'],
    程序设计: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题', '综合解答题'],
    数据结构: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题', '综合解答题'],
    操作系统: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
    计算机网络: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
    数据库: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
    经济学: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    管理学: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    会计学: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    法学: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    医学: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    护理学: ['基础概念题', '条件辨析题', '材料分析题', '综合解答题'],
    机械: ['基础概念题', '公式套用题', '条件辨析题', '综合解答题'],
    哲学: ['基础概念题', '条件辨析题', '材料分析题'],
    文学: ['基础概念题', '条件辨析题', '材料分析题'],
    历史学: ['基础概念题', '条件辨析题', '材料分析题'],
    理学: ['基础概念题', '条件辨析题', '材料分析题'],
    工学: ['基础概念题', '公式套用题', '条件辨析题'],
    农学: ['基础概念题', '条件辨析题', '材料分析题'],
    艺术学: ['基础概念题', '条件辨析题', '材料分析题'],
    交叉学科: ['基础概念题', '条件辨析题', '材料分析题'],
    通用: ['基础概念题', '条件辨析题', '易错判断题', '材料分析题'],
  };
  return patternMap[subject] || patternMap.通用;
};

// 获取学科对应的题干模板
export const getQuestionTemplatesBySubject = (subject: SubjectType, pattern: ExamQuestionPattern): ((point: string) => string)[] => {
  const templates: Record<ExamQuestionPattern, ((point: string) => string)[]> = {
    基础概念题: [
      (p) => `关于"${p}"的基本概念，下列说法正确的是（  ）`,
      (p) => `根据资料，"${p}"的确切含义是（  ）`,
      (p) => `下列对"${p}"的理解，最准确的是（  ）`,
    ],
    公式套用题: [
      (p) => `已知条件与"${p}"相关，下列计算正确的是（  ）`,
      (p) => `运用"${p}"的公式求解，正确的是（  ）`,
      (p) => `根据"${p}"，当给定具体数值时，结果是（  ）`,
    ],
    条件辨析题: [
      (p) => `关于"${p}"的适用条件，下列说法正确的是（  ）`,
      (p) => `"${p}"成立的前提是（  ）`,
      (p) => `在判断"${p}"时，需要满足的条件是（  ）`,
    ],
    易错判断题: [
      (p) => `关于"${p}"，下列说法是否正确？`,
      (p) => `判断："${p}"在任何情况下都适用。`,
      (p) => `"${p}"的常见误区是（  ）`,
    ],
    材料分析题: [
      (p) => `根据资料分析，"${p}"应如何判断？`,
      (p) => `结合材料，说明"${p}"的具体应用。`,
      (p) => `资料中关于"${p}"的表述，理解正确的是（  ）`,
    ],
    变式迁移题: [
      (p) => `若将"${p}"的条件改变，下列结论正确的是（  ）`,
      (p) => `"${p}"的变式问题，正确解法是（  ）`,
      (p) => `类比"${p}"，解决类似问题的方法是（  ）`,
    ],
    综合解答题: [
      (p) => `围绕"${p}"完成一道综合解答题，写出完整步骤。`,
      (p) => `结合"${p}"，分析并解决下列问题。`,
      (p) => `根据"${p}"的相关知识，完成下列解答。`,
    ],
  };
  return templates[pattern] || templates.基础概念题;
};

// 获取默认难度比例
export const getDefaultDifficultyRatio = () => ({ easy: 20, medium: 50, hard: 30 });

// 获取学科特定的常见错误
export const getCommonMistakesBySubject = (subject: SubjectType): string[] => {
  const mistakesMap: Record<SubjectType, string[]> = {
    数学: ['忽略定义域或取值条件', '只求平方值忘记判断正负号', '公式变形时符号错误', '步骤跳跃导致得分点缺失', '忘记检验答案合理性'],
    高等数学: ['忽略定义域或收敛条件', '积分常数遗漏', '极限方向判断错误', '微分与积分混淆', '未验证端点'],
    线性代数: ['矩阵乘法顺序错误', '行列式计算符号错误', '特征值求解遗漏', '向量线性相关性判断错误'],
    概率统计: ['概率大于1或小于0', '独立性与互斥性混淆', '条件概率公式记错', '期望计算遗漏'],
    语文: ['脱离语境判断', '只记规则不看表达关系', '病因分类不清', '材料依据不足', '修辞手法判断错误'],
    英语: ['只看单词不看句法', '忽略时态语态', '混淆近义词', '固定搭配记忆不牢', '主谓一致错误'],
    物理: ['公式适用条件错误', '单位换算遗漏', '方向判断错误', '过程状态混淆', '矢量标量不分'],
    化学: ['方程式未配平', '忽略反应条件', '离子共存判断错误', '现象和结论混淆', '化合价计算错误'],
    生物: ['概念边界混淆', '变量控制遗漏', '因果关系倒置', '图表信息读取不全'],
    政治: ['材料和原理脱节', '术语不规范', '角度遗漏', '答题层次混乱'],
    历史: ['时间线混乱', '史实张冠李戴', '影响角度单一', '材料概括不足'],
    地理: ['区域条件遗漏', '图表信息误读', '自然与人文因素混淆', '因果链不完整'],
    大学物理: ['公式适用条件错误', '单位换算遗漏', '方向判断错误', '过程状态混淆'],
    电路: ['节点分析错误', '参考方向设定混乱', 'KCL/KVL应用错误'],
    计算机: ['只背术语不理解流程', '忽略边界条件', '复杂度判断错误', '把实现细节和原理混淆'],
    程序设计: ['语法错误', '逻辑错误', '边界条件未处理', '变量作用域混淆'],
    数据结构: ['时间复杂度计算错误', '空间复杂度忽略', '算法步骤遗漏'],
    操作系统: ['进程与线程混淆', '死锁条件不清', '调度算法选择错误'],
    计算机网络: ['协议层次混淆', 'IP地址计算错误', 'TCP/UDP特性混淆'],
    数据库: ['范式判断错误', 'SQL语法错误', '事务特性混淆'],
    经济学: ['只背定义不看前提条件', '供需曲线移动方向判断错误', '把相关关系当因果关系'],
    管理学: ['理论和案例脱节', '措施过于空泛', '遗漏主体或情境'],
    会计学: ['借贷方向错误', '会计等式不平衡', '科目归类错误'],
    法学: ['法条适用错误', '构成要件遗漏', '事实与规范脱节'],
    医学: ['病因机制混淆', '症状和诊断依据混淆', '流程步骤遗漏'],
    护理学: ['护理诊断错误', '护理措施不当', '评估顺序混乱'],
    机械: ['受力分析错误', '材料选择不当', '公差配合错误'],
    哲学: ['概念混淆', '论证逻辑错误', '哲学流派归属错误'],
    文学: ['文学流派混淆', '修辞手法判断错误', '主题理解偏差'],
    历史学: ['时间线混乱', '史实张冠李戴', '史料解读错误'],
    理学: ['概念边界混淆', '公式适用条件错误'],
    工学: ['设计规范错误', '计算步骤遗漏'],
    农学: ['生长条件判断错误', '病虫害识别错误'],
    艺术学: ['艺术流派混淆', '技法判断错误'],
    交叉学科: ['学科界限不清', '方法选择不当'],
    通用: ['只记名称不懂含义', '脱离材料判断', '关键词遗漏', '表达不完整'],
  };
  return mistakesMap[subject] || mistakesMap.通用;
};

// 获取学科特定的解题方法
export const getMethodsBySubject = (subject: SubjectType): string[] => {
  const methodsMap: Record<SubjectType, string[]> = {
    数学: ['公式记忆', '条件识别', '步骤推导', '符号规范', '变式训练', '数形结合'],
    高等数学: ['极限计算', '导数应用', '积分技巧', '级数判别', '微分方程求解'],
    线性代数: ['矩阵运算', '行列式计算', '特征值求解', '线性变换', '基变换'],
    概率统计: ['概率计算', '分布识别', '期望方差', '假设检验', '回归分析'],
    语文: ['概念识别', '语境判断', '病因分析', '规则应用', '材料依据'],
    英语: ['语法规则', '语境判断', '词义辨析', '句法结构', '逻辑推理'],
    物理: ['模型识别', '公式选择', '受力分析', '过程分析', '单位规范'],
    化学: ['反应规律', '方程式书写', '离子判断', '条件辨析', '实验分析'],
    生物: ['概念识别', '过程图解', '因果分析', '实验变量', '材料分析'],
    政治: ['观点识别', '材料分析', '理论匹配', '规范表达'],
    历史: ['时空定位', '史料分析', '因果影响', '比较辨析'],
    地理: ['区域定位', '图表读取', '因果分析', '条件评价'],
    大学物理: ['模型识别', '公式选择', '受力分析', '过程分析'],
    电路: ['节点分析', '网孔分析', '等效变换', '功率计算'],
    计算机: ['概念定义', '过程追踪', '复杂度分析', '边界条件'],
    程序设计: ['变量定义', '流程控制', '函数设计', '调试技巧'],
    数据结构: ['算法设计', '复杂度分析', '结构选择', '遍历技巧'],
    操作系统: ['进程管理', '内存管理', '文件系统', '死锁处理'],
    计算机网络: ['协议分析', '地址规划', '路由计算', '安全分析'],
    数据库: ['范式分析', 'SQL优化', '事务管理', '索引设计'],
    经济学: ['模型分析', '图像解读', '弹性计算', '均衡分析'],
    管理学: ['理论应用', '案例分析', '流程优化', '决策分析'],
    会计学: ['分录编制', '报表分析', '成本计算', '审计程序'],
    法学: ['法条解释', '案例分析', '要件判断', '论证推理'],
    医学: ['症状分析', '诊断推理', '治疗方案', '预后评估'],
    护理学: ['护理评估', '护理诊断', '护理计划', '护理实施'],
    机械: ['受力分析', '材料选择', '工艺设计', '公差计算'],
    哲学: ['概念分析', '逻辑推理', '论证评价', '思想史梳理'],
    文学: ['文本分析', '修辞识别', '主题提炼', '风格判断'],
    历史学: ['史料考证', '史实梳理', '因果分析', '史论结合'],
    理学: ['概念辨析', '公式应用', '实验设计'],
    工学: ['设计计算', '工艺分析', '质量控制'],
    农学: ['栽培技术', '病虫害防治', '土壤分析'],
    艺术学: ['作品分析', '技法识别', '风格判断'],
    交叉学科: ['方法整合', '视角转换', '综合分析'],
    通用: ['概念理解', '场景判断', '易错辨析', '材料分析'],
  };
  return methodsMap[subject] || methodsMap.通用;
};
