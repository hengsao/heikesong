import { CheckCircle, KeyRound, Link, Plus, Save, ShieldAlert, Trash2, Wifi, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AIProvider, AIStatus } from '../types';
import {
  clearRuntimeAIConfig,
  deleteCustomConfig,
  getAIStatus,
  getCustomConfigs,
  getDefaultAIConfig,
  getEffectiveAIConfig,
  saveCustomConfig,
  saveRuntimeAIConfig,
  testAPIConnection,
  type CustomModelConfig,
  type RuntimeAIConfig,
  type TestConnectionResult,
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
  { value: 'custom', label: '自定义模型', description: '接入任意 OpenAI 兼容接口，支持所有兼容模型。' },
];

export default function AISettingsPanel({ open, onClose, onStatusChange }: AISettingsPanelProps) {
  const [config, setConfig] = useState<RuntimeAIConfig>(() => getEffectiveAIConfig());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [customConfigs, setCustomConfigs] = useState<CustomModelConfig[]>(() => getCustomConfigs());
  const [customLabel, setCustomLabel] = useState('');

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
    setTestResult(null);
  };

  const updateField = (field: keyof RuntimeAIConfig, value: string) => {
    // 自动去除首尾空格和多余斜杠
    const cleaned = field === 'baseUrl' ? value.trim().replace(/\/+$/, '') : value;
    setConfig((current) => ({ ...current, [field]: cleaned }));
    setSaved(false);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAPIConnection(config);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: '测试过程发生异常' });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    if (config.provider !== 'mock' && !testResult?.success) {
      return; // 必须先测试通过才能保存
    }
    // 保存时再次清理 baseUrl，去除首尾空格和多余斜杠
    const cleanUrl = config.baseUrl.trim().replace(/\/+$/, '');
    const cleanedConfig = { ...config, baseUrl: cleanUrl };
    saveRuntimeAIConfig(cleanedConfig);
    onStatusChange(getAIStatus());
    setSaved(true);
  };

  const resetToMock = () => {
    clearRuntimeAIConfig();
    const next = getDefaultAIConfig('mock');
    setConfig(next);
    onStatusChange(getAIStatus());
    setSaved(true);
    setTestResult(null);
  };

  const handleSaveCustomConfig = () => {
    if (!customLabel.trim() || !config.apiKey || !config.model || !config.baseUrl) return;
    const newConfig = saveCustomConfig({
      label: customLabel.trim(),
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });
    setCustomConfigs(getCustomConfigs());
    setCustomLabel('');
    // 自动切换到新保存的自定义配置
    const runtimeConfig: RuntimeAIConfig = {
      provider: 'custom',
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      label: customLabel.trim(),
      customId: newConfig.id,
    };
    setConfig(runtimeConfig);
    setTestResult(null);
    setSaved(false);
  };

  const handleLoadCustomConfig = (c: CustomModelConfig) => {
    const runtimeConfig: RuntimeAIConfig = {
      provider: 'custom',
      apiKey: c.apiKey,
      model: c.model,
      baseUrl: c.baseUrl,
      label: c.label,
      customId: c.id,
    };
    setConfig(runtimeConfig);
    setTestResult(null);
    setSaved(false);
  };

  const handleDeleteCustomConfig = (id: string) => {
    deleteCustomConfig(id);
    setCustomConfigs(getCustomConfigs());
  };

  const needsKey = config.provider !== 'mock';
  const canSave = config.provider === 'mock' || testResult?.success;

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

              {/* 已保存的自定义模型列表 */}
              {customConfigs.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">已保存的自定义模型</p>
                  {customConfigs.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                      <button
                        type="button"
                        onClick={() => handleLoadCustomConfig(c)}
                        className="flex-1 text-left text-sm font-medium text-slate-700 hover:text-sky-600 truncate"
                      >
                        {c.label}
                      </button>
                      <span className="text-xs text-slate-400 truncate max-w-[120px]">{c.model}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomConfig(c.id)}
                        className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label="删除配置"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {config.provider === 'mock' ? (
                <div className="rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                  当前为 Mock 演示模式，不需要 API Key。保存后系统会继续使用本地规则生成知识点、题目和诊断。
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 自定义模型：显示名称输入 */}
                  {config.provider === 'custom' && (
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">配置名称（用于识别）</span>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          className="focus-ring flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                          placeholder="如：我的 DeepSeek V4"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomConfig}
                          disabled={!customLabel.trim() || !config.apiKey || !config.model || !config.baseUrl}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                          保存
                        </button>
                      </div>
                    </label>
                  )}

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
                      placeholder={config.provider === 'custom' ? '如 gpt-3.5-turbo、deepseek-ai/DeepSeek-V4-Flash' : ''}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Base URL</span>
                    <input
                      value={config.baseUrl}
                      onChange={(event) => updateField('baseUrl', event.target.value)}
                      className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                      placeholder={config.provider === 'custom' ? 'https://api.deepseek.com/v1' : 'https://api.deepseek.com/v1'}
                    />
                  </label>

                  {/* 测试连接按钮 */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing || !config.apiKey || !config.model || !config.baseUrl}
                      className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {testing ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                          正在测试连接...
                        </>
                      ) : (
                        <>
                          <Wifi className="h-4 w-4" />
                          测试连接
                        </>
                      )}
                    </button>

                    {/* 测试结果反馈 */}
                    {testResult && (
                      <div className={`rounded-xl p-4 text-sm leading-6 ${
                        testResult.success
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border border-red-200 bg-red-50 text-red-800'
                      }`}>
                        <div className="flex items-start gap-2">
                          {testResult.success ? (
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          )}
                          <div>
                            <p className="font-semibold">{testResult.success ? '连接成功' : '连接失败'}</p>
                            <p className="mt-1">{testResult.message}</p>
                            {testResult.modelConfirmed && (
                              <p className="mt-1 text-emerald-700">确认模型：{testResult.modelConfirmed}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
              {saved
                ? '配置已保存，下一次生成知识点或题目时生效。'
                : needsKey && !testResult?.success
                  ? '请先点击"测试连接"验证 API 可用性，通过后才能保存。'
                  : needsKey
                    ? '测试已通过，点击保存即可启用。'
                    : '点击保存后继续使用 Mock。'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={resetToMock} className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                切回 Mock
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
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