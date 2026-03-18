import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  // Request ID tracking for race condition prevention
  const requestIdRef = useRef(0);

  // Model config map - memoized to avoid recreation
  const modelMap = useMemo(() => ({
    'deepseek-chat':     { provider: 'deepseek' as const, model: 'deepseek-chat' },
    'deepseek-reasoner': { provider: 'deepseek' as const, model: 'deepseek-reasoner' },
    'glm-4.7':           { provider: 'zhipu' as const,    model: 'glm-4.7' },
    'glm-4-flash':       { provider: 'zhipu' as const,    model: 'glm-4-flash' },
    'glm-4':             { provider: 'zhipu' as const,    model: 'glm-4' },
  }), []);

  // Load Conversations - memoized with proper dependencies
  const loadConversations = useCallback(async () => {
    try {
      const convs = await ConversationService.getConversations();
      setConversations(convs.slice(0, 50));
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load Messages - with cleanup
  useEffect(() => {
    let cancelled = false;

    if (activeChatId) {
      const loadMessages = async () => {
        try {
          const msgs = await ConversationService.getMessages(activeChatId);
          if (!cancelled) {
            setMessages(msgs);
            setViewMode('chat');
          }
        } catch (err) {
          if (!cancelled) console.error('Failed to load messages:', err);
        }
      };
      loadMessages();
    }

    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // --- Handlers (memoized) ---

  const handleCreateChat = useCallback(async () => {
    try {
      const title = locale === 'en' ? 'New Conversation' : '新对话';
      const newId = await ConversationService.createConversation(title);
      await loadConversations();
      setActiveChatId(newId);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  }, [locale, loadConversations]);

  const handleDeleteChat = useCallback(async (id: string) => {
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
  }, [activeChatId, loadConversations]);

  const handleArchiveChat = useCallback(async (id: string) => {
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
  }, [activeChatId, loadConversations]);

  const handleRenameChat = useCallback(async (id: string, newTitle: string) => {
    try {
      await ConversationService.updateConversationTitle(id, newTitle);
      await loadConversations();
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  }, [loadConversations]);

  const handleSendMessage = useCallback(async (content: string, file?: File) => {
    if (!activeChatId) return;

    let fullContent = content;
    if (file) {
      const fileContent = await readFileContent(file);
      fullContent = `[Attachment: ${file.name}]\n\nContent:\n${fileContent}\n\nUser Question: ${content}`;
    }

    // Increment request ID for race condition prevention
    const currentRequestId = ++requestIdRef.current;

    // 1. Optimistic Update
    const tempUserMsgId = `temp-${Date.now()}-${currentRequestId}`;
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
      // 2. Persist User Message
      const userMessage = await ConversationService.sendMessage(activeChatId, fullContent, Role.STUDENT);

      // Only update if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setMessages(prev => prev.map(m => m.id === tempUserMsgId ? userMessage : m));
      }

      const chatHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.sender === Role.STUDENT ? 'user' : 'assistant',
        content: msg.content,
      }));
      chatHistory.push({ role: 'user', content: fullContent });

      // 3. Stream AI Response
      const config = modelMap[selectedModel] || AI_CONFIGS.deepseekChat;
      let fullResponse = '';

      try {
        for await (const chunk of streamChat(chatHistory, config, SYSTEM_PROMPTS.academic)) {
          // Only update if this is still the current request
          if (currentRequestId === requestIdRef.current) {
            fullResponse += chunk;
            setStreamingContent(fullResponse);
          } else {
            // Request was superseded, abort streaming
            break;
          }
        }
      } catch (aiError) {
        if (currentRequestId === requestIdRef.current) {
          fullResponse = `AI Error: ${(aiError as Error).message}`;
        }
      }

      // Only save and update if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        // 4. Save AI Message
        const aiMessage = await ConversationService.sendMessage(activeChatId, fullResponse, Role.AI, selectedModel);
        setMessages(prev => [...prev, aiMessage]);

        // 5. Update Title if first message
        if (messages.length === 0) {
          const newTitle = content.slice(0, 20) || 'New Chat';
          ConversationService.updateConversationTitle(activeChatId, newTitle).then(loadConversations);
        }
      }

    } catch (err) {
      console.error('Send failed:', err);
      if (currentRequestId === requestIdRef.current) {
        setMessages(prev => prev.filter(m => m.id !== tempUserMsgId));
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsThinking(false);
        setStreamingContent('');
      }
    }
  }, [activeChatId, messages, selectedModel, modelMap, loadConversations]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!activeChatId) return;

    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const currentRequestId = ++requestIdRef.current;

    // Truncate history to before the edited message
    const keptMessages = messages.slice(0, msgIndex);

    // Optimistic Update
    const editedUserMsg: Message = {
      ...messages[msgIndex],
      content: newContent,
      timestamp: new Date().toLocaleTimeString() + ' (edited)'
    };

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

      const config = modelMap[selectedModel] || AI_CONFIGS.deepseekChat;
      let fullResponse = '';

      try {
        for await (const chunk of streamChat(chatHistory, config, SYSTEM_PROMPTS.academic)) {
          if (currentRequestId === requestIdRef.current) {
            fullResponse += chunk;
            setStreamingContent(fullResponse);
          } else {
            break;
          }
        }
      } catch (aiError) {
        if (currentRequestId === requestIdRef.current) {
          fullResponse = `AI Error: ${(aiError as Error).message}`;
        }
      }

      if (currentRequestId === requestIdRef.current) {
        const aiMessage = await ConversationService.sendMessage(activeChatId, fullResponse, Role.AI, selectedModel);
        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsThinking(false);
        setStreamingContent('');
      }
    }
  }, [activeChatId, messages, selectedModel, modelMap]);

  const handleClearChat = useCallback(async () => {
    if (confirm('清空此对话？')) {
      await ConversationService.deleteConversation(activeChatId);
      setActiveChatId('');
      setViewMode('dashboard');
    }
  }, [activeChatId]);

  const handleExportChat = useCallback(async () => {
    const content = messages.map(m => `${m.sender === Role.STUDENT ? 'Student' : 'AI'}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChat?.title}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, activeChat]);

  const handleCompareModels = useCallback(async (modelIds: string[]) => {
    if (!activeChatId || modelIds.length === 0) return;

    const currentRequestId = ++requestIdRef.current;

    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'student');
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

      // Only display results if this is still the current request
      if (currentRequestId === requestIdRef.current) {
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
        // Reload messages to show new AI responses
        const updatedMsgs = await ConversationService.getMessages(activeChatId);
        if (currentRequestId === requestIdRef.current) {
          setMessages(updatedMsgs);
        }
      }
    } catch (err) {
      console.error('Model comparison failed:', err);
    }
  }, [activeChatId, messages]);

  const handleSelectView = useCallback((v: typeof viewMode) => {
    setViewMode(v);
    setActiveChatId('');
  }, []);

  // Memoized sidebar props to prevent re-renders
  const sidebarProps = useMemo(() => ({
    conversations,
    activeChatId,
    currentView: viewMode,
    theme,
    locale,
    isCollapsed: isSidebarCollapsed,
    onSelectChat: setActiveChatId,
    onCreateChat: handleCreateChat,
    onDeleteChat: handleDeleteChat,
    onArchiveChat: handleArchiveChat,
    onRenameChat: handleRenameChat,
    onSelectView: handleSelectView,
    onLogout,
    onToggleCollapse: () => setIsSidebarCollapsed(prev => !prev),
  }), [
    conversations,
    activeChatId,
    viewMode,
    theme,
    locale,
    isSidebarCollapsed,
    handleCreateChat,
    handleDeleteChat,
    handleArchiveChat,
    handleRenameChat,
    handleSelectView,
    onLogout,
  ]);

  // Memoized chat view props
  const chatViewProps = useMemo(() => ({
    activeChat,
    messages,
    loading: isThinking,
    streamingContent,
    selectedModel,
    theme,
    locale,
    onSendMessage: handleSendMessage,
    onEditMessage: handleEditMessage,
    onModelSelect: setSelectedModel,
    onToggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
    onLocaleChange: setLocale,
    onClearChat: handleClearChat,
    onExportChat: handleExportChat,
    onCompareModels: handleCompareModels,
  }), [
    activeChat,
    messages,
    isThinking,
    streamingContent,
    selectedModel,
    theme,
    locale,
    handleSendMessage,
    handleEditMessage,
    handleClearChat,
    handleExportChat,
    handleCompareModels,
  ]);

  const activeChat = useMemo(() =>
    conversations.find(c => c.id === activeChatId),
  [conversations, activeChatId]);

  const dashboardProps = useMemo(() => ({
    theme,
    userName: profile?.full_name || 'Student',
  }), [theme, profile?.full_name]);

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-50'}`}>
      <StudentSidebar {...sidebarProps} />

      <div className="flex-1 h-full relative">
        {viewMode === 'dashboard' && <StudentDashboard {...dashboardProps} />}
        {viewMode === 'profile' && <StudentProfile theme={theme} />}
        {viewMode === 'classroom' && <StudentClassroomView />}
        {viewMode === 'knowledge' && <StudentKnowledgeView theme={theme} />}
        {viewMode === 'chat' && activeChat && <StudentChatView {...chatViewProps} />}
      </div>
    </div>
  );
};

export default StudentView;
