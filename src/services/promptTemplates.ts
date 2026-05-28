import type { DiagnosisItem, KnowledgePoint, QuizQuestion, QuizResult, QuizSettings, SubjectType, UserAnswer } from '../types';
import { getExamStrategy, getQuestionPatternPlan, inferSubjectType } from './examStrategy';

const baseSystemPrompt = '你是高考/高职高考命题研究专家。你必须只输出 JSON，不要输出 Markdown、解释性前言或代码块。';

// ========== 辅助函数 ==========

/** 检测文本中英文占比 */
const detectEnglishRatio = (text: string): number => {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  const chinese = text.replace(/[^\u4e00-\u9fa5]/g, '');
  const total = letters.length + chinese.length;
  if (total === 0) return 0;
  return letters.length / total;
};

/** 判断是否为数学类学科 */
const isMathSubject = (subject: string): boolean =>
  ['数学', '高等数学', '线性代数', '概率统计'].includes(subject);

/** 判断是否为物理类学科 */
const isPhysicsSubject = (subject: string): boolean =>
  ['物理', '大学物理', '电路'].includes(subject);

/** 判断是否为化学类学科 */
const isChemistrySubject = (subject: string): boolean =>
  subject === '化学';

/** 判断是否为语文类学科 */
const isChineseSubject = (subject: string): boolean =>
  ['语文', '哲学', '文学', '历史学', '艺术学'].includes(subject);

/** 判断是否为英语类学科 */
const isEnglishSubject = (subject: string): boolean =>
  subject === '英语';

const normalizeDifficultyRatio = (settings?: QuizSettings) => {
  const ratio = settings?.difficultyRatio ?? { easy: 20, medium: 50, hard: 30 };
  const total = ratio.easy + ratio.medium + ratio.hard;
  if (total <= 0) return { easy: 20, medium: 50, hard: 30 };
  const easy = Math.round((ratio.easy / total) * 100);
  const medium = Math.round((ratio.medium / total) * 100);
  return { easy, medium, hard: Math.max(0, 100 - easy - medium) };
};

// ========== 各学科知识点提取 Prompt ==========

const buildMathKnowledgePrompt = (materialText: string) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `你是高考数学命题专家。请从资料中提取数学考点。

提取标准：
1. 必须是具体的数学概念、公式、定理、方法
2. 必须包含具体公式（如sin²α+cos²α=1）
3. 必须标注可考查方式（求值、化简、证明、判断）
4. 必须列出常见计算错误

禁止提取：
- 单个单词或短语
- 没有数学公式的内容
- 泛泛的主题描述

输出JSON：
{
  "knowledgePoints": [
    {
      "id": "kp-1",
      "title": "同角三角函数基本关系",
      "type": "公式定理",
      "description": "sin²α+cos²α=1，tanα=sinα/cosα",
      "importance": "高",
      "masteryTarget": "能熟练运用同角三角函数关系进行求值和化简",
      "examType": "求值、化简、证明恒等式",
      "examPatterns": ["基础概念题", "公式套用题", "条件辨析题", "易错判断题", "材料分析题", "变式迁移题", "综合解答题"],
      "sourceEvidence": "原文中的具体句子",
      "keywords": ["三角函数", "sin", "cos", "tan"],
      "subjectType": "数学",
      "formulas": ["sin²α+cos²α=1", "tanα=sinα/cosα"],
      "commonMistakes": ["忽略象限判断正负号", "混淆sin和cos的值"],
      "keyMethods": ["利用平方关系求值", "利用商数关系化简"]
    }
  ]
}

## 学习资料
${materialText.slice(0, 12000)}`,
});

const buildEnglishKnowledgePrompt = (materialText: string) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `你是大学英语六级/高考英语命题专家。请从资料中提取英语考点。

提取标准：
1. 必须是具体的语法点、词汇用法、阅读技巧
2. 必须标注考查方式（主旨题、细节题、词义题、推断题）
3. 必须列出常见错误选项特征
4. 知识点标题用中文，但内容涉及英文

禁止提取：
- 单个英文单词（如And、We、students）
- 没有语法或词汇考查价值的内容
- 文章主题概述（不是考点）

输出JSON：
{
  "knowledgePoints": [
    {
      "id": "kp-1",
      "title": "主旨大意题",
      "type": "阅读理解",
      "description": "考查对文章中心思想的理解，常见提问方式：The primary purpose/main idea/central theme",
      "importance": "高",
      "masteryTarget": "能快速定位文章主题句并概括主旨",
      "examType": "主旨大意、细节理解、词义推断、作者态度",
      "examPatterns": ["基础概念题", "条件辨析题", "易错判断题", "材料分析题"],
      "sourceEvidence": "原文段落引用",
      "keywords": ["main idea", "primary purpose", "central theme"],
      "subjectType": "英语",
      "formulas": [],
      "commonMistakes": ["以偏概全", "过度推断", "混淆事实与观点"],
      "keyMethods": ["定位主题句", "排除细节干扰", "关注首尾段"]
    }
  ]
}

## 学习资料
${materialText.slice(0, 12000)}`,
});

