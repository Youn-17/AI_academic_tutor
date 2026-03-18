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
import { streamChat, AI_CONFIGS, AI_MODELS, SYSTEM_PROMPTS, ChatMessage } from '@/services/RealAIService';
import { readFileContent } from '@/services/DocumentService';

interface StudentViewProps {
  onLogout: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ onLogout, locale, setLocale, theme, setTheme }) => {
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
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [useRag, setUseRag] = useState(false);

  // Find active chat
  const activeChat = conversations.find(c => c.id === activeChatId);

  // Load Conversations
  const loadConversations = async () => {
    try {
      const convs = await ConversationService.getConversations();
      setConversations(convs.slice(0, 50));
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []);

  // Load Messages
  useEffect(() => {
    if (activeChatId) {
      const loadMessages = async () => {
        try {
          const msgs = await ConversationService.getMessages(activeChatId);
          setMessages(msgs);
          setViewMode('chat');
        } catch (err) {
          console.error('Failed to load messages:', err);
        }
      };
      loadMessages();
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
      console.error('Failed to create chat:', err);
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
      console.error('Failed to delete chat:', err);
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
      console.error('Failed to archive chat:', err);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    try {
      await ConversationService.updateConversationTitle(id, newTitle);
      await loadConversations();
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!activeChatId) return;

    let fullContent = content;
    if (file) {
      const fileContent = await readFileContent(file);
      fullContent = `[Attachment: ${file.name}]\n\nContent:\n${fileContent}\n\nUser Question: ${content}`;
    }

    // Optimistic Update
    const tempUserMsgId = `temp-${Date.now()}`;
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      sender: Role.STUDENT,
      content: fullContent,
      timestamp: new Date().toLocaleTimeString(),
      contentType: 'text'
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setIsThinking(true);
    setStreamingContent('');

    try {
      const userMessage = await ConversationService.sendMessage(activeChatId, fullContent, Role.STUDENT);
      setMessages(prev => prev.map(m => m.id === tempUserMsgId ? userMessage : m));

      const chatHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.sender === Role.STUDENT ? 'user' : 'assistant',
        content: msg.content,
      }));
      chatHistory.push({ role: 'user', content: fullContent });

      const modelInfo = AI_MODELS[selectedModel];
      const config = modelInfo
        ? { provider: modelInfo.provider, model: modelInfo.model }
        : AI_CONFIGS.deepseekChat;
      const ragOptions = useRag ? { use_rag: true } : undefined;
      let fullResponse = '';

      try {
        for await (const chunk of streamChat(chatHistory, config, SYSTEM_PROMPTS.academic, ragOptions)) {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        }
      } catch (aiError) {
        fullResponse = `AI Error: ${(aiError as Error).message}`;
      }

      const aiMessage = await ConversationService.sendMessage(activeChatId, fullResponse, Role.AI, selectedModel);
      setMessages(prev => [...prev, aiMessage]);

      if (messages.length === 0) {
        const newTitle = content.slice(0, 20) || 'New Chat';
        ConversationService.updateConversationTitle(activeChatId, newTitle).then(loadConversations);
      }

    } catch (err) {
      console.error('Send failed:', err);
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

    const keptMessages = messages.slice(0, msgIndex);

    const editedUserMsg: Message = {
      ...messages[msgIndex],
      content: newContent,
      timestamp: new Date().toLocaleTimeString() + ' (edited)'
    };

    setMessages([...keptMessages, editedUserMsg]);
    setIsThinking(true);
    setStreamingContent('');

    try {
      await ConversationService.sendMessage(activeChatId, newContent, Role.STUDENT);

      const chatHistory: ChatMessage[] = keptMessages.map(msg => ({
        role: msg.sender === Role.STUDENT ? 'user' : 'assistant',
        content: msg.content,
      }));
      chatHistory.push({ role: 'user', content: newContent });

      const modelInfo = AI_MODELS[selectedModel];
      const config = modelInfo
        ? { provider: modelInfo.provider, model: modelInfo.model }
        : AI_CONFIGS.deepseekChat;
      const ragOptions = useRag ? { use_rag: true } : undefined;
      let fullResponse = '';

      try {
        for await (const chunk of streamChat(chatHistory, config, SYSTEM_PROMPTS.academic, ragOptions)) {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        }
      } catch (aiError) {
        fullResponse = `AI Error: ${(aiError as Error).message}`;
      }

      const aiMessage = await ConversationService.sendMessage(activeChatId, fullResponse, Role.AI, selectedModel);
      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      setIsThinking(false);
      setStreamingContent('');
    }
  };

  const handleClearChat = async () => {
    if (confirm('清空此对话？')) {
      await ConversationService.deleteConversation(activeChatId);
      setActiveChatId('');
      setViewMode('dashboard');
    }
  };

  const handleExportChat = async () => {
    const content = messages.map(m => `${m.sender === Role.STUDENT ? 'Student' : 'AI'}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChat?.title}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCompareModels = async (modelIds: string[]) => {
    if (!activeChatId || modelIds.length === 0) return;

    const lastUserMsg = [...messages].reverse().find(m => m.sender === Role.STUDENT);
    if (!lastUserMsg) return;

    try {
      const { compareAIModels, AI_MODELS } = await import('@/services/RealAIService');
      const configs = modelIds.map(id => {
        const modelInfo = AI_MODELS[id];
        return { provider: modelInfo.provider, model: modelInfo.model };
      });

      const results = await compareAIModels([{
        role: 'user',
        content: lastUserMsg.content
      }], configs, SYSTEM_PROMPTS.academic);

      for (const result of results) {
        if (!result.error) {
          const modelInfo = AI_MODELS[result.model];
          await ConversationService.sendMessage(
            activeChatId,
            `【${modelInfo?.name || result.model}】\n\n${result.response}`,
            Role.AI
          );
        }
      }
      const updatedMsgs = await ConversationService.getMessages(activeChatId);
      setMessages(updatedMsgs);
    } catch (err) {
      console.error('Model comparison failed:', err);
    }
  };

  const handleSelectView = (v: typeof viewMode) => {
    setViewMode(v);
    setActiveChatId('');
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-50'}`}>
      <StudentSidebar
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onArchiveChat={handleArchiveChat}
        onRenameChat={handleRenameChat}
        currentView={viewMode}
        onSelectView={handleSelectView}
        onLogout={onLogout}
        theme={theme}
        locale={locale}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
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
            useRag={useRag}
            onToggleRag={() => setUseRag(prev => !prev)}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            locale={locale}
            onLocaleChange={setLocale}
            onClearChat={handleClearChat}
            onExportChat={handleExportChat}
            onCompareModels={handleCompareModels}
          />
        )}
      </div>
    </div>
  );
};

export default StudentView;
