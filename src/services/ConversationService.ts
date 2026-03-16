import { supabase } from '@/lib/supabase';
import { Conversation, Message, Role } from '@/types';

/**
 * Conversation Service - CRUD operations for conversations and messages
 */

// Fetch all conversations for current user
export async function getConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
        .from('conversations')
        .select('id, user_id, title, status, tags, created_at, updated_at')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // 一次性批量获取所有对话的最后一条消息（避免 N+1）
    const convIds = data.map(c => c.id);
    const { data: allMessages, error: msgError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender, content, citations, content_type, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    // 每个对话只保留最新一条消息
    const lastMsgMap = new Map<string, typeof allMessages[0]>();
    for (const msg of allMessages || []) {
        if (!lastMsgMap.has(msg.conversation_id)) {
            lastMsgMap.set(msg.conversation_id, msg);
        }
    }

    return data.map(conv => {
        const lastMessage = lastMsgMap.get(conv.id);
        return {
            id: conv.id,
            studentId: conv.user_id,
            studentName: '',
            title: conv.title,
            lastActive: new Date(conv.updated_at).toLocaleString('zh-CN'),
            status: conv.status,
            messages: lastMessage ? [{
                id: lastMessage.id,
                sender: lastMessage.sender as Role,
                content: lastMessage.content,
                timestamp: new Date(lastMessage.created_at).toLocaleString('zh-CN'),
                citations: lastMessage.citations || [],
                contentType: lastMessage.content_type || 'text'
            }] : [],
            tags: conv.tags || []
        };
    });
}

// Fetch messages for a specific conversation
export async function getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map(msg => ({
        id: msg.id,
        sender: msg.sender as Role,
        content: msg.content,
        timestamp: new Date(msg.created_at).toLocaleString('zh-CN'),
        citations: msg.citations || [],
        contentType: msg.content_type || 'text'
    }));
}

// Create a new conversation
export async function createConversation(title: string = '新对话'): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('conversations')
        .insert({
            user_id: user.id,
            title
        })
        .select('id')
        .single();

    if (error) throw error;
    return data.id;
}

// Send a message (student or AI)
export async function sendMessage(
    conversationId: string,
    content: string,
    sender: Role,
    modelUsed?: string
): Promise<Message> {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender,
            content,
            model_used: modelUsed
        })
        .select()
        .single();

    if (error) throw error;

    // Update conversation's updated_at
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return {
        id: data.id,
        sender: data.sender as Role,
        content: data.content,
        timestamp: new Date(data.created_at).toLocaleString('zh-CN'),
        citations: data.citations || [],
        contentType: data.content_type || 'text'
    };
}

// Update conversation title
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);

    if (error) throw error;
}

// Delete a conversation
export async function deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

    if (error) throw error;
}

// Update conversation status (e.g. 'archived', 'active')
export async function updateConversationStatus(conversationId: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId);

    if (error) throw error;
}

// For supervisors: Get filtered student conversations
export async function getAllStudentConversations(studentIds?: string[]): Promise<Conversation[]> {
    let query = supabase
        .from('conversations')
        .select(`
      id,
      user_id,
      title,
      status,
      tags,
      created_at,
      updated_at,
      profiles!conversations_user_id_fkey (
        full_name,
        nickname,
        email
      )
    `)
        .order('updated_at', { ascending: false });

    // If studentIds provided, filter by them
    if (studentIds && studentIds.length > 0) {
        query = query.in('user_id', studentIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 一次性批量获取所有对话的最后一条消息（避免 N+1）
    const convIds = data.map(c => c.id);
    const { data: allMessages, error: msgError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender, content, citations, content_type, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    const lastMsgMap = new Map<string, typeof allMessages[0]>();
    for (const msg of allMessages || []) {
        if (!lastMsgMap.has(msg.conversation_id)) {
            lastMsgMap.set(msg.conversation_id, msg);
        }
    }

    return data.map(conv => {
        const lastMessage = lastMsgMap.get(conv.id);
        return {
            id: conv.id,
            studentId: conv.user_id,
            studentName: (conv.profiles as any)?.nickname || (conv.profiles as any)?.full_name || (conv.profiles as any)?.email || 'Unknown',
            title: conv.title,
            lastActive: new Date(conv.updated_at).toLocaleString('zh-CN'),
            status: conv.status,
            messages: lastMessage ? [{
                id: lastMessage.id,
                sender: lastMessage.sender as Role,
                content: lastMessage.content,
                timestamp: new Date(lastMessage.created_at).toLocaleString('zh-CN'),
                citations: lastMessage.citations || [],
                contentType: lastMessage.content_type || 'text'
            }] : [],
            tags: conv.tags || []
        };
    });
}