const buildChineseKnowledgePrompt = (materialText: string) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `你是高考语文命题专家。请从资料中提取语文考点。

提取标准：
1. 必须是具体的语法规则、修辞手法、标点用法、病句类型
2. 必须给出规则的具体内容和判断方法
3. 必须标注考查方式（判断正误、修改病句、分析修辞）
4. 必须列出常见错误类型

禁止提取：
- 泛泛的文学常识
- 没有规则判断标准的内容
- 单个词语

输出JSON：
{
  "knowledgePoints": [
    {
      "id": "kp-1",
      "title": "顿号的正确使用",
      "type": "标点符号",
      "description": "顿号用于并列词语之间；并列的谓语、补语不用顿号；并列分句间用逗号不用顿号",
      "importance": "高",
      "masteryTarget": "能准确判断并列词语间顿号的使用是否正确",
      "examType": "判断标点正误、修改标点错误、说明标点作用",
      "examPatterns": ["基础概念题", "条件辨析题", "易错判断题", "材料分析题"],
      "sourceEvidence": "原文中的具体句子",
      "keywords": ["顿号", "并列", "标点符号"],
      "subjectType": "语文",
      "formulas": [],
      "commonMistakes": ["并列词语间漏用顿号", "并列分句间误用顿号", "顿号和逗号混用"],
      "keyMethods": ["判断是否为并列词语", "检查是否为分句", "注意有无连词"]
    }
  ]
}

## 学习资料
${materialText.slice(0, 12000)}`,
});

const buildPhysicsKnowledgePrompt = (materialText: string) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `你是高考物理命题专家。请从资料中提取物理考点。

提取标准：
1. 必须是具体的物理概念、定律、公式、实验方法
2. 必须包含具体公式（如F=ma，E=mc²）
3. 必须标注适用条件和单位
4. 必须列出常见计算错误和模型识别方法

禁止提取：
- 单个单词或短语
- 没有物理公式或模型的内容
- 泛泛的主题描述

输出JSON：
{
  "knowledgePoints": [
    {
      "id": "kp-1",
      "title": "牛顿第二定律",
      "type": "公式定理",
      "description": "F=ma，物体的加速度与所受合力成正比，与质量成反比",
      "importance": "高",
      "masteryTarget": "能正确进行受力分析并运用牛顿第二定律求解",
      "examType": "受力分析、加速度计算、运动过程分析",
      "examPatterns": ["基础概念题", "公式套用题", "条件辨析题", "易错判断题", "材料分析题", "变式迁移题", "综合解答题"],
      "sourceEvidence": "原文中的具体句子",
      "keywords": ["牛顿第二定律", "F=ma", "加速度", "合力"],
      "subjectType": "物理",
      "formulas": ["F=ma", "a=F/m"],
      "commonMistakes": ["受力分析遗漏力", "方向判断错误", "单位换算遗漏"],
      "keyMethods": ["隔离法受力分析", "正交分解法", "整体法与隔离法结合"]
    }
  ]
}

## 学习资料
${materialText.slice(0, 12000)}`,
});

const buildChemistryKnowledgePrompt = (materialText: string) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `你是高考化学命题专家。请从资料中提取化学考点。

提取标准：
1. 必须是具体的化学概念、方程式、反应规律、实验方法
2. 必须包含具体化学方程式或离子方程式
3. 必须标注反应条件和现象
4. 必须列出常见错误（如方程式未配平、忽略条件）

禁止提取：
- 单个单词或短语
- 没有化学方程式或规律的内容
- 泛泛的主题描述

输出JSON：
{
  "knowledgePoints": [
    {
      "id": "kp-1",
      "title": "钠与水的反应",
      "type": "化学反应",
      "description": "2Na+2H₂O=2NaOH+H₂↑，钠浮在水面、熔成小球、四处游动、发出响声",
      "importance": "高",
      "masteryTarget": "能正确书写钠与水反应的方程式并描述实验现象",
      "examType": "方程式书写、现象描述、产物判断",
      "examPatterns": ["基础概念题", "公式套用题", "条件辨析题", "易错判断题", "材料分析题", "综合解答题"],
      "sourceEvidence": "原文中的具体句子",
      "keywords": ["钠", "水", "反应", "NaOH"],
      "subjectType": "化学",
      "formulas": ["2Na+2H₂O=2NaOH+H₂↑"],
      "commonMistakes": ["方程式未配平", "产物判断错误", "忽略反应条件"],
      "keyMethods": ["记忆实验现象", "配平方程式", "判断氧化还原"]
    }
  ]
}

## 学习资料
${materialText.slice(0, 12000)}`,
});

