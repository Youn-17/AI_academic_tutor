/**
 * Real AI Service - Unified interface for DeepSeek and Zhipu AI
 * Calls Supabase Edge Function to proxy requests (secure API keys)
 */

import { supabase } from '@/lib/supabase';

export type AIProvider = 'deepseek' | 'zhipu';
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';
export type ZhipuModel = 'glm-4.7';

export interface AIConfig {
    provider: AIProvider;
    model: string;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';

const MAX_CONTENT_LENGTH = 10_000;

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('未登录，请重新登录后再试');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
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
            stream: true
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
 * Default AI configurations
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
        model: 'glm-4.7'
    }
};

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
