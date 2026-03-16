import React, { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, Role, Locale, Theme } from '@/types';
import StudentClassroomView from '@/features/student/StudentClassroomView';
import StudentDashboard from '@/features/student/components/StudentDashboard';
import StudentProfile from '@/features/student/components/StudentProfile';
import StudentKnowledgeView from '@/features/student/StudentKnowledgeView';
import StudentSidebar from '@/features/student/components/StudentSidebar';
import StudentChatView from '@/features/student/components/StudentChatView';

import { useAuth } from '@/features/auth/AuthProvider';
import * as ConversationService from '@/services/ConversationService';
import { streamChat, AI_CONFIGS, SYSTEM_PROMPTS, ChatMessage } from '@/services/RealAIService';
import { readFileContent } from '@/services/DocumentService';

interface StudentViewProps {
  onLogout: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ onLogout, locale, theme, setTheme }) => {
  const { profile } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewMode, setViewMode] = useState<'dashboard' | 'chat' | 'profile' | 'classroom' | 'knowledge'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Chat State
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');

  // Load Conversations
  const loadConversations = useCallback(async () => {
    try {
      const convs = await ConversationService.getConversations();
      // Only filter if status type allows 'archived', otherwise just show all or filter by implemented statuses
      setConversations(convs.slice(0, 50));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load Messages
  useEffect(() => {
    if (activeChatId) {
      const loadMessages = async () => {
        try {
          const msgs = await ConversationService.getMessages(activeChatId);
          setMessages(msgs);
        } catch (err) {
          console.error(err);
        }
      };
      loadMessages();
      setViewMode('chat');
    }
  }, [activeChatId]);

  // --- Handlers ---
  const handleCreateChat = async () => {
    try {
      const title = locale === 'en' ? 'New Conversation' : '新对话';
      const newId = await ConversationService.createConversation(title);
      await loadConversations();
      setActiveChatId(newId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
      await ConversationService.deleteConversation(id);
      await loadConversations();
      if (activeChatId === id) {
        setActiveChatId('');
        setViewMode('dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveChat = async (id: string) => {
    try {
      await ConversationService.updateConversationStatus(id, 'archived');
      await loadConversations();
      if (activeChatId === id) {
        setActiveChatId('');
        setViewMode('dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    try {
      await ConversationService.updateConversationTitle(id, newTitle);
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!activeChatId) return;

    let fullContent = content;
    if (file) {
      const fileContent = await readFileContent(file);
      fullContent = `[Attachment: ${file.name}]\n\nContent:\n${fileContent}\n\nUser Question: ${content}`;
    }

    // 1. Optimistic Update
    const tempUserMsgId = `temp-${Date.now()}`;
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      // conversation_id removed
      sender: Role.STUDENT,
      content: fullContent,
      timestamp: new Date().toLocaleTimeString(),
      contentType: 'text'
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setIsThinking(true);
    setStreamingContent('');

    try {
      // 2. Persist User Message
      const userMessage = await ConversationService.sendMessage(activeChatId, fullContent, Role.STUDENT);

      // Update temp message with real ID
      setMessages(prev => prev.map(m => m.id === tempUserMsgId ? userMessage : m));

      const chatHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.sender === Role.STUDENT ? 'user' : 'assistant',
        content: msg.content,
      }));
      chatHistory.push({ role: 'user', content: fullContent });

      // 3. Stream AI Response
      let fullResponse = '';
      const modelMap: Record<string, { provider: 'deepseek' | 'zhipu'; model: string }> = {
        'deepseek-chat':     { provider: 'deepseek', model: 'deepseek-chat' },
        'deepseek-reasoner': { provider: 'deepseek', model: 'deepseek-reasoner' },
        'glm-4.7':           { provider: 'zhipu',    model: 'glm-4.7' },
        'glm-4-flash':       { provider: 'zhipu',    model: 'glm-4-flash' },
        'glm-4':             { provider: 'zhipu',    model: 'glm-4' },
      };
      const config = modelMap[selectedModel] || AI_CONFIGS.deepseekChat;

      try {
        for await (const chunk of streamChat(chatHistory, config, SYSTEM_PROMPTS.academic)) {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        }
      } catch (aiError) {
        fullResponse = `AI Error: ${(aiError as Error).message}`;
      }

      // 4. Save AI Message
      const aiMessage = await ConversationService.sendMessage(activeChatId, fullResponse, Role.AI, selectedModel);
      setMessages(prev => [...prev, aiMessage]);

      // 5. Update Title if first message
      if (messages.length === 0) {
        const newTitle = content.slice(0, 20) || 'New Chat';
        // Non-blocking title update
        ConversationService.updateConversationTitle(activeChatId, newTitle).then(loadConversations);
      }

    } catch (err) {
      console.error('Send failed', err);
      setMessages(prev => prev.filter(m => m.id !== tempUserMsgId));
    } finally {
      setIsThinking(false);
      setStreamingContent('');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChatId) return;

    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Truncate history to before the edited message
    const keptMessages = messages.slice(0, msgIndex);

    // Optimistic Update
    const editedUserMsg: Message = {
      ...messages[msgIndex],
      content: newContent,
      timestamp: new Date().toLocaleTimeString() + ' (edited)'
    };

    // Replace current view effectively rewriting history from that point
    setMessages([...keptMessages, editedUserMsg]);
    setIsThinking(true);
    setStreamingContent('');

    try {
      // Save new message (append)
      await ConversationService.sendMessage(activeChatId, newContent, Role.STUDENT);

      // Re-generate response
      const chatHistory: ChatMessage[] = keptMessages.map(msg => ({
        role: msg.sender === Role.STUDENT ? 'user' : 'assistant',
        content: msg.content,
      }));
      chatHistory.push({ role: 'user', content: newContent });

      let fullResponse = '';
      const editModelMap: Record<string, { provider: 'deepseek' | 'zhipu'; model: string }> = {
        'deepseek-chat':     { provider: 'deepseek', model: 'deepseek-chat' },
        'deepseek-reasoner': { provider: 'deepseek', model: 'deepseek-reasoner' },
        'glm-4.7':           { provider: 'zhipu',    model: 'glm-4.7' },
        'glm-4-flash':       { provider: 'zhipu',    model: 'glm-4-flash' },
        'glm-4':             { provider: 'zhipu',    model: 'glm-4' },
      };
      const editConfig = editModelMap[selectedModel] || AI_CONFIGS.deepseekChat;

      try {
        for await (const chunk of streamChat(chatHistory, editConfig, SYSTEM_PROMPTS.academic)) {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        }
      } catch (aiError) {
        fullResponse = `AI Error: ${(aiError as Error).message}`;
      }

      const aiMessage = await ConversationService.sendMessage(activeChatId, fullResponse, Role.AI, selectedModel);
      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('Edit failed', err);
    } finally {
      setIsThinking(false);
      setStreamingContent('');
    }
  };

  const activeChat = conversations.find(c => c.id === activeChatId);

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-50'}`}>

      <StudentSidebar
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onArchiveChat={handleArchiveChat}
        onRenameChat={handleRenameChat}
        currentView={viewMode}
        onSelectView={(v) => { setViewMode(v); setActiveChatId(''); }}
        onLogout={onLogout}
        theme={theme}
        locale={locale}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="flex-1 h-full relative">
        {viewMode === 'dashboard' && <StudentDashboard theme={theme} userName={profile?.full_name || 'Student'} />}
        {viewMode === 'profile' && <StudentProfile theme={theme} />}
        {viewMode === 'classroom' && <StudentClassroomView />}
        {viewMode === 'knowledge' && <StudentKnowledgeView theme={theme} />}

        {viewMode === 'chat' && activeChat && (
          <StudentChatView
            activeChat={activeChat}
            messages={messages}
            loading={isThinking}
            streamingContent={streamingContent}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            locale={locale}
          />
        )}
      </div>

    </div>
  );
};

export default StudentView;
