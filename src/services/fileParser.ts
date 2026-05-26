import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import type { MaterialFileType } from '../types';
import { cleanExtractedText, countWords } from '../utils/textClean';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ParsedMaterialFile {
  title: string;
  content: string;
  sourceType: 'file';
  fileType: MaterialFileType;
  meta: {
    fileName: string;
    fileSize: number;
    wordCount: number;
    pageCount?: number;
    slideCount?: number;
  };
}

interface PdfTextItem {
  str: string;
}

const titleFromFileName = (fileName: string) => fileName.replace(/\.(txt|pdf|docx|pptx)$/i, '');

const getFileType = (file: File): MaterialFileType => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.txt')) return 'txt';
  if (lowerName.endsWith('.pdf')) return 'pdf';
  if (lowerName.endsWith('.docx')) return 'docx';
  if (lowerName.endsWith('.pptx')) return 'pptx';
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.ppt')) {
    throw new Error('当前支持 .txt / .pdf / .docx / .pptx；暂不支持 .doc / .ppt。');
  }
  throw new Error('当前支持 .txt / .pdf / .docx / .pptx；暂不支持该文件类型。');
};

const ensureContent = (content: string, message: string) => {
  if (!content.trim()) throw new Error(message);
};

const parseTxt = async (file: File) => cleanExtractedText(await file.text());

const parsePdf = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as PdfTextItem).str : ''))
      .join(' ')
      .trim();
    if (pageText) pages.push(`第 ${pageNumber} 页：\n${pageText}`);
  }

  const content = cleanExtractedText(pages.join('\n\n'));
  ensureContent(content, 'PDF 未提取到可用文字，可能是扫描版 PDF，当前 Demo 暂不支持 OCR。');
  return { content, pageCount: pdf.numPages };
};

const parseDocx = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const content = cleanExtractedText(result.value);
  ensureContent(content, 'Word 文档未提取到可用文字，请尝试复制内容后粘贴到文本框。');
  return content;
};

const decodeXmlText = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const parsePptx = async (file: File) => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => {
      const aNumber = Number(a.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const bNumber = Number(b.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return aNumber - bNumber;
    });

  const slides: string[] = [];
  for (const [index, path] of slideFiles.entries()) {
    const xml = await zip.files[path].async('text');
    const texts = [...xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)]
      .map((match) => decodeXmlText(match[1]).trim())
      .filter(Boolean);
    if (texts.length > 0) slides.push(`第 ${index + 1} 页：\n${texts.join('\n')}`);
  }

  const content = cleanExtractedText(slides.join('\n\n'));
  ensureContent(content, 'PPTX 未提取到可用文字，请确认课件中包含可编辑文本。');
  return { content, slideCount: slideFiles.length };
};

export const parseFileToMaterial = async (file: File): Promise<ParsedMaterialFile> => {
  const fileType = getFileType(file);
  let content = '';
  let pageCount: number | undefined;
  let slideCount: number | undefined;

  if (fileType === 'txt') content = await parseTxt(file);
  if (fileType === 'pdf') {
    const parsed = await parsePdf(file);
    content = parsed.content;
    pageCount = parsed.pageCount;
  }
  if (fileType === 'docx') content = await parseDocx(file);
  if (fileType === 'pptx') {
    const parsed = await parsePptx(file);
    content = parsed.content;
    slideCount = parsed.slideCount;
  }

  ensureContent(content, '未提取到可用文字，请更换文件或复制内容后粘贴。');

  return {
    title: titleFromFileName(file.name),
    content,
    sourceType: 'file',
    fileType,
    meta: {
      fileName: file.name,
      fileSize: file.size,
      wordCount: countWords(content),
      pageCount,
      slideCount,
    },
  };
};
