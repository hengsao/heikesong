import { Camera, FileText, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ImageAnswer } from '../types';
import { recognizeAnswerFromImage } from '../services/visionAnswerService';
import { parseFileToMaterial } from '../services/fileParser';

interface ImageAnswerUploaderProps {
  questionId: string;
  questionText: string;
  onRecognized: (text: string) => void;
}

export default function ImageAnswerUploader({ questionId, questionText, onRecognized }: ImageAnswerUploaderProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageAnswer, setImageAnswer] = useState<ImageAnswer | null>(null);
  const [fileStatus, setFileStatus] = useState<{ name?: string; status: 'idle' | 'parsing' | 'parsed' | 'failed'; error?: string }>({ status: 'idle' });

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = String(reader.result || '');
      setImageAnswer({ questionId, imageDataUrl, status: 'idle' });
    };
    reader.readAsDataURL(file);
  };

  const recognize = async () => {
    if (!imageAnswer?.imageDataUrl) return;
    setImageAnswer((current) => current ? { ...current, status: 'recognizing', error: undefined } : current);
    try {
      const recognizedText = await recognizeAnswerFromImage(imageAnswer.imageDataUrl, questionText);
      setImageAnswer((current) => current ? { ...current, status: 'recognized', recognizedText } : current);
      onRecognized(recognizedText);
    } catch (error) {
      setImageAnswer((current) => current ? {
        ...current,
        status: 'failed',
        error: error instanceof Error ? error.message : '图片识别失败，请手动输入答案。',
      } : current);
    }
  };

  const handleAnswerFile = async (file?: File) => {
    if (!file) return;
    setFileStatus({ name: file.name, status: 'parsing' });
    try {
      const parsed = await parseFileToMaterial(file);
      setFileStatus({ name: file.name, status: 'parsed' });
      onRecognized(`【答案附件：${file.name}】\n${parsed.content}`);
    } catch (error) {
      setFileStatus({
        name: file.name,
        status: 'failed',
        error: error instanceof Error ? error.message : '答案文件解析失败，请改用图片或手动输入。',
      });
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">手写/公式答案拍照上传</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">适合数学、物理、电路、化学步骤题；识别结果会自动填入文本框，可继续编辑。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
          >
            <ImagePlus className="h-4 w-4" />
            上传/拍照
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
          >
            <FileText className="h-4 w-4" />
            提交文件
          </button>
          {imageAnswer?.imageDataUrl ? (
            <button
              type="button"
              onClick={() => setImageAnswer(null)}
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.docx,.pptx"
        className="sr-only"
        onChange={(event) => void handleAnswerFile(event.target.files?.[0])}
      />

      {fileStatus.status !== 'idle' ? (
        <div className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">
          {fileStatus.status === 'parsing' ? (
            <p className="inline-flex items-center gap-2 text-sky-700"><Loader2 className="h-4 w-4 animate-spin" /> 正在解析答案文件：{fileStatus.name}</p>
          ) : null}
          {fileStatus.status === 'parsed' ? (
            <p className="text-emerald-700">已解析答案文件：{fileStatus.name}，内容已填入答案框，可继续编辑。</p>
          ) : null}
          {fileStatus.status === 'failed' ? (
            <p className="text-amber-800">{fileStatus.error}</p>
          ) : null}
        </div>
      ) : null}

      {imageAnswer?.imageDataUrl ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <img src={imageAnswer.imageDataUrl} alt="答案图片预览" className="max-h-56 w-full rounded-xl border border-slate-200 object-contain bg-white" />
          <div className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">
            <button
              type="button"
              onClick={recognize}
              disabled={imageAnswer.status === 'recognizing'}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {imageAnswer.status === 'recognizing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              AI 识别答案
            </button>
            {imageAnswer.status === 'recognized' ? (
              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-emerald-700">已识别并填入答案框，可继续修改。</p>
            ) : null}
            {imageAnswer.status === 'failed' ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-800">{imageAnswer.error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
