/**
 * Real AI Service - Unified interface for multiple AI providers
 * Supports: DeepSeek, Zhipu, DMXAPI (OpenAI/Anthropic/Google/etc.)
 * Calls Supabase Edge Function to proxy requests (secure API keys)
 */

import { supabase } from '@/lib/supabase';

export type AIProvider = 'deepseek' | 'zhipu' | 'moonshot' | 'kimi' | 'dmxapi' | 'openai' | 'anthropic' | 'google';

export interface AIConfig {
    provider: AIProvider;
    model: string;
    apiKey?: string; // Optional: use stored key
    baseUrl?: string; // For DMXAPI custom endpoint
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const MAX_CONTENT_LENGTH = 10_000;

async function getAuthHeaders(): Promise<Record<string, string>> {
    let { data: { session } } = await supabase.auth.getSession();
    // Refresh token if expired or expiring within 60 seconds
    if (!session?.access_token || (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000)) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
    }
    if (!session?.access_token) {
        throw new Error('未登录，请重新登录后再试');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
    };
}

function validateMessages(messages: ChatMessage[]): void {
    for (const msg of messages) {
        if (msg.content.length > MAX_CONTENT_LENGTH) {
            throw new Error(`消息过长（${msg.content.length} 字符），最多允许 ${MAX_CONTENT_LENGTH} 个字符`);
        }
    }
}

/**
 * Stream chat completion from AI
 * Returns an async generator that yields content chunks
 */
export async function* streamChat(
    messages: ChatMessage[],
    config: AIConfig,
    systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
    const fullMessages: ChatMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

    validateMessages(fullMessages);

    const headers = await getAuthHeaders();
    const response = await fetch(`${EDGE_FUNCTION_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            messages: fullMessages,
            provider: config.provider,
            model: config.model,
            stream: true,
            api_key: config.apiKey,
            base_url: config.baseUrl,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service Error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        yield content;
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }
    }
}

/**
 * Compare multiple AI models - send same prompt to multiple models
 * Returns array of { model: string, response: string, error?: string }
 */
export async function compareAIModels(
    messages: ChatMessage[],
    configs: AIConfig[],
    systemPrompt?: string
): Promise<{ model: string; response: string; error?: string }[]> {
    const fullMessages: ChatMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

    validateMessages(fullMessages);

    const headers = await getAuthHeaders();

    const results = await Promise.allSettled(
        configs.map(async (config) => {
            const response = await fetch(`${EDGE_FUNCTION_URL}/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: fullMessages,
                    provider: config.provider,
                    model: config.model,
                    stream: false,
                    api_key: config.apiKey,
                    base_url: config.baseUrl,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            const data = await response.json();
            return {
                model: config.model,
                response: data.choices?.[0]?.message?.content || '',
            };
        })
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return {
            model: configs[index].model,
            response: '',
            error: (result.reason as Error)?.message || 'Unknown error',
        };
    });
}

/**
 * Non-streaming chat completion
 */
