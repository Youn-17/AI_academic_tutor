/**
 * useConversations Hook - Optimized data fetching with SWR
 * 
 * Implements Vercel React Best Practices:
 * - client-swr-dedup: Automatic request deduplication
 * - rerender-derived-state: Computed values during render
 * - async-parallel: Parallel data fetching
 */

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Conversation, Message, Role } from '@/types';
import * as ConversationService from '@/services/ConversationService';
import { streamChat, AI_CONFIGS, SYSTEM_PROMPTS, ChatMessage, AIConfig } from '@/services/RealAIService';

// Available AI Models
export const AI_MODELS = {
    'deepseek-chat': {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        description: '快速响应，适合日常对话',
        config: AI_CONFIGS.deepseekChat,
    },
    'deepseek-reasoner': {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        provider: 'deepseek',
        description: '深度推理，适合复杂问题',
        config: AI_CONFIGS.deepseekReasoner,
    },
    'glm-4.7': {
        id: 'glm-4.7',
        name: '智谱 GLM-4.7',
        provider: 'zhipu',
        description: '中文优化，学术写作',
        config: AI_CONFIGS.zhipuGLM4,
    },
} as const;

export type AIModelId = keyof typeof AI_MODELS;

// SWR fetcher functions
const conversationsFetcher = () => ConversationService.getConversations();
const messagesFetcher = (conversationId: string) => ConversationService.getMessages(conversationId);

/**
 * Hook for fetching user's conversations list
 */
export function useConversationsList() {
    const { data, error, isLoading, mutate } = useSWR<Conversation[]>(
        'conversations',
        conversationsFetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            // Fallback to empty array on error
            onError: (err) => console.error('Failed to fetch conversations:', err),
        }
    );

    return {
        conversations: data ?? [],
        isLoading,
        error,
        refresh: mutate,
    };
}

/**
 * Hook for fetching messages of a specific conversation
 */
export function useConversationMessages(conversationId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Message[]>(
        conversationId ? ['messages', conversationId] : null,
        () => conversationId ? messagesFetcher(conversationId) : Promise.resolve([]),
        {
            revalidateOnFocus: false,
            dedupingInterval: 2000,
            onError: (err) => console.error('Failed to fetch messages:', err),
        }
    );

    return {
        messages: data ?? [],
        isLoading,
        error,
        refresh: mutate,
    };
}

/**
 * Hook for sending messages and getting AI responses
 * Uses streaming for better UX
 * Now supports model selection!
 */
export function useSendMessage() {
    const sendMessage = async (
        conversationId: string,
        content: string,
        modelId: AIModelId = 'deepseek-chat',
        onChunk?: (chunk: string) => void
    ): Promise<{ userMessage: Message; aiMessage: Message }> => {
        const model = AI_MODELS[modelId];

        // 1. Save user message to database
        const userMessage = await ConversationService.sendMessage(
            conversationId,
            content,
            Role.STUDENT
        );

        // 2. Prepare chat history for AI
        const existingMessages = await ConversationService.getMessages(conversationId);
        const chatHistory: ChatMessage[] = existingMessages.map(msg => ({
            role: msg.sender === Role.STUDENT ? 'user' : 'assistant',
            content: msg.content,
        }));

        // 3. Stream AI response with selected model
        let fullResponse = '';
        try {
            for await (const chunk of streamChat(chatHistory, model.config, SYSTEM_PROMPTS.academic)) {
                fullResponse += chunk;
                onChunk?.(fullResponse);
            }
        } catch (error) {
            console.error('AI streaming error:', error);
            fullResponse = '抱歉，AI 服务暂时不可用。请稍后重试。';
        }

        // 4. Save AI response to database with model info
        const aiMessage = await ConversationService.sendMessage(
            conversationId,
            fullResponse,
            Role.AI,
            modelId
        );

        return { userMessage, aiMessage };
    };

    return { sendMessage };
}

/**
 * Hook for creating new conversations
 */
export function useCreateConversation() {
    const { trigger, isMutating } = useSWRMutation(
        'conversations',
        async (_, { arg }: { arg: string }) => {
            const id = await ConversationService.createConversation(arg);
            return id;
        }
    );

    return {
        createConversation: trigger,
        isCreating: isMutating,
    };
}

/**
 * Combined hook for full conversation management
 */
export function useConversation(conversationId: string | null) {
    const { conversations, isLoading: convLoading, refresh: refreshConversations } = useConversationsList();
    const { messages, isLoading: msgLoading, refresh: refreshMessages } = useConversationMessages(conversationId);
    const { sendMessage } = useSendMessage();
    const { createConversation, isCreating } = useCreateConversation();

    // Derived state - computed during render
    const activeConversation = conversationId
        ? conversations.find(c => c.id === conversationId)
        : null;

    return {
        conversations,
        activeConversation,
        messages,
        isLoading: convLoading || msgLoading,
        isCreating,
        sendMessage: async (
            content: string,
            modelId: AIModelId = 'deepseek-chat',
            onChunk?: (chunk: string) => void
        ) => {
            if (!conversationId) return;
            const result = await sendMessage(conversationId, content, modelId, onChunk);
            await refreshMessages();
            return result;
        },
        createConversation: async (title: string) => {
            const id = await createConversation(title);
            await refreshConversations();
            return id;
        },
        refreshConversations,
        refreshMessages,
    };
}
