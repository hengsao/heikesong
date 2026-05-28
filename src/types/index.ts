export type Importance = '高' | '中' | '低';
export type Difficulty = '简单' | '中等' | '较难';
export type QuestionType = 'single' | 'judge' | 'fill' | 'short' | 'solution' | 'material';
export type MaterialFileType = 'txt' | 'pdf' | 'docx' | 'pptx' | 'image';
export type ContentType = 'material' | 'exam';
export type AIProvider = 'mock' | 'openai' | 'deepseek' | 'qwen' | 'custom';
export type SubjectType =
  | '语文'
  | '数学'
  | '英语'
  | '物理'
  | '化学'
  | '生物'
  | '政治'
  | '历史'
  | '地理'
  | '高等数学'
  | '线性代数'
  | '概率统计'
  | '大学物理'
  | '电路'
  | '计算机'
  | '程序设计'
  | '数据结构'
  | '操作系统'
  | '计算机网络'
  | '数据库'
  | '经济学'
  | '管理学'
  | '会计学'
  | '法学'
  | '医学'
  | '护理学'
  | '机械'
  | '哲学'
  | '文学'
  | '历史学'
  | '理学'
  | '工学'
  | '农学'
  | '艺术学'
  | '交叉学科'
  | '通用';
export type ExamQuestionPattern =
  | '基础概念题'
  | '公式套用题'
  | '条件辨析题'
  | '易错判断题'
  | '材料分析题'
  | '变式迁移题'
  | '综合解答题';
export type ExamType =
  | '自动识别'
  | '小测'
  | '单元测验'
  | '周测'
  | '月考'
  | '期中'
  | '期末'
  | '期中期末'
  | '一模'
  | '二模'
  | '三模'
  | '中考'
  | '高考'
  | '高职高考'
  | '专升本'
  | '考研'
  | '大学课程考试'
  | '考证'
  | '竞赛'
  | '自定义';
export type TrainingMode = '基础巩固' | '错题强化' | '考前冲刺' | '变式训练' | '母题改编';
export type AppStep =
  | 'home'
  | 'material'
  | 'knowledge'
  | 'quiz'
  | 'taking'
  | 'result'
  | 'diagnosis'
  | 'plan'
  | 'reinforcement'
  | 'report';

export interface MaterialInput {
  title: string;
  content: string;
  sourceType: 'text' | 'file' | 'sample';
  fileType?: MaterialFileType;
  fileName?: string;
  fileSize?: number;
  wordCount?: number;
  pageCount?: number;
  slideCount?: number;
  imageDataUrl?: string;
}

export interface QuizSettings {
  subjectType: SubjectType | '自动识别';
  examType: ExamType;
  customExamType?: string;
  questionCount: 5 | 10 | 15;
  difficultyRatio: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypes: QuestionType[];
  trainingMode: TrainingMode;
}

export interface KnowledgePoint {
  id: string;
  title: string;
  description: string;
  importance: Importance;
  masteryTarget: string;
  examType: string;
  sourceEvidence?: string;
  keywords?: string[];
  subjectType?: SubjectType;
  examPatterns?: ExamQuestionPattern[];
  formulas?: string[];
  commonMistakes?: string[];
  keyMethods?: string[];
}

// 考点卡 - 把资料变成可命题结构
export interface KnowledgeCard {
  id: string;
  title: string;
  subject: SubjectType;
  coreMeaning: string;
  formulas?: string[];
  rules?: string[];
  conditions?: string[];
  examMethods: ExamQuestionPattern[];
  commonMistakes: string[];
  sourceEvidence: string;
}

// 命题蓝图 - 说明考什么、怎么考
export interface QuestionBlueprint {
  id: string;
  knowledgeCardId: string;
  knowledgePoint: string;
  examPattern: ExamQuestionPattern;
  difficulty: Difficulty;
  targetAbility: string;
  requiredMethods: string[];
  commonWrongMethods: string[];
  scoringPoints: string[];
  sourceEvidence: string;
}

// 题目质量审查
export interface QuestionQualityReview {
  questionId: string;
  score: number;
  problems: string[];
  suggestions: string[];
  passed: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  knowledgePointId: string;
  difficulty: Difficulty;
  sourceEvidence?: string;
  qualityScore: number;
  examPattern?: ExamQuestionPattern;
  scoringRubric?: string[];
  solutionSteps?: string[];
  optionExplanations?: Record<string, string>;
  commonMistake?: string;
  learningObjective?: string;
  answerInputMode?: 'text' | 'image' | 'both';
  recommendedVariant?: string;
  blueprintId?: string;
  targetAbility?: string;
  requiredMethods?: string[];
  commonWrongMethods?: string[];
  qualityReview?: QuestionQualityReview;
  isLowQuality?: boolean;
}

export interface AIStatus {
  provider: AIProvider;
  modeLabel: string;
  isRealAI: boolean;
}

export interface UserAnswer {
  questionId: string;
  answer: string;
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  userAnswer: string;
  matchedKeywords?: string[];
  matchedRubric?: string[];
  missingRubric?: string[];
  feedback?: string;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  masteryRate: number;
  weakKnowledgePoints: KnowledgePoint[];
  wrongQuestions: QuestionResult[];
  byKnowledgePoint: Array<{
    knowledgePoint: KnowledgePoint;
    correct: number;
    total: number;
    masteryRate: number;
  }>;
}

export interface DiagnosisItem {
  id: string;
  questionId: string;
  question: string;
  knowledgePointTitle: string;
  userAnswer?: string;
  reasonType: '概念混淆' | '关键词遗漏' | '应用场景判断错误' | '记忆不牢固' | '表达不完整';
  diagnosis: string;
  correctUnderstanding: string;
  suggestion: string;
  missingRubric?: string[];
  commonMistake?: string;
  masteryStatus?: '已掌握' | '待加强' | '薄弱';
}

export interface ReviewPlanDay {
  day: number;
  goal: string;
  focusKnowledgePoints: string[];
  duration: string;
  practiceCount: number;
  method: string;
  mustRemember?: string[];
  exampleTasks?: string[];
  reinforcementTasks?: string[];
  commonMistakes?: string[];
  selfCheckCriteria?: string[];
  checklist?: Array<{ id: string; text: string; done: boolean }>;
}

export interface ReinforcementQuestion {
  id: string;
  knowledgePointTitle: string;
  examPattern: ExamQuestionPattern;
  question: string;
  hint: string;
  answer: string;
  explanation?: string;
  solutionSteps: string[];
  scoringRubric: string[];
  commonMistake: string;
  sourceQuestionId?: string;
  sourceEvidence?: string;
  difficulty: Difficulty;
}

export interface ImageAnswer {
  questionId: string;
  imageDataUrl: string;
  recognizedText?: string;
  status: 'idle' | 'recognizing' | 'recognized' | 'failed';
  error?: string;
}

export interface LearningReport {
  title: string;
  markdown: string;
  createdAt: string;
}