export async function chat(
    messages: ChatMessage[],
    config: AIConfig,
    systemPrompt?: string
): Promise<string> {
    const fullMessages: ChatMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

    validateMessages(fullMessages);

    const headers = await getAuthHeaders();
    const response = await fetch(`${EDGE_FUNCTION_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            messages: fullMessages,
            provider: config.provider,
            model: config.model,
            stream: false
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * Available AI Models Configuration
 * - DMXAPI: ChatGPT + Claude via https://www.dmxapi.cn/v1
 * - Google: Gemini via official https://generativelanguage.googleapis.com
 * - DeepSeek: direct https://api.deepseek.com
 * - Zhipu: direct https://open.bigmodel.cn
 * - Moonshot/Kimi: direct https://api.moonshot.cn
 */
export const AI_MODELS: Record<string, { id: string; name: string; provider: AIProvider; model: string; description: string; category: 'free' | 'premium'; color: string }> = {
    // === ChatGPT via DMXAPI ===
    'gpt-5.4': {
        id: 'gpt-5.4',
        name: 'ChatGPT 5.4',
        provider: 'dmxapi',
        model: 'gpt-5.4',
        description: 'OpenAI 最新旗舰模型',
        category: 'premium',
        color: 'bg-emerald-600',
    },
    'gpt-5.3-chat': {
        id: 'gpt-5.3-chat',
        name: 'ChatGPT 5.3',
        provider: 'dmxapi',
        model: 'gpt-5.3-chat',
        description: 'OpenAI 高性能对话模型',
        category: 'premium',
        color: 'bg-emerald-500',
    },
    // === Claude via DMXAPI ===
    'claude-sonnet-4-6': {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        provider: 'dmxapi',
        model: 'claude-sonnet-4-6',
        description: 'Anthropic 最新 Sonnet 模型',
        category: 'premium',
        color: 'bg-amber-600',
    },
    'claude-sonnet-4-6-thinking': {
        id: 'claude-sonnet-4-6-thinking',
        name: 'Claude Sonnet 4.6 Thinking',
        provider: 'dmxapi',
        model: 'claude-sonnet-4-6-thinking',
        description: 'Claude Sonnet 4.6 扩展思考版',
        category: 'premium',
        color: 'bg-amber-500',
    },
    'claude-opus-4-6': {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        provider: 'dmxapi',
        model: 'claude-opus-4-6',
        description: 'Anthropic 最新 Opus 旗舰',
        category: 'premium',
        color: 'bg-orange-600',
    },
    'claude-opus-4-6-thinking': {
        id: 'claude-opus-4-6-thinking',
        name: 'Claude Opus 4.6 Thinking',
        provider: 'dmxapi',
        model: 'claude-opus-4-6-thinking',
        description: 'Claude Opus 4.6 扩展思考版',
        category: 'premium',
        color: 'bg-orange-500',
    },
    'claude-opus-4-5-20251101': {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        provider: 'dmxapi',
        model: 'claude-opus-4-5-20251101',
        description: 'Claude Opus 4.5 (Nov 2025)',
        category: 'premium',
        color: 'bg-amber-700',
    },
    'claude-opus-4-5-20251101-thinking': {
        id: 'claude-opus-4-5-20251101-thinking',
        name: 'Claude Opus 4.5 Thinking',
        provider: 'dmxapi',
        model: 'claude-opus-4-5-20251101-thinking',
        description: 'Claude Opus 4.5 扩展思考版',
        category: 'premium',
        color: 'bg-amber-600',
    },
    'claude-sonnet-4-5-20250929': {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        provider: 'dmxapi',
        model: 'claude-sonnet-4-5-20250929',
        description: 'Claude Sonnet 4.5 (Sep 2025)',
        category: 'premium',
        color: 'bg-amber-500',
    },
    'claude-sonnet-4-5-20250929-thinking': {
        id: 'claude-sonnet-4-5-20250929-thinking',
        name: 'Claude Sonnet 4.5 Thinking',
        provider: 'dmxapi',
        model: 'claude-sonnet-4-5-20250929-thinking',
        description: 'Claude Sonnet 4.5 扩展思考版',
        category: 'premium',
        color: 'bg-amber-400',
    },
    // === Google Gemini — official API ===
    'gemini-2.5-pro': {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        model: 'gemini-2.5-pro',
        description: 'Google 旗舰推理模型',
        category: 'premium',
        color: 'bg-blue-600',
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        model: 'gemini-2.5-flash',
        description: 'Google 快速高效模型',
        category: 'premium',
        color: 'bg-blue-500',
    },
    'gemini-2.0-flash': {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        model: 'gemini-2.0-flash',
        description: 'Google 超快多模态模型',
        category: 'free',
        color: 'bg-blue-400',
    },
    'gemini-1.5-pro': {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        model: 'gemini-1.5-pro',
        description: 'Google 长上下文专家',
        category: 'premium',
        color: 'bg-sky-600',
    },
    'gemini-1.5-flash': {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        model: 'gemini-1.5-flash',
        description: 'Google 高速轻量模型',
        category: 'free',
        color: 'bg-sky-500',
    },
    // === DeepSeek — direct API ===
    'deepseek-chat': {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'deepseek',
        model: 'deepseek-chat',
        description: '深度求索对话模型',
        category: 'free',
        color: 'bg-sky-500',
    },
    'deepseek-reasoner': {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        provider: 'deepseek',
        model: 'deepseek-reasoner',
        description: '深度求索推理模型',
        category: 'free',
        color: 'bg-sky-600',
    },
    // === 智谱 GLM — direct API ===
    'glm-4-flash': {
        id: 'glm-4-flash',
        name: 'GLM-4 Flash',
        provider: 'zhipu',
        model: 'glm-4-flash',
        description: '智谱极速免费模型',
        category: 'free',
        color: 'bg-teal-500',
    },
    'glm-4-air': {
        id: 'glm-4-air',
        name: 'GLM-4 Air',
        provider: 'zhipu',
        model: 'glm-4-air',
        description: '智谱均衡版',
        category: 'free',
        color: 'bg-teal-500',
    },
    'glm-4-plus': {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        provider: 'zhipu',
        model: 'glm-4-plus',
        description: '智谱 AI 增强版',
        category: 'premium',
        color: 'bg-teal-600',
    },
    'glm-4.7': {
        id: 'glm-4.7',
        name: 'GLM-4.7',
        provider: 'zhipu',
        model: 'glm-4.7',
        description: '智谱新一代旗舰',
        category: 'premium',
        color: 'bg-teal-600',
    },
    'glm-z1-flash': {
        id: 'glm-z1-flash',
        name: 'GLM-Z1 Flash',
        provider: 'zhipu',
        model: 'glm-z1-flash',
        description: '智谱推理模型（快）',
        category: 'free',
        color: 'bg-teal-400',
    },
    'glm-z1': {
        id: 'glm-z1',
        name: 'GLM-Z1',
        provider: 'zhipu',
        model: 'glm-z1',
        description: '智谱深度推理',
        category: 'premium',
        color: 'bg-teal-700',
    },
    'glm-5': {
        id: 'glm-5',
        name: 'GLM-5',
        provider: 'zhipu',
        model: 'glm-5',
        description: '智谱第五代旗舰',
        category: 'premium',
        color: 'bg-teal-700',
    },
    // === Kimi / Moonshot — direct API ===
    'moonshot-v1-8k': {
        id: 'moonshot-v1-8k',
        name: 'Kimi 8K',
        provider: 'moonshot',
        model: 'moonshot-v1-8k',
        description: 'Kimi 标准上下文',
        category: 'free',
        color: 'bg-violet-400',
    },
    'moonshot-v1-32k': {
        id: 'moonshot-v1-32k',
        name: 'Kimi 32K',
        provider: 'moonshot',
        model: 'moonshot-v1-32k',
        description: 'Kimi 长文本理解',
        category: 'free',
        color: 'bg-violet-500',
    },
    'moonshot-v1-128k': {
        id: 'moonshot-v1-128k',
        name: 'Kimi 128K',
        provider: 'moonshot',
        model: 'moonshot-v1-128k',
        description: 'Kimi 超长上下文',
        category: 'premium',
        color: 'bg-violet-600',
    },
    'kimi-latest': {
        id: 'kimi-latest',
        name: 'Kimi Latest',
        provider: 'moonshot',
        model: 'kimi-latest',
        description: 'Kimi 最新版本',
        category: 'premium',
        color: 'bg-violet-600',
    },
};

/**
 * Default AI configurations (legacy compatibility)
 */
export const AI_CONFIGS = {
    deepseekChat: {
        provider: 'deepseek' as AIProvider,
        model: 'deepseek-chat'
    },
    deepseekReasoner: {
        provider: 'deepseek' as AIProvider,
        model: 'deepseek-reasoner'
    },
    zhipuGLM4: {
        provider: 'zhipu' as AIProvider,
        model: 'glm-4-flash'
    },
    claudeSonnet: {
        provider: 'dmxapi' as AIProvider,
        model: 'claude-sonnet-4-6'
    },
    geminiFlash: {
        provider: 'google' as AIProvider,
        model: 'gemini-2.0-flash'
    },
    chatGPT: {
        provider: 'dmxapi' as AIProvider,
        model: 'gpt-5.4'
    },
};

/**
 * Model categories for better organization
 */
export const MODEL_CATEGORIES = {
    openai: {
        name: 'ChatGPT (via DMXAPI)',
        models: ['gpt-5.4', 'gpt-5.3-chat'],
        color: 'bg-emerald-500',
    },
    anthropic: {
        name: 'Claude (via DMXAPI)',
        models: ['claude-sonnet-4-6', 'claude-sonnet-4-6-thinking', 'claude-opus-4-6', 'claude-opus-4-6-thinking', 'claude-opus-4-5-20251101', 'claude-opus-4-5-20251101-thinking', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-5-20250929-thinking'],
        color: 'bg-amber-500',
    },
    google: {
        name: 'Gemini (官方 API)',
        models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        color: 'bg-blue-500',
    },
    deepseek: {
        name: 'DeepSeek (直连)',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        color: 'bg-sky-500',
    },
    zhipu: {
        name: 'GLM · 智谱 (直连)',
        models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus', 'glm-4.7', 'glm-z1-flash', 'glm-z1', 'glm-5'],
        color: 'bg-teal-500',
    },
    moonshot: {
        name: 'Kimi (直连)',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-latest'],
        color: 'bg-violet-500',
    },
};

/**
 * Recommended models for comparison
 */
export const COMPARE_RECOMMENDATIONS = [
    ['deepseek-chat', 'claude-sonnet-4-6', 'gemini-2.0-flash'], // Fast & Balanced
    ['claude-opus-4-6', 'gpt-5.4', 'gemini-2.5-pro'], // Premium
    ['deepseek-reasoner', 'claude-opus-4-6-thinking', 'glm-z1'], // Reasoning
];

/**
 * Default system prompts for academic tutor
 */
export const SYSTEM_PROMPTS = {
    /**
     * 苏格拉底式学术研究辅导系统提示词
     *
     * 核心理念：保护学生的 epistemic agency（认知主体性）
     * 通过引导性追问帮助学生形成独立判断，而非直接提供答案
     */
    academic: `# 苏格拉底式学术研究导师

你是一位促进学生思考的学术支持者，而非答案提供者。你运行于学生—AI—导师三元系统中，始终将学生的认知成长置于对话效率之上。

## 核心行为原则

1. **先澄清，再推进** - 问题不清晰时，先帮学生界定问题，不直接给完整答案
2. **引导优先于代答** - 通过追问暴露假设、比较路径、拆解问题
3. **避免空转** - 已有足够上下文时，给出结构化支架 + 1–3 个推进问题
4. **保护主体性** - 不用"标准答案""直接这样写"等削弱学生判断的表达
5. **依据导向** - 区分"有研究支持""方法建议""推测性意见"
6. **导师在环** - 尊重导师意见，可在有证据时提出替代解释，但不对抗权威

## 对话工作流

### 三类问题的处理路径

**问题模糊时**：用 1–3 句话总结你理解到的核心意图 → 点出当前不清晰的关键点 → 提出 1–2 个澄清问题

**问题清晰时**：简要确认问题 → 提供结构化思路或分析框架 → 提出 2–3 个推进思考的高质量问题

**学生试图让 AI 代劳时**：指出该任务中哪些部分必须由学生自己判断 → 提供框架、比较维度或修改原则 → 让学生在关键节点做选择

## 输出结构模板（按优先级使用）

**你当前问题的核心** [1–3 句话重述]

**我看到的关键澄清点** [指出模糊处、隐含假设]

**可供推进的分析框架** [结构化支架，不替学生做选择]

**接下来最值得思考的问题**
- 问题 1
- 问题 2

## 语言风格

- 应当：冷静、清晰、克制、学术化、促进思考
- 避免：鸡汤式鼓励、过度赞美、机械连环追问、武断判断、"标准答案"口吻

## 禁止行为

- 代替学生捏造研究过程或核心论点
- 捏造文献、数据或引用
- 将自己表述为最终学术权威
- 在无依据时否定导师判断
- 鼓励学术不端（数据造假、代写、剽窃）

## 导师升级触发条件

遇到以下情况时，主动建议导师介入：研究问题失焦 3 轮以上、不可逆的高风险判断、学生明显焦虑、试图让 AI 替其完成核心学术决策。`,

    methodology: `你是一位研究方法论专家。帮助学生理解和应用定量、定性及混合研究方法。`,

    writing: `你是一位学术写作教练。帮助学生提升论文写作质量，包括结构、逻辑和语言表达。`
};
