import type {
  DiagnosisItem,
  KnowledgePoint,
  LearningReport,
  MaterialInput,
  QuizResult,
  ReinforcementQuestion,
  ReviewPlanDay,
} from '../types';
import { formatFileSize } from '../utils/textClean';
import { inferSubjectType } from './examStrategy';

const fileTypeLabel = {
  txt: 'TXT',
  pdf: 'PDF',
  docx: 'Word .docx',
  pptx: 'PPT .pptx',
  image: '图片',
};

const sourceLabel = {
  sample: '示例资料',
  file: '文件上传',
  text: '文本粘贴',
};

const buildMaterialSourceLines = (material: MaterialInput) => {
  const lines = [`- 输入方式：${sourceLabel[material.sourceType]}`];
  if (material.fileName) lines.push(`- 文件名：${material.fileName}`);
  if (material.fileType) lines.push(`- 文件类型：${fileTypeLabel[material.fileType]}`);
  if (typeof material.fileSize === 'number') lines.push(`- 文件大小：${formatFileSize(material.fileSize)}`);
  if (typeof material.wordCount === 'number') lines.push(`- 提取字数：${material.wordCount}`);
  if (typeof material.pageCount === 'number') lines.push(`- 页数：${material.pageCount}`);
  if (typeof material.slideCount === 'number') lines.push(`- PPT 页数：${material.slideCount}`);
  if (material.sourceType === 'text') lines.push('- 来源说明：用户手动粘贴或编辑的文本内容');
  if (material.sourceType === 'sample') lines.push('- 来源说明：系统内置《人工智能基础概念》示例资料');
  return lines.join('\n');
};

export const generateLearningReport = (params: {
  material: MaterialInput;
  knowledgePoints: KnowledgePoint[];
  result: QuizResult;
  diagnosis: DiagnosisItem[];
  reviewPlan: ReviewPlanDay[];
  reinforcementQuiz: ReinforcementQuestion[];
}): LearningReport => {
  const { material, knowledgePoints, result, diagnosis, reviewPlan, reinforcementQuiz } = params;
  const createdAt = new Date().toLocaleString('zh-CN');
  const subjectType = knowledgePoints[0]?.subjectType || inferSubjectType(material.content);
  const allQuestionsByKp = result.byKnowledgePoint.flatMap((item) => item.knowledgePoint.examPatterns ?? []);
  const patternDistribution = allQuestionsByKp.reduce<Record<string, number>>((acc, pattern) => {
    acc[pattern] = (acc[pattern] ?? 0) + 1;
    return acc;
  }, {});
  const missingRubric = [...new Set(result.wrongQuestions.flatMap((item) => item.missingRubric ?? []))];
  const weakPatterns = [...new Set(result.weakKnowledgePoints.flatMap((item) => item.examPatterns ?? []))];
  const markdown = `# 智学闭环学习报告

生成时间：${createdAt}

## 学习资料

- 标题：${material.title}
- 学科类型：${subjectType}

## 学习资料来源

${buildMaterialSourceLines(material)}

## 提取的知识点

${knowledgePoints.map((item) => `- **${item.title}**（重要程度：${item.importance}）：${item.description}；考查方式：${item.examType}`).join('\n')}

## 测评结果

- 总分：${result.score} 分
- 掌握率：${result.masteryRate}%
- 正确题数：${result.correctCount}
- 错误题数：${result.wrongCount}
- 薄弱知识点：${result.weakKnowledgePoints.map((item) => item.title).join('、') || '暂无明显薄弱点'}
- 薄弱题型：${weakPatterns.join('、') || '暂无明显薄弱题型'}
- 缺失得分点：${missingRubric.join('；') || '暂无明显缺失得分点'}

## 题型分布

${Object.keys(patternDistribution).length > 0 ? Object.entries(patternDistribution).map(([pattern, count]) => `- ${pattern}：${count}`).join('\n') : '- 暂无题型分布数据'}

## 各知识点掌握情况

${result.byKnowledgePoint.map((item) => `- ${item.knowledgePoint.title}：${item.masteryRate}%（${item.correct}/${item.total}）`).join('\n')}

## 错题诊断

${diagnosis.length > 0 ? diagnosis.map((item) => `- **${item.knowledgePointTitle}**：${item.reasonType}。${item.diagnosis} 建议：${item.suggestion}`).join('\n') : '- 本次测评没有明显错题，建议继续做迁移应用练习。'}

## 3 天个性化复习计划

${reviewPlan.map((day) => `### 第 ${day.day} 天
- 目标：${day.goal}
- 重点：${day.focusKnowledgePoints.join('、')}
- 建议时长：${day.duration}
- 推荐练习：${day.practiceCount} 道
- 必背公式/定义：${day.mustRemember?.join('；') || '按知识点清单复习'}
- 例题任务：${day.exampleTasks?.join('；') || '完成基础例题'}
- 强化练习：${day.reinforcementTasks?.join('；') || '完成强化题'}
- 常见误区：${day.commonMistakes?.join('；') || '复盘错题'}
- 自测标准：${day.selfCheckCriteria?.join('；') || '能独立复述并完成同类题'}
- 任务清单：${day.checklist?.map((item) => item.text).join('；') || '完成当天任务'}
- 方法：${day.method}`).join('\n\n')}

## 强化练习建议

${reinforcementQuiz.map((item) => `- **${item.knowledgePointTitle}**（${item.examPattern}）：${item.question}
  - 提示：${item.hint}
  - 标准步骤：${item.solutionSteps.join('；')}
  - 得分点：${item.scoringRubric.join('；')}
  - 常见误区：${item.commonMistake}`).join('\n')}

## 拍照答题说明

- 简答题/解答题支持上传图片或移动端拍照。
- 图片不会永久保存，只在浏览器中预览并提交给配置的视觉模型识别。
- 公式和手写识别依赖支持 vision 的模型；不支持时可继续手动输入答案。
`;

  return {
    title: `${material.title}学习报告`,
    markdown,
    createdAt,
  };
};

