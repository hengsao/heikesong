import type { AIProvider, AIStatus } from '../types';

export interface RuntimeAIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

const STORAGE_KEY = 'zhixue-loop-ai-config';

const providerLabels: Record<AIProvider, string> = {
  mock: 'Mock 演示模式',
  openai: 'OpenAI API 已启用',
  deepseek: 'DeepSeek API 已启用',
  qwen: 'Qwen API 已启用',
};

const defaultProviderConfig: Record<Exclude<AIProvider, 'mock'>, Omit<RuntimeAIConfig, 'provider' | 'apiKey'>> = {
  openai: {
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini',
    baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  deepseek: {
    model: import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
    baseUrl: import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  },
  qwen: {
    model: import.meta.env.VITE_QWEN_MODEL || 'qwen-plus',
    baseUrl: import.meta.env.VITE_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
};

const normalizeProvider = (value: unknown): AIProvider => {
  if (value === 'openai' || value === 'deepseek' || value === 'qwen') return value;
  return 'mock';
};

const readStoredConfig = (): RuntimeAIConfig | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RuntimeAIConfig>;
    const provider = normalizeProvider(parsed.provider);
    if (provider === 'mock') return null;
    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
    const baseUrl = typeof parsed.baseUrl === 'string' && parsed.baseUrl ? parsed.baseUrl : '';
    // 自动清除无效配置，回退到 .env
    if (baseUrl.includes('monkeyapi') || baseUrl.includes('apimonkey') || baseUrl.includes('api.openai.com') || !apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      provider,
      apiKey,
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : defaultProviderConfig[provider].model,
      baseUrl: baseUrl || defaultProviderConfig[provider].baseUrl,
    };
  } catch {
    return null;
  }
};

const getEnvConfig = (): RuntimeAIConfig | null => {
  const provider = normalizeProvider(import.meta.env.VITE_AI_PROVIDER);
  if (provider === 'mock') return null;
  const config = {
    openai: {
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      model: import.meta.env.VITE_OPENAI_MODEL || defaultProviderConfig.openai.model,
      baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || defaultProviderConfig.openai.baseUrl,
    },
    deepseek: {
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
      model: import.meta.env.VITE_DEEPSEEK_MODEL || defaultProviderConfig.deepseek.model,
      baseUrl: import.meta.env.VITE_DEEPSEEK_BASE_URL || defaultProviderConfig.deepseek.baseUrl,
    },
    qwen: {
      apiKey: import.meta.env.VITE_QWEN_API_KEY || '',
      model: import.meta.env.VITE_QWEN_MODEL || defaultProviderConfig.qwen.model,
      baseUrl: import.meta.env.VITE_QWEN_BASE_URL || defaultProviderConfig.qwen.baseUrl,
    },
  }[provider];
  return { provider, ...config };
};

export const getDefaultAIConfig = (provider: AIProvider): RuntimeAIConfig => {
  if (provider === 'mock') {
    return { provider: 'mock', apiKey: '', model: '', baseUrl: '' };
  }
  const hardcoded = defaultProviderConfig[provider];
  const envModel = (import.meta.env as Record<string, string | undefined>)[`VITE_${provider.toUpperCase()}_MODEL`];
  const envBaseUrl = (import.meta.env as Record<string, string | undefined>)[`VITE_${provider.toUpperCase()}_BASE_URL`];
  return {
    provider,
    apiKey: '',
    model: envModel || hardcoded.model,
    baseUrl: envBaseUrl || hardcoded.baseUrl,
  };
};

export const getEffectiveAIConfig = (): RuntimeAIConfig => {
  const stored = readStoredConfig();
  if (stored) return stored;
  const envConfig = getEnvConfig();
  if (envConfig) return envConfig;
  return getDefaultAIConfig('mock');
};

export const saveRuntimeAIConfig = (config: RuntimeAIConfig) => {
  if (typeof window === 'undefined') return;
  if (config.provider === 'mock') {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
  runtimeStatus = resolveAIStatus();
};

export const clearRuntimeAIConfig = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  runtimeStatus = resolveAIStatus();
};

