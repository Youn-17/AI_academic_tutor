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

export type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];   // array = multimodal (text + image_url parts)
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
        if (typeof msg.content === 'string' && msg.content.length > MAX_CONTENT_LENGTH) {
            throw new Error(`消息过长（${msg.content.length} 字符），最多允许 ${MAX_CONTENT_LENGTH} 个字符`);
        }
    }
}

export interface StreamOptions {
    signal?: AbortSignal;                       // caller-controlled abort (Stop button / chat switch)
    use_agent?: boolean;                        // enable tool-calling agent loop
    thinking?: { type: 'enabled' | 'disabled' };// DeepSeek thinking toggle
    reasoning_effort?: 'high' | 'max';
    onAgentStep?: (step: { tool?: string; args?: any; status?: string; found?: number }) => void;
    onReasoning?: (text: string) => void;       // reasoning_content / _reasoning channel
    onArtifacts?: (a: { charts: string[]; files: { name: string; b64: string }[] }) => void;  // run_python charts/files
}

// Stateful stripper that removes leaked <thinking>…</thinking> blocks from a
// token stream, correctly handling tags split across chunks (R3 / <thinking> fix).
function makeThinkingStripper() {
    let buf = '';
    let inside = false;
    const OPEN = /<think(?:ing)?>/i;
    const CLOSE = /<\/think(?:ing)?>/i;
    const isTagPrefix = (s: string) => {
        const t = s.toLowerCase();
        return '<thinking>'.startsWith(t) || '<think>'.startsWith(t)
            || '</thinking>'.startsWith(t) || '</think>'.startsWith(t);
    };
    const run = (flush: boolean): string => {
        let out = '';
        // loop because a chunk may contain multiple open/close transitions
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!inside) {
                const m = buf.match(OPEN);
                if (m) { out += buf.slice(0, m.index); buf = buf.slice((m.index ?? 0) + m[0].length); inside = true; continue; }
                const lt = buf.lastIndexOf('<');
                if (flush || lt === -1) { out += buf; buf = ''; }
                else {
                    const tail = buf.slice(lt);
                    if (isTagPrefix(tail)) { out += buf.slice(0, lt); buf = tail; } // hold possible partial open tag
                    else { out += buf; buf = ''; }
                }
                break;
            } else {
                const m = buf.match(CLOSE);
                if (m) { buf = buf.slice((m.index ?? 0) + m[0].length); inside = false; continue; }
                if (flush) { buf = ''; }
                else {
                    const lt = buf.lastIndexOf('<');
                    buf = (lt !== -1 && isTagPrefix(buf.slice(lt))) ? buf.slice(lt) : '';
                }
                break;
            }
        }
        return out;
    };
    return { push: (t: string) => { buf += t; return run(false); }, flush: () => run(true) };
}

/**
 * Stream chat completion from AI. Yields content chunks (with <thinking> stripped).
 * Robust against hangs: caller AbortSignal + internal idle watchdog + reader cancel.
 */