export const downloadMarkdown = (report: LearningReport) => {
  const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.title}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadWordReport = async (params: {
  material: MaterialInput;
  knowledgePoints: KnowledgePoint[];
  result: QuizResult;
  diagnosis: DiagnosisItem[];
  reviewPlan: ReviewPlanDay[];
  reinforcementQuiz: ReinforcementQuestion[];
}) => {
  const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import('docx');
  const { material, knowledgePoints, result, diagnosis, reviewPlan, reinforcementQuiz } = params;
  const subjectType = knowledgePoints[0]?.subjectType || inferSubjectType(material.content);
  const title = `${material.title || '学习资料'}学习报告`;
  const tableCell = (text: string) => new TableCell({
    children: [new Paragraph({ children: [new TextRun(String(text || '-'))] })],
  });
  const table = (rows: string[][]) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row) => new TableRow({ children: row.map(tableCell) })),
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: '智学闭环', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph(`生成时间：${new Date().toLocaleString('zh-CN')}`),
          new Paragraph(`学科类型：${subjectType}`),
          new Paragraph({ text: '一、学习资料信息', heading: HeadingLevel.HEADING_2 }),
          table([
            ['资料标题', material.title || '-'],
            ['输入方式', sourceLabel[material.sourceType]],
            ['文件名', material.fileName || '-'],
            ['文件类型', material.fileType ? fileTypeLabel[material.fileType] : '-'],
            ['提取字数', typeof material.wordCount === 'number' ? String(material.wordCount) : '-'],
          ]),
          new Paragraph({ text: '二、测评概览', heading: HeadingLevel.HEADING_2 }),
          table([
            ['总分', `${result.score}`],
            ['掌握率', `${result.masteryRate}%`],
            ['正确题数', `${result.correctCount}`],
            ['错误题数', `${result.wrongCount}`],
          ]),
          new Paragraph({ text: '三、知识点掌握情况', heading: HeadingLevel.HEADING_2 }),
          table([
            ['知识点', '掌握率', '答对/总数'],
            ...result.byKnowledgePoint.map((item) => [item.knowledgePoint.title, `${item.masteryRate}%`, `${item.correct}/${item.total}`]),
          ]),
          new Paragraph({ text: '四、错题诊断表', heading: HeadingLevel.HEADING_2 }),
          table([
            ['知识点', '错因类型', '缺失得分点', '复习建议'],
            ...(diagnosis.length ? diagnosis.map((item) => [
              item.knowledgePointTitle,
              item.reasonType,
              item.missingRubric?.join('；') || '-',
              item.suggestion,
            ]) : [['暂无明显错题', '-', '-', '继续进行迁移训练']]),
          ]),
          new Paragraph({ text: '五、3 天复习计划', heading: HeadingLevel.HEADING_2 }),
          table([
            ['天数', '今日目标', '任务清单', '预计用时'],
            ...reviewPlan.map((day) => [
              `第 ${day.day} 天`,
              day.goal,
              day.checklist?.map((item) => item.text).join('；') || day.method,
              day.duration,
            ]),
          ]),
          new Paragraph({ text: '六、强化训练任务', heading: HeadingLevel.HEADING_2 }),
          table([
            ['薄弱知识点', '题型', '难度', '常见误区'],
            ...reinforcementQuiz.map((item) => [item.knowledgePointTitle, item.examPattern, item.difficulty, item.commonMistake]),
          ]),
          new Paragraph({ text: '七、学习建议', heading: HeadingLevel.HEADING_2 }),
          new Paragraph('建议先复盘缺失得分点，再完成同类变式训练。数学、物理、化学类题目重点检查公式、条件和步骤；语文类题目重点检查语境、规则和材料依据。'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
