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
    academic: `你是一位专业的学术研究导师，具有丰富的研究方法论、论文写作和理论框架构建经验。

你的职责是：
1. 帮助学生理清研究思路，提供方法论建议
2. 指导文献综述的撰写和批判性分析
3. 解答关于理论框架、研究设计的问题
4. 提供学术写作的规范和技巧指导
5. 当涉及具体文献时，尽量提供准确的引用信息

请以温和、专业、启发式的方式回应，鼓励学生深入思考。`,

    methodology: `你是一位研究方法论专家。帮助学生理解和应用定量、定性及混合研究方法。`,

    writing: `你是一位学术写作教练。帮助学生提升论文写作质量，包括结构、逻辑和语言表达。`
};
