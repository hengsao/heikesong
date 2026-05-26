const DEMO_TEXT_LIMIT = 30000;

export const cleanExtractedText = (rawText: string): string => {
  const normalized = rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/([。！？!?；;，,、])\1{2,}/g, '$1$1')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !/^\d{1,3}$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length <= DEMO_TEXT_LIMIT) return normalized;
  return `${normalized.slice(0, DEMO_TEXT_LIMIT)}\n\n[系统提示：Demo 模式已截取前 30000 字进行分析]`;
};

export const countWords = (text: string): number => {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
  const alphaWords = text.match(/[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*/g)?.length ?? 0;
  return chineseChars + alphaWords;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