const buildGeneralKnowledgePrompt = (materialText: string) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `你是高考/高职高考命题研究专家。请从资料中提取真正的考试考点。

## 提取标准（必须严格遵守）

### 1. 考点类型识别
从资料中识别以下类型的考点：
- **概念定义类**：包含"XX是..."、"XX指..."、"所谓XX"等定义性表述
- **分类比较类**：包含"分为..."、"包括..."、"与...的区别"等分类或比较
- **因果推理类**：包含"因为...所以..."、"由于...导致..."等因果关系
- **方法步骤类**：包含"首先...其次...最后..."、"流程是..."等步骤描述
- **条件限制类**：包含"当...时"、"在...情况下"、"前提是..."等条件表述
- **公式定理类**：包含数学公式、物理公式、化学方程式等

### 2. 禁止提取的内容
- 单个单词（如"And"、"We"、"students"）
- 泛泛的主题（如"高等教育"、"大学经验"）
- 页码、目录、"谢谢观看"等无效内容
- 没有考试价值的背景信息

### 3. 必须提取的内容
- 完整的概念、定理、公式、方法
- 能出成考试题，有明确考查价值
- 有具体原文依据

## 输出格式
{
  "knowledgePoints": [
    {
      "id": "kp-1",
      "title": "具体考点名称（2-18字的名词短语）",
      "type": "概念定义/分类比较/因果推理/方法步骤/条件限制/公式定理",
      "description": "核心内容（提炼后的考点，不是原文复制）",
      "importance": "高/中/低",
      "masteryTarget": "掌握目标（具体可衡量）",
      "examType": "可考查方式描述",
      "examPatterns": ["基础概念题", "公式套用题", "条件辨析题", "易错判断题", "材料分析题", "变式迁移题", "综合解答题"],
      "sourceEvidence": "原文依据（具体句子，不是概括）",
      "keywords": ["关键词1", "关键词2"],
      "subjectType": "通用",
      "formulas": ["公式1", "公式2"],
      "commonMistakes": ["易错点1", "易错点2"],
      "keyMethods": ["解题方法1", "解题方法2"]
    }
  ]
}

## 学习资料
${materialText.slice(0, 12000)}`,
});

// ========== 知识点提取入口 ==========

export const buildKnowledgePrompt = (materialText: string, subjectType?: string) => {
  const isEnglish = detectEnglishRatio(materialText) > 0.6;
  const subject = subjectType || inferSubjectType(materialText);

  if (isEnglish && !isMathSubject(subject) && !isPhysicsSubject(subject) && !isChemistrySubject(subject)) {
    return buildEnglishKnowledgePrompt(materialText);
  }

  switch (subject) {
    case '数学':
    case '高等数学':
    case '线性代数':
    case '概率统计':
      return buildMathKnowledgePrompt(materialText);
    case '语文':
    case '哲学':
    case '文学':
    case '历史学':
    case '艺术学':
      return buildChineseKnowledgePrompt(materialText);
    case '物理':
    case '大学物理':
    case '电路':
      return buildPhysicsKnowledgePrompt(materialText);
    case '化学':
      return buildChemistryKnowledgePrompt(materialText);
    case '英语':
      return buildEnglishKnowledgePrompt(materialText);
    default:
      return buildGeneralKnowledgePrompt(materialText);
  }
};

// ========== 各学科出题 Prompt ==========

const buildMathQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const questionCount = settings?.questionCount ?? 10;
  const selectedTypes = settings?.questionTypes?.join('、') || '单选、填空、解答';
  const examType = settings?.examType === '自定义' ? settings.customExamType || '自定义考试' : settings?.examType || '高考数学';
  const ratio = normalizeDifficultyRatio(settings);

  return {
    systemPrompt: `你是高考数学命题专家。请根据考点生成数学题。你必须只输出JSON。

## 命题要求（必须严格遵守）

### 题目风格要求（参考高考真题）
- 题干直接给具体数值条件，如"已知sinα=3/5，α∈(π/2,π)"
- 选项是具体数值或数学表达式，不是文字描述
- 考查计算能力和公式应用，不是概念记忆
- 简答题需要完整步骤

### 示例（三角函数）
题干：已知tanα=-3/4，且α是第二象限角，则sinα=（  ）
选项：A. 3/5  B. -3/5  C. 4/5  D. -4/5
答案：A
解析：设sinα=3k，cosα=-4k，由sin²α+cos²α=1得k=1/5，第二象限sinα>0，故sinα=3/5

### 示例（充分必要条件）
题干：sinx=1的一个充分不必要条件是（  ）
选项：A. x=π/2+2kπ  B. x=π/2  C. x=-π/2  D. x=0
答案：B
解析：sinx=1的充要条件是x=π/2+2kπ，B选项x=π/2是其中一个特例，能推出sinx=1但不是全部

### 示例（图像交点）
题干：曲线y=sinx与y=cosx在[0,2π]上的交点个数为（  ）
选项：A. 1  B. 2  C. 3  D. 4
答案：B
解析：sinx=cosx即tanx=1，在[0,2π]上x=π/4或x=5π/4，共2个交点

### 禁止生成
- "关于XX下列说法正确的是"（太泛）
- 选项是文字描述而非数值
- 没有具体数值条件的题目

## 难度分布
简单${ratio.easy}% / 中等${ratio.medium}% / 较难${ratio.hard}%

只输出JSON，不要输出Markdown或解释。`,

    userPrompt: `请基于以下资料和考点，生成${questionCount}道高考数学题。

## 学科信息
- 学科：数学
- 考试类型：${examType}
- 题型要求：${selectedTypes}
- 训练模式：${settings?.trainingMode ?? '基础巩固'}

## 学习资料
${materialText.slice(0, 6000)}

## 知识点
${JSON.stringify(knowledgePoints.slice(0, 8), null, 2)}

## 输出格式
{
  "questions": [
    {
      "id": "q1",
      "type": "single/judge/fill/short/solution",
      "examPattern": "基础概念题/公式套用题/条件辨析题/易错判断题/变式迁移题/综合解答题",
      "question": "具体题干（必须包含具体数值条件）",
      "options": ["选项A（具体数值）", "选项B（具体数值）", "选项C（具体数值）", "选项D（具体数值）"],
      "answer": "正确答案（具体数值）",
      "explanation": "详细解析，包含：考点定位、公式、代入步骤、计算过程",
      "scoringRubric": ["得分点1", "得分点2", "得分点3"],
      "solutionSteps": ["步骤1：识别考点", "步骤2：写出公式", "步骤3：代入计算", "步骤4：得出结果"],
      "commonMistake": "常见错误及原因（具体）",
      "difficulty": "简单/中等/较难",
      "sourceEvidence": "资料依据",
      "knowledgePointId": "对应知识点id",
      "optionExplanations": {
        "选项A": "解释为什么正确",
        "选项B": "解释错误原因",
        "选项C": "解释错误原因",
        "选项D": "解释错误原因"
      }
    }
  ]
}`,
  };
};

const buildEnglishQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const questionCount = settings?.questionCount ?? 10;
  const selectedTypes = settings?.questionTypes?.join('、') || '单选';
  const examType = settings?.examType === '自定义' ? settings.customExamType || '自定义考试' : settings?.examType || '六级英语';
  const ratio = normalizeDifficultyRatio(settings);

  return {
    systemPrompt: `你是大学英语六级命题专家。请根据资料生成英语阅读理解题。你必须只输出JSON。

## 命题要求（必须严格遵守）

### 题目风格要求（参考六级真题）
- 题干用英文
- 基于文章段落内容出题
- 题型覆盖：主旨题、细节题、词义猜测题、推断题、态度题（强制要求：生成的题目中必须至少包含以上5种题型各至少1道，不可全部只出一种题型）

### 示例（主旨题）
题干：The primary purpose of the passage is to ______.
选项：
A. criticize a common misconception about personality tests
B. analyze the scientific basis of brain dominance theory
C. examine the commercial success of online personality quizzes
D. explain why people enjoy taking personality tests
答案：A
解析：文章开头就指出personality tests是misconception，全文围绕批判这一观点展开

### 示例（词义题）
题干：The word "ascertain" in paragraph 1 most nearly means ______.
选项：
A. determine  B. ignore  C. improve  D. create
答案：A
解析：ascertain意为"确定、查明"，与determine同义

### 示例（细节题）
题干：According to the passage, which of the following is true about X?
选项：
A. ...
B. ...
C. ...
D. ...
答案：C
解析：文章第X段明确提到...

### 示例（态度题）
题干：The author's attitude toward X can best be described as ______.
选项：
A. skeptical  B. enthusiastic  C. indifferent  D. supportive
答案：A
解析：作者使用了"questionable"、"doubt"等词，表明持怀疑态度

### 干扰项要求（必须严格遵守）
- 所有干扰项必须从原文内容中合理改编，不可凭空编造与文章无关的选项
- 干扰项要有一定迷惑性，不能一眼看出错误

### 禁止生成
- 中文题干
- 与文章内容无关的题目
- 选项是明显错误的英文
- 所有题目都是同一种题型（必须覆盖5种题型）

## 难度分布
简单${ratio.easy}% / 中等${ratio.medium}% / 较难${ratio.hard}%

只输出JSON，不要输出Markdown或解释。`,

    userPrompt: `请基于以下资料和考点，生成${questionCount}道英语阅读理解题。

## 学科信息
- 学科：英语
- 考试类型：${examType}
- 题型要求：${selectedTypes}
- 训练模式：${settings?.trainingMode ?? '基础巩固'}

## 学习资料
${materialText.slice(0, 6000)}

## 知识点
${JSON.stringify(knowledgePoints.slice(0, 8), null, 2)}

## 输出格式
{
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "examPattern": "主旨概括题/细节理解题/词义猜测题/推断判断题/态度分析题",
      "question": "English question stem (e.g., The primary purpose of the passage is to ______.)",
      "options": ["Option A (English)", "Option B (English)", "Option C (English)", "Option D (English)"],
      "answer": "Correct answer (e.g., A)",
      "explanation": "Detailed explanation in Chinese, referencing the passage content",
      "scoringRubric": ["得分点1", "得分点2"],
      "solutionSteps": ["步骤1：定位文章关键段落", "步骤2：分析对应内容", "步骤3：匹配选项"],
      "commonMistake": "常见错误及原因",
      "difficulty": "简单/中等/较难",
      "sourceEvidence": "原文段落引用",
      "knowledgePointId": "对应知识点id",
      "optionExplanations": {
        "选项A": "解释",
        "选项B": "解释",
        "选项C": "解释",
        "选项D": "解释"
      }
    }
  ]
}`,
  };
};

const buildChineseQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const questionCount = settings?.questionCount ?? 10;
  const selectedTypes = settings?.questionTypes?.join('、') || '单选、判断';
  const examType = settings?.examType === '自定义' ? settings.customExamType || '自定义考试' : settings?.examType || '高考语文';
  const ratio = normalizeDifficultyRatio(settings);

  return {
    systemPrompt: `你是高考语文命题专家。请根据资料生成语文题。你必须只输出JSON。

## 命题要求（必须严格遵守）

### 题目风格要求（参考高考真题）
- 给出完整句子让考生判断正误
- 选项是完整句子，不是短语
- 考查语法规则和语言规范

### 阅读理解题型（必须覆盖）
如果资料是一篇完整的文章或段落，必须包含以下题型：
- 词句理解题：考查对文中关键词语、句子的理解
- 文意分析题：考查对段落大意、行文思路的分析
- 主旨概括题：考查对全文中心思想、作者观点的概括

### 示例（标点题）
题干：下列各句中，标点符号使用正确的一项是（  ）
选项：
A. 我国科学、文化、卫生、和新闻出版事业都有了很大进步。
B. 可是更妙的是三、五月明之夜，天是那样蓝，几乎透明似的。
C. 他最喜欢的诗句是"会当凌绝顶，一览众山小"。
D. 这个问题值得深思、研究。
答案：C
解析：A项"和"前面不应有顿号；B项"三五月明"是固定词语中间不应加顿号；D项"深思、研究"是动词并列应用逗号

### 示例（病句题）
题干：下列各句中，没有语病的一句是（  ）
选项：
A. 近日刚刚建成的西红门创业大街和青年创新创业大赛同步启动。
B. 通过这次活动，使我们增长了见识。
C. 他的写作水平明显改进了。
D. 能否坚持体育锻炼，是保持身体健康的重要条件。
答案：A
解析：B项缺主语，"通过"和"使"不能同时用；C项"水平"应搭配"提高"而非"改进"；D项两面对一面

### 示例（修辞题）
题干：对下面这段话的修辞手法，分析正确的一项是（  ）
选项：
A. ...
B. ...
C. ...
D. ...
答案：A
解析：...

### 示例（语言运用题）
题干：下列各句中，表达得体的一句是（  ）
选项：
A. ...
B. ...
C. ...
D. ...
答案：B
解析：...

### 干扰项要求（必须严格遵守）
- 所有干扰项必须从原文内容中合理改编，不可凭空编造与文章无关的选项
- 干扰项要有一定迷惑性，不能一眼看出错误

### 禁止生成
- "关于XX下列说法正确的是"（太泛）
- 选项是短语而非完整句子
- 没有具体句子内容的题目
- 所有题目都是同一种题型（必须覆盖多种题型）

## 难度分布
简单${ratio.easy}% / 中等${ratio.medium}% / 较难${ratio.hard}%

只输出JSON，不要输出Markdown或解释。`,

    userPrompt: `请基于以下资料和考点，生成${questionCount}道高考语文题。

## 学科信息
- 学科：语文
- 考试类型：${examType}
- 题型要求：${selectedTypes}
- 训练模式：${settings?.trainingMode ?? '基础巩固'}

## 学习资料
${materialText.slice(0, 6000)}

## 知识点
${JSON.stringify(knowledgePoints.slice(0, 8), null, 2)}

## 输出格式
{
  "questions": [
    {
      "id": "q1",
      "type": "single/judge",
      "examPattern": "基础概念题/条件辨析题/易错判断题/材料分析题/词句理解题/文意分析题/主旨概括题",
      "question": "具体题干（如：下列各句中，标点符号使用正确的一项是（  ））",
      "options": ["选项A（完整句子）", "选项B（完整句子）", "选项C（完整句子）", "选项D（完整句子）"],
      "answer": "正确答案",
      "explanation": "详细解析，逐项分析每个选项的对错及原因",
      "scoringRubric": ["得分点1", "得分点2"],
      "solutionSteps": ["步骤1：审题明确考查点", "步骤2：逐项分析", "步骤3：得出结论"],
      "commonMistake": "常见错误及原因",
      "difficulty": "简单/中等/较难",
      "sourceEvidence": "资料依据",
      "knowledgePointId": "对应知识点id",
      "optionExplanations": {
        "选项A": "解释为什么正确/错误",
        "选项B": "解释为什么正确/错误",
        "选项C": "解释为什么正确/错误",
        "选项D": "解释为什么正确/错误"
      }
    }
  ]
}`,
  };
};

const buildPhysicsQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const questionCount = settings?.questionCount ?? 10;
  const selectedTypes = settings?.questionTypes?.join('、') || '单选、填空、解答';
  const examType = settings?.examType === '自定义' ? settings.customExamType || '自定义考试' : settings?.examType || '高考物理';
  const ratio = normalizeDifficultyRatio(settings);

  return {
    systemPrompt: `你是高考物理命题专家。请根据考点生成物理题。你必须只输出JSON。

## 命题要求（必须严格遵守）

### 题目风格要求（参考高考真题）
- 题干包含具体的物理情境和数值条件
- 选项是具体数值、物理量或物理表达式
- 考查模型识别、公式选择、过程分析能力
- 解答题需要受力分析/过程分析和完整步骤

### 示例（力学）
题干：质量为2kg的物体静止在光滑水平面上，受到大小为10N的水平恒力作用，则3s后物体的速度为（  ）
选项：A. 5m/s  B. 10m/s  C. 15m/s  D. 20m/s
答案：C
解析：由牛顿第二定律F=ma得a=10/2=5m/s²，3s后v=at=5×3=15m/s

### 示例（电学）
题干：一个电阻R=10Ω，两端电压U=5V，则通过电阻的电流为（  ）
选项：A. 0.2A  B. 0.5A  C. 2A  D. 50A
答案：B
解析：由欧姆定律I=U/R=5/10=0.5A

### 禁止生成
- "关于XX下列说法正确的是"（太泛）
- 选项是文字描述而非数值/表达式
- 没有具体物理情境的题目

## 难度分布
简单${ratio.easy}% / 中等${ratio.medium}% / 较难${ratio.hard}%

只输出JSON，不要输出Markdown或解释。`,

    userPrompt: `请基于以下资料和考点，生成${questionCount}道高考物理题。

## 学科信息
- 学科：物理
- 考试类型：${examType}
- 题型要求：${selectedTypes}
- 训练模式：${settings?.trainingMode ?? '基础巩固'}

## 学习资料
${materialText.slice(0, 6000)}

## 知识点
${JSON.stringify(knowledgePoints.slice(0, 8), null, 2)}

## 输出格式
{
  "questions": [
    {
      "id": "q1",
      "type": "single/judge/fill/short/solution",
      "examPattern": "基础概念题/公式套用题/条件辨析题/易错判断题/材料分析题/变式迁移题/综合解答题",
      "question": "具体题干（必须包含物理情境和数值条件）",
      "options": ["选项A（具体数值/表达式）", "选项B（具体数值/表达式）", "选项C（具体数值/表达式）", "选项D（具体数值/表达式）"],
      "answer": "正确答案（具体数值）",
      "explanation": "详细解析，包含：模型识别、公式选择、代入计算、单位检查",
      "scoringRubric": ["得分点1", "得分点2", "得分点3"],
      "solutionSteps": ["步骤1：分析物理过程", "步骤2：选择公式", "步骤3：代入计算", "步骤4：检查单位和结果"],
      "commonMistake": "常见错误及原因",
      "difficulty": "简单/中等/较难",
      "sourceEvidence": "资料依据",
      "knowledgePointId": "对应知识点id",
      "optionExplanations": {
        "选项A": "解释",
        "选项B": "解释",
        "选项C": "解释",
        "选项D": "解释"
      }
    }
  ]
}`,
  };
};

const buildChemistryQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const questionCount = settings?.questionCount ?? 10;
  const selectedTypes = settings?.questionTypes?.join('、') || '单选、填空、解答';
  const examType = settings?.examType === '自定义' ? settings.customExamType || '自定义考试' : settings?.examType || '高考化学';
  const ratio = normalizeDifficultyRatio(settings);

  return {
    systemPrompt: `你是高考化学命题专家。请根据考点生成化学题。你必须只输出JSON。

## 命题要求（必须严格遵守）

### 题目风格要求（参考高考真题）
- 题干包含具体的化学反应情境和条件
- 选项涉及化学方程式、离子反应、实验现象等
- 考查方程式书写、反应规律、实验分析能力
- 解答题需要配平方程式和说明反应条件

### 示例（方程式）
题干：下列化学方程式书写正确的是（  ）
选项：
A. 2Na+2H₂O=2NaOH+H₂↑
B. Na+H₂O=NaOH+H₂↑
C. 2Na+2H₂O=2NaOH+H₂
D. Na₂O+H₂O=2NaOH+H₂
答案：A
解析：B项未配平；C项H₂缺少↑；D项Na₂O与水反应不产生H₂

### 示例（离子共存）
题干：下列各组离子在溶液中能大量共存的是（  ）
选项：
A. H⁺、OH⁻、Na⁺、Cl⁻
B. Ag⁺、Cl⁻、Na⁺、NO₃⁻
C. Na⁺、K⁺、Cl⁻、NO₃⁻
D. Ba²⁺、SO₄²⁻、Na⁺、Cl⁻
答案：C
解析：A项H⁺与OH⁻反应生成水；B项Ag⁺与Cl⁻生成AgCl沉淀；D项Ba²⁺与SO₄²⁻生成BaSO₄沉淀

### 禁止生成
- "关于XX下列说法正确的是"（太泛）
- 选项是文字描述而非化学式/方程式
- 没有具体化学情境的题目

## 难度分布
简单${ratio.easy}% / 中等${ratio.medium}% / 较难${ratio.hard}%

只输出JSON，不要输出Markdown或解释。`,

    userPrompt: `请基于以下资料和考点，生成${questionCount}道高考化学题。

## 学科信息
- 学科：化学
- 考试类型：${examType}
- 题型要求：${selectedTypes}
- 训练模式：${settings?.trainingMode ?? '基础巩固'}

## 学习资料
${materialText.slice(0, 6000)}

## 知识点
${JSON.stringify(knowledgePoints.slice(0, 8), null, 2)}

## 输出格式
{
  "questions": [
    {
      "id": "q1",
      "type": "single/judge/fill/short/solution",
      "examPattern": "基础概念题/公式套用题/条件辨析题/易错判断题/材料分析题/综合解答题",
      "question": "具体题干（必须包含化学情境）",
      "options": ["选项A（化学式/方程式）", "选项B（化学式/方程式）", "选项C（化学式/方程式）", "选项D（化学式/方程式）"],
      "answer": "正确答案",
      "explanation": "详细解析，包含：反应分析、方程式、条件说明",
      "scoringRubric": ["得分点1", "得分点2", "得分点3"],
      "solutionSteps": ["步骤1：分析反应类型", "步骤2：写出方程式", "步骤3：配平检查", "步骤4：得出结论"],
      "commonMistake": "常见错误及原因",
      "difficulty": "简单/中等/较难",
      "sourceEvidence": "资料依据",
      "knowledgePointId": "对应知识点id",
      "optionExplanations": {
        "选项A": "解释",
        "选项B": "解释",
        "选项C": "解释",
        "选项D": "解释"
      }
    }
  ]
}`,
  };
};

const buildGeneralQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const subjectType: SubjectType = inferSubjectType(materialText);
  const strategy = getExamStrategy(subjectType);
  const questionCount = settings?.questionCount ?? 10;
  const selectedTypes = settings?.questionTypes?.join('、') || '单选、判断、简答、解答';
  const examType = settings?.examType === '自定义' ? settings.customExamType || '自定义考试' : settings?.examType || '自动识别';
  const selectedSubject = settings?.subjectType === '自动识别' || !settings?.subjectType ? subjectType : settings.subjectType;
  const ratio = normalizeDifficultyRatio(settings);

  return {
    systemPrompt: `你是高考/高职高考命题研究专家。请根据考点生成真正具有考试训练价值的选择题。你必须只输出JSON。

## 命题核心规则（强制遵守，违反则不合格）

### 规则1：题干多样化（绝对禁止万能题干）
以下题干格式绝对禁止使用，出现即不合格：
❌ "下列说法正确的是"
❌ "下列理解恰当的是"  
❌ "关于XX，下列说法正确的是"
❌ "以下关于XX的描述，正确的是"
❌ "根据原文，下列选项正确的是"
❌ "下列选项中，符合原文的是"

必须使用以下具体题干格式（必须基于原文具体内容）：
✅ "根据原文第X段，关于XXX的描述，错误的一项是"
✅ "原文中提到XXX的主要原因是"
✅ "下列选项中，符合原文作者观点的是"
✅ "根据资料，XXX与YYY的主要区别在于"
✅ "原文中XXX的适用条件不包括"
✅ "关于XXX的特征，下列表述与原文不一致的是"
✅ "根据资料，XXX的实现步骤中，正确的顺序是"
✅ "原文中提到的XXX方法，其核心要点是"

### 规则2：干扰项强制规则（100%来自原文）
1. 所有干扰项必须100%来自原文内容，禁止凭空捏造
2. 干扰项错误类型必须多样化，每题使用不同错误类型：
   - 偷换概念：将原文中A概念的特征套到B概念上
   - 扩大范围：将原文的"部分/有时"改为"全部/总是"
   - 缩小范围：将原文的"通常/一般"改为"只能/仅限"
   - 因果倒置：将原文的"A导致B"改为"B导致A"
   - 张冠李戴：将原文中A的特点/方法归到B上
   - 时态错误：将原文的"正在/将要"改为"已经/完成"
   - 程度错误：将原文的"可能/也许"改为"一定/必然"
3. 绝对禁止出现明显不符合常识或与原文完全无关的干扰项
4. 正确答案不能有特殊的语言特征（如最长、最具体、最详细）
5. 每个干扰项必须看起来"像是对的"，让不认真读原文的学生容易选错

### 规则3：题目必须有原文依据
- 每道题的题干和每个选项都必须能在原文中找到对应内容
- sourceEvidence 必须引用原文具体句子，不能是概括
- optionExplanations 必须说明每个选项在原文中的对应位置

### 规则4：解析必须能教会学生
- explanation 必须包含：考点定位 + 解题思路 + 关键步骤 + 原文依据
- commonMistake 必须是真实的学生易错点，不能是模板废话
- solutionSteps 必须具体可操作

## 难度分布
简单${ratio.easy}% / 中等${ratio.medium}% / 较难${ratio.hard}%

只输出JSON，不要输出Markdown或解释。`,

    userPrompt: `请基于以下资料和考点，生成${questionCount}道符合中国考试规范的选择题。

## 学科信息
- 学科：${selectedSubject}
- 考试类型：${examType}
- 题型要求：${selectedTypes}
- 训练模式：${settings?.trainingMode ?? '基础巩固'}

## 命题策略
- 考查方法：${strategy.methods.join('、')}
- 常见误区：${strategy.commonMistakes.join('、')}
- 题型计划：${getQuestionPatternPlan(subjectType).join('、')}

## 学习资料
${materialText.slice(0, 6000)}

## 知识点
${JSON.stringify(knowledgePoints.slice(0, 8), null, 2)}

## 输出格式
{
  "questions": [
    {
      "id": "q1",
      "type": "single/judge/fill/short/solution/material",
      "examPattern": "基础概念题/公式套用题/条件辨析题/易错判断题/材料分析题/变式迁移题/综合解答题",
      "question": "具体题干（必须基于原文具体内容，禁止使用\"下列说法正确的是\"等万能题干）",
      "options": ["选项A（必须来自原文内容）", "选项B（必须来自原文内容，使用偷换概念/扩大范围等错误类型）", "选项C（必须来自原文内容）", "选项D（必须来自原文内容）"],
      "answer": "正确答案",
      "explanation": "详细解析，包含：考点定位、解题思路、关键步骤、原文依据",
      "scoringRubric": ["得分点1", "得分点2", "得分点3"],
      "solutionSteps": ["步骤1", "步骤2", "步骤3"],
      "commonMistake": "常见错误及原因（具体，不能是模板废话）",
      "difficulty": "简单/中等/较难",
      "sourceEvidence": "原文依据（必须引用原文具体句子）",
      "knowledgePointId": "对应知识点id",
      "optionExplanations": {
        "选项A": "解释为什么正确/错误，说明在原文中的对应位置",
        "选项B": "解释错误原因和错误类型（如偷换概念/扩大范围等），说明在原文中的对应位置",
        "选项C": "解释错误原因和错误类型，说明在原文中的对应位置",
        "选项D": "解释错误原因和错误类型，说明在原文中的对应位置"
      }
    }
  ]
}`,
  };
};