export const getConfiguredProvider = (): AIProvider => getEffectiveAIConfig().provider;

const resolveAIStatus = (): AIStatus => {
  const config = getEffectiveAIConfig();
  if (config.provider === 'mock') return { provider: 'mock', modeLabel: providerLabels.mock, isRealAI: false };
  if (!config.apiKey) return { provider: 'mock', modeLabel: 'API 未配置，已回退 Mock', isRealAI: false };
  return { provider: config.provider, modeLabel: providerLabels[config.provider], isRealAI: true };
};

let runtimeStatus: AIStatus = resolveAIStatus();

export const getAIStatus = (): AIStatus => {
  runtimeStatus = resolveAIStatus();
  return runtimeStatus;
};

export const hasRealAIConfig = () => {
  const config = getEffectiveAIConfig();
  return config.provider !== 'mock' && Boolean(config.apiKey);
};

const extractJsonFromText = (text: string): unknown => {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM 响应不是合法 JSON。');
    return JSON.parse(match[0]);
  }
};

const readOpenAIResponseText = (data: unknown): string => {
  const record = data as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  const parts: string[] = [];
  output.forEach((item) => {
    const content = Array.isArray((item as Record<string, unknown>).content) ? ((item as Record<string, unknown>).content as unknown[]) : [];
    content.forEach((part) => {
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string') parts.push(text);
    });
  });
  if (parts.length > 0) return parts.join('\n');
  throw new Error('OpenAI 响应中没有可读取文本。');
};

const callOpenAI = async (config: RuntimeAIConfig, systemPrompt: string, userPrompt: string) => {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: `${systemPrompt}\n\n${userPrompt}`,
      temperature: 0.2,
      text: { format: { type: 'json_object' } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI 请求失败：${response.status} ${await response.text()}`);
  return extractJsonFromText(readOpenAIResponseText(await response.json()));
};

const getProxyUrl = (originalUrl: string): string => {
  // 将外部API请求通过Vite代理转发，避免CORS问题
  const match = originalUrl.match(/^(https?:\/\/[^\/]+)(\/.*)$/);
  if (!match) return originalUrl;
  const [, , path] = match;
  return `/api-proxy${path}`;
};

const callOpenAICompatible = async (config: RuntimeAIConfig, systemPrompt: string, userPrompt: string) => {
  const fullUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const fetchUrl = getProxyUrl(fullUrl);
  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`${config.provider} 请求失败：${response.status} ${await response.text()}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error(`${config.provider} 响应中没有 message.content。`);
  return extractJsonFromText(content);
};

export const callLLMJson = async (systemPrompt: string, userPrompt: string): Promise<unknown | null> => {
  const config = getEffectiveAIConfig();
  if (config.provider === 'mock') {
    runtimeStatus = { provider: 'mock', modeLabel: providerLabels.mock, isRealAI: false };
    return null;
  }
  if (!config.apiKey) {
    runtimeStatus = { provider: 'mock', modeLabel: 'API 未配置，已回退 Mock', isRealAI: false };
    return null;
  }

  try {
    // 猴山API等第三方API使用OpenAI兼容格式（/chat/completions）
    // 只有真正的OpenAI官方API才使用/responses端点
    const isOfficialOpenAI = config.baseUrl.includes('api.openai.com');
    const result = isOfficialOpenAI 
      ? await callOpenAI(config, systemPrompt, userPrompt) 
      : await callOpenAICompatible(config, systemPrompt, userPrompt);
    runtimeStatus = { provider: config.provider, modeLabel: providerLabels[config.provider], isRealAI: true };
    return result;
  } catch (error) {
    console.error('[智学闭环] LLM 调用失败，已回退 Mock：', error);
    runtimeStatus = { provider: 'mock', modeLabel: 'API 请求失败，已回退 Mock', isRealAI: false };
    return null;
  }
};
