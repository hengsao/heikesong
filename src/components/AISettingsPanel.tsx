import { KeyRound, Save, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AIProvider, AIStatus } from '../types';
import {
  clearRuntimeAIConfig,
  getAIStatus,
  getDefaultAIConfig,
  getEffectiveAIConfig,
  saveRuntimeAIConfig,
  type RuntimeAIConfig,
} from '../services/llmClient';

interface AISettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onStatusChange: (status: AIStatus) => void;
}

const providers: Array<{ value: AIProvider; label: string; description: string }> = [
  { value: 'mock', label: 'Mock 演示模式', description: '不调用外部接口，适合离线路演。' },
  { value: 'openai', label: 'OpenAI', description: '使用 Responses API。' },
  { value: 'deepseek', label: 'DeepSeek', description: '使用 OpenAI-compatible Chat Completions。' },
  { value: 'qwen', label: '通义千问 Qwen', description: '使用 DashScope 兼容模式。' },
];

export default function AISettingsPanel({ open, onClose, onStatusChange }: AISettingsPanelProps) {
  const [config, setConfig] = useState<RuntimeAIConfig>(() => getEffectiveAIConfig());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const updateProvider = (provider: AIProvider) => {
    const defaults = getDefaultAIConfig(provider);
    setConfig((current) => ({
      ...defaults,
      apiKey: provider === current.provider ? current.apiKey : '',
    }));
    setSaved(false);
  };

  const updateField = (field: keyof RuntimeAIConfig, value: string) => {
    setConfig((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const save = () => {
    saveRuntimeAIConfig(config);
    onStatusChange(getAIStatus());
    setSaved(true);
  };

  const resetToMock = () => {
    clearRuntimeAIConfig();
    const next = getDefaultAIConfig('mock');
    setConfig(next);
    onStatusChange(getAIStatus());
    setSaved(true);
  };

  const needsKey = config.provider !== 'mock';

  const modal = (
    <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-[min(96vw,960px)] max-w-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                <KeyRound className="h-4 w-4" />
                接入真实 AI
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">选择模型服务商</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                配置后，知识点提取、生成题目和错因诊断会优先调用真实大模型；失败时自动回退 Mock。
              </p>
            </div>
            <button onClick={onClose} className="focus-ring shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="关闭 AI 设置">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="min-w-0 space-y-2">
              {providers.map((provider) => {
                const active = config.provider === provider.value;
                return (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => updateProvider(provider.value)}
                    className={`focus-ring w-full rounded-xl border p-4 text-left transition ${
                      active ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-semibold text-slate-950">{provider.label}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{provider.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {config.provider === 'mock' ? (
                <div className="rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                  当前为 Mock 演示模式，不需要 API Key。保存后系统会继续使用本地规则生成知识点、题目和诊断。
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">API Key</span>
                    <input
                      value={config.apiKey}
                      onChange={(event) => updateField('apiKey', event.target.value)}
                      type="password"
                      className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                      placeholder="请输入服务商 API Key"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">模型名称</span>
                    <input
                      value={config.model}
                      onChange={(event) => updateField('model', event.target.value)}
                      className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Base URL</span>
                    <input
                      value={config.baseUrl}
                      onChange={(event) => updateField('baseUrl', event.target.value)}
                      className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                前端输入的 API Key 会保存在当前浏览器 localStorage，仅适合本地比赛 Demo；正式上线必须改为后端代理保护密钥。
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              {saved ? '配置已保存，下一次生成知识点或题目时生效。' : needsKey ? '填写 API Key 后点击保存即可启用。' : '点击保存后继续使用 Mock。'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={resetToMock} className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                切回 Mock
              </button>
              <button onClick={save} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700">
                <Save className="h-4 w-4" />
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