// ========== 出题入口 ==========

export const buildQuizPrompt = (materialText: string, knowledgePoints: KnowledgePoint[], settings?: QuizSettings) => {
  const isEnglish = detectEnglishRatio(materialText) > 0.6;
  const subject = settings?.subjectType || inferSubjectType(materialText);

  if (isEnglish && !isMathSubject(subject) && !isPhysicsSubject(subject) && !isChemistrySubject(subject)) {
    return buildEnglishQuizPrompt(materialText, knowledgePoints, settings);
  }

  switch (subject) {
    case '数学':
    case '高等数学':
    case '线性代数':
    case '概率统计':
      return buildMathQuizPrompt(materialText, knowledgePoints, settings);
    case '语文':
    case '哲学':
    case '文学':
    case '历史学':
    case '艺术学':
      return buildChineseQuizPrompt(materialText, knowledgePoints, settings);
    case '物理':
    case '大学物理':
    case '电路':
      return buildPhysicsQuizPrompt(materialText, knowledgePoints, settings);
    case '化学':
      return buildChemistryQuizPrompt(materialText, knowledgePoints, settings);
    case '英语':
      return buildEnglishQuizPrompt(materialText, knowledgePoints, settings);
    default:
      return buildGeneralQuizPrompt(materialText, knowledgePoints, settings);
  }
};

// ========== 诊断Prompt（保持原有高质量要求） ==========
export const buildDiagnosisPrompt = (
  result: QuizResult,
  questions: QuizQuestion[],
  answers: UserAnswer[],
) => ({
  systemPrompt: baseSystemPrompt,
  userPrompt: `基于测评结果生成错因诊断。只输出 JSON。

输出格式：
{"diagnosis":[{"id":"diag-q1","questionId":"q1","question":"题干","knowledgePointTitle":"知识点","userAnswer":"用户答案","reasonType":"概念混淆","diagnosis":"具体错因（必须引用用户答案和题干）","correctUnderstanding":"正确答案+关键理由","suggestion":"具体下一步动作","missingRubric":["缺失得分点"],"commonMistake":"常见误区","masteryStatus":"薄弱"}]}

字段约束：
- reasonType：概念混淆 | 关键词遗漏 | 应用场景判断错误 | 记忆不牢固 | 表达不完整
- masteryStatus：已掌握 | 待加强 | 薄弱

具体性要求（必须严格遵守）：
1. diagnosis 必须引用用户的实际答案内容，指出具体错在哪一步或哪个概念上，禁止写空话。
2. correctUnderstanding 必须包含：标准答案/结论 + 解析要点 + 资料依据。
3. suggestion 必须包含"下一步做什么"的具体动作，格式为"先做X，再做Y，最后做Z"，例如：
   - "先默写公式 sin²α + cos²α = 1，再重做第3题并写出完整步骤，最后完成2道同类变式"
   - "先回看资料中关于'过拟合'的定义，再写出与'欠拟合'的对比表，最后做3道判断题"
4. missingRubric 必须尽量写全，来自题目的 scoringRubric、solutionSteps 和评分反馈。
5. 禁止写"建议重新复习该知识点"等无具体动作的空话。

测评结果：
${JSON.stringify(result, null, 2)}

题目：
${JSON.stringify(questions, null, 2)}

用户答案：
${JSON.stringify(answers, null, 2)}`,
});

export type DiagnosisPromptPayload = {
  diagnosis: DiagnosisItem[];
};
