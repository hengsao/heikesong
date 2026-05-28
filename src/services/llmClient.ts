import type { AIProvider, AIStatus } from '../types';

export interface RuntimeAIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** 自定义配置的显示名称 */
  label?: string;
  /** 自定义配置的唯一ID */
  customId?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  modelConfirmed?: string;
}

const STORAGE_KEY = 'zhixue-loop-ai-config';
const CUSTOM_CONFIGS_KEY = 'zhixue-loop-custom-configs';

const providerLabels: Record<AIProvider, string> = {
  mock: 'Mock 演示模式',
  openai: 'OpenAI API 已启用',
  deepseek: 'DeepSeek API 已启用',
  qwen: 'Qwen API 已启用',
  custom: '自定义模型已启用',
};

const defaultProviderConfig: Record<Exclude<AIProvider, 'mock' | 'custom'>, Omit<RuntimeAIConfig, 'provider' | 'apiKey'>> = {
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
  if (value === 'openai' || value === 'deepseek' || value === 'qwen' || value === 'custom') return value;
  return 'mock';
};

// ========== 自定义模型配置管理 ==========

export interface CustomModelConfig {
  id: string;
  label: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  createdAt: number;
}

export const getCustomConfigs = (): CustomModelConfig[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_CONFIGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomModelConfig[];
  } catch {
    return [];
  }
};

export const saveCustomConfig = (config: Omit<CustomModelConfig, 'id' | 'createdAt'>): CustomModelConfig => {
  const configs = getCustomConfigs();
  const newConfig: CustomModelConfig = {
    ...config,
    id: `custom-${Date.now()}`,
    createdAt: Date.now(),
  };
  configs.push(newConfig);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOM_CONFIGS_KEY, JSON.stringify(configs));
  }
  return newConfig;
};

export const deleteCustomConfig = (id: string) => {
  const configs = getCustomConfigs().filter(c => c.id !== id);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOM_CONFIGS_KEY, JSON.stringify(configs));
  }
};

// ========== 运行时配置管理 ==========

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
    const model = typeof parsed.model === 'string' && parsed.model ? parsed.model : '';

    // 自定义模型：只要有 apiKey、model、baseUrl 就接受
    if (provider === 'custom') {
      if (!apiKey || !model || !baseUrl) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return {
        provider,
        apiKey,
        model,
        baseUrl,
        label: typeof parsed.label === 'string' ? parsed.label : undefined,
        customId: typeof parsed.customId === 'string' ? parsed.customId : undefined,
      };
    }

    // 内置模型：需要有效 API Key
    if (!apiKey || apiKey.length < 10) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      provider,
      apiKey,
      model: model || defaultProviderConfig[provider].model,
      baseUrl: baseUrl || defaultProviderConfig[provider].baseUrl,
    };
  } catch {
    return null;
  }
};