export async function* streamChat(
    messages: ChatMessage[],
    config: AIConfig,
    systemPrompt?: string,
    ragOptions?: { use_rag?: boolean; course_id?: string; layer_filter?: number[] },
    onSources?: (sources: { id: string; source_title: string; layer: number }[]) => void,
    opts: StreamOptions = {}
): AsyncGenerator<string, void, unknown> {
    const fullMessages: ChatMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

    validateMessages(fullMessages);
    const headers = await getAuthHeaders();

    // Abort = external signal OR internal idle timeout (no chunk for 60s → give up)
    const ctrl = new AbortController();
    if (opts.signal) {
        if (opts.signal.aborted) ctrl.abort();
        else opts.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
    }
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdle = () => { if (idleTimer) clearTimeout(idleTimer); idleTimer = setTimeout(() => ctrl.abort(), 60_000); };

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const stripper = makeThinkingStripper();
    try {
        resetIdle();
        const response = await fetch(`${EDGE_FUNCTION_URL}/chat`, {
            method: 'POST',
            headers,
            signal: ctrl.signal,
            body: JSON.stringify({
                messages: fullMessages,
                provider: config.provider,
                model: config.model,
                stream: true,
                api_key: config.apiKey,
                base_url: config.baseUrl,
                ...(ragOptions?.use_rag ? ragOptions : {}),
                ...(opts.use_agent ? { use_agent: true } : {}),
                ...(opts.thinking ? { thinking: opts.thinking } : {}),
                ...(opts.reasoning_effort ? { reasoning_effort: opts.reasoning_effort } : {}),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`AI Service Error: ${response.status} - ${errorText}`);
        }

        reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
                result = await reader.read();
            } catch {
                break; // aborted / idle-timeout / network drop → stop cleanly (finally cancels)
            }
            if (result.done) break;
            resetIdle();

            buffer += decoder.decode(result.value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') {
                    const tail = stripper.flush();
                    if (tail) yield tail;
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    if (parsed._rag_sources) { onSources?.(parsed._rag_sources); continue; }
                    if (parsed._agent_step) { opts.onAgentStep?.(parsed._agent_step); continue; }
                    if (parsed._artifacts) { opts.onArtifacts?.(parsed._artifacts); continue; }
                    if (parsed._reasoning) { opts.onReasoning?.(String(parsed._reasoning)); continue; }
                    if (parsed.error) { continue; } // stream-level error; loop ends on [DONE]/close
                    const delta = parsed.choices?.[0]?.delta || {};
                    if (typeof delta.reasoning_content === 'string') opts.onReasoning?.(delta.reasoning_content);
                    if (typeof delta.content === 'string' && delta.content) {
                        const out = stripper.push(delta.content);
                        if (out) yield out;
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }
        const tail = stripper.flush();
        if (tail) yield tail;
    } finally {
        if (idleTimer) clearTimeout(idleTimer);
        try { await reader?.cancel(); } catch { /* ignore */ }
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
    // === Auto router (DMXAPI: one key, best model per task) ===
    'auto': {
        id: 'auto',
        name: '🪄 自动选择',
        provider: 'dmxapi',
        model: 'auto',
        description: '按任务自动选最合适的模型（Claude / GPT / Gemini）',
        category: 'free',
        color: 'bg-blue-600',
    },
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
        name: 'DeepSeek V4 Flash',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        description: '深度求索 V4 · 快速',
        category: 'free',
        color: 'bg-sky-500',
    },
    'deepseek-reasoner': {
        id: 'deepseek-reasoner',
        name: 'DeepSeek V4 Pro',
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        description: '深度求索 V4 · 深度思考',
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
        model: 'deepseek-v4-flash'
    },
    deepseekReasoner: {
        provider: 'deepseek' as AIProvider,
        model: 'deepseek-v4-pro'
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
// Only show models that actually have an API key configured on this deployment,
// so students aren't overwhelmed and can't pick an unconfigured model that 503s.
// Configured providers (verified): dmxapi (Claude/ChatGPT), deepseek, zhipu(glm-5).
export const MODEL_CATEGORIES = {
    recommended: {
        name: '推荐 · 已就绪',
        models: ['auto', 'claude-sonnet-4-6', 'deepseek-chat', 'deepseek-reasoner', 'glm-5', 'gpt-5.4'],
        color: 'bg-blue-500',
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

    /**
     * 对照组(A_direct)系统提示词 —— 普通"直接答题"助手,作为 A/B 实验对照。
     * 仍不得捏造,但直接给答案、不做苏格拉底式引导、不强制引用。
     */
    direct: `你是一位学术研究助手。请直接、清晰、准确地回答学生的学术问题,提供有用的信息、解释、示例和可操作的建议。回答应具体、完整、便于学生直接使用。不要编造文献、数据或引用。`,

    methodology: `你是一位研究方法论专家。帮助学生理解和应用定量、定性及混合研究方法。`,

    writing: `你是一位学术写作教练。帮助学生提升论文写作质量，包括结构、逻辑和语言表达。`
};