const getEnvConfig = (): RuntimeAIConfig | null => {
  const provider = normalizeProvider(import.meta.env.VITE_AI_PROVIDER);
  if (provider === 'mock' || provider === 'custom') return null;
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
  if (provider === 'custom') {
    return { provider: 'custom', apiKey: '', model: '', baseUrl: 'https://api.example.com/v1' };
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

// ========== API 连通性检测 ==========

/**
 * 测试 API 连接是否可用
 * 发送一个简单的测试请求验证：网络连通性、API Key有效性、模型可用性
 */
export const testAPIConnection = async (config: RuntimeAIConfig): Promise<TestConnectionResult> => {
  if (config.provider === 'mock') {
    return { success: true, message: '演示模式无需测试连接' };
  }

  if (!config.apiKey || !config.model || !config.baseUrl) {
    return { success: false, message: '请填写完整的 API Key、模型名称和 Base URL' };
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '');

  try {
    // 使用 chat/completions 端点发送测试请求（OpenAI 兼容格式）
    const testBody = JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: '你好' }],
      max_tokens: 10,
      temperature: 0,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: testBody,
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const err = fetchError as Error;
      if (err.name === 'AbortError') {
        return { success: false, message: '连接超时，请检查 Base URL 是否正确或网络是否连通' };
      }
      return { success: false, message: `网络连接失败：${err.message}。请检查 Base URL 是否正确` };
    }
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'API Key 无效或已过期，请检查后重试' };
    }

    if (response.status === 404) {
      return { success: false, message: `模型 "${config.model}" 不存在或 Base URL 不正确，请检查模型名称` };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg = `请求失败 (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch {}
      return { success: false, message: errorMsg };
    }

    // 验证响应格式
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return { success: false, message: 'API 响应格式异常，可能不是 OpenAI 兼容接口' };
    }

    const modelConfirmed = data?.model || config.model;
    return {
      success: true,
      message: `连接成功，已切换到该模型`,
      modelConfirmed,
    };
  } catch (error) {
    return { success: false, message: `连接测试异常：${(error as Error).message}` };
  }
};

/**
 * 启动时自动检测当前配置的 API 是否可用
 * 不可用则自动降级到演示模式
 */
export const autoDetectAPIOnStartup = async (): Promise<{ status: AIStatus; degraded: boolean }> => {
  const config = getEffectiveAIConfig();
  if (config.provider === 'mock') {
    return { status: { provider: 'mock', modeLabel: providerLabels.mock, isRealAI: false }, degraded: false };
  }

  const result = await testAPIConnection(config);
  if (result.success) {
    const status: AIStatus = {
      provider: config.provider,
      modeLabel: config.label || providerLabels[config.provider],
      isRealAI: true,
    };
    runtimeStatus = status;
    return { status, degraded: false };
  }

  // 降级到演示模式
  clearRuntimeAIConfig();
  const degradedStatus: AIStatus = {
    provider: 'mock',
    modeLabel: '当前API不可用，已进入演示模式',
    isRealAI: false,
  };
  runtimeStatus = degradedStatus;
  return { status: degradedStatus, degraded: true };
};

// ========== AI 状态管理 ==========

const resolveAIStatus = (): AIStatus => {
  const config = getEffectiveAIConfig();
  if (config.provider === 'mock') return { provider: 'mock', modeLabel: providerLabels.mock, isRealAI: false };
  if (!config.apiKey) return { provider: 'mock', modeLabel: 'API 未配置，已回退 Mock', isRealAI: false };
  return {
    provider: config.provider,
    modeLabel: config.label || providerLabels[config.provider],
    isRealAI: true,
  };
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

// ========== LLM 调用 ==========

const LLM_TIMEOUT_MS = 30000; // LLM 请求超时 30 秒

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

const callOpenAI = async (config: RuntimeAIConfig, systemPrompt: string, userPrompt: string, temperature: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: `${systemPrompt}\n\n${userPrompt}`,
        temperature,
        text: { format: { type: 'json_object' } },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OpenAI 请求失败：${response.status} ${await response.text()}`);
    return extractJsonFromText(readOpenAIResponseText(await response.json()));
  } finally {
    clearTimeout(timeoutId);
  }
};

const getProxyUrl = (originalUrl: string): string => {
  const match = originalUrl.match(/^(https?:\/\/[^\/]+)(\/.*)$/);
  if (!match) return originalUrl;
  const [, , path] = match;
  return `/api-proxy${path}`;
};

const callOpenAICompatible = async (config: RuntimeAIConfig, systemPrompt: string, userPrompt: string, temperature: number) => {
  const fullUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const fetchUrl = getProxyUrl(fullUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
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
        temperature,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${config.provider} 请求失败：${response.status} ${await response.text()}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error(`${config.provider} 响应中没有 message.content。`);
    return extractJsonFromText(content);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const callLLMJson = async (
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<unknown | null> => {
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
    // 自定义模型和第三方API使用 OpenAI 兼容格式（/chat/completions）
    // 只有真正的OpenAI官方API才使用/responses端点
    const isOfficialOpenAI = config.provider === 'openai' && config.baseUrl.includes('api.openai.com');
    const temperature = options?.temperature ?? 0.2;
    const result = isOfficialOpenAI
      ? await callOpenAI(config, systemPrompt, userPrompt, temperature)
      : await callOpenAICompatible(config, systemPrompt, userPrompt, temperature);
    runtimeStatus = {
      provider: config.provider,
      modeLabel: config.label || providerLabels[config.provider],
      isRealAI: true,
    };
    return result;
  } catch (error) {
    console.error('[智学闭环] LLM 调用失败，已回退 Mock：', error);
    runtimeStatus = { provider: 'mock', modeLabel: 'API 请求失败，已回退 Mock', isRealAI: false };
    return null;
  }
};
