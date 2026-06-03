import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { getRolePrompt } from '@/services/AgentRoles';
import { readFileContent } from '@/services/DocumentService';
import { getMyCondition, type StudyCondition } from '@/services/StudyService';

interface StudentViewProps {
  onLogout: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

// Read an image File as a (downscaled) base64 dataURL for multimodal vision input.
async function readImageAsDataURL(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch { return dataUrl; }
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
  const [selectedModel, setSelectedModel] = useState('auto');
  const [selectedRole, setSelectedRole] = useState<string>(() => localStorage.getItem('hak_role') || 'socratic');
  const handleRoleSelect = (id: string) => { setSelectedRole(id); try { localStorage.setItem('hak_role', id); } catch { /* ignore */ } };
  const [useRag, setUseRag] = useState(false);
  const [condition, setCondition] = useState<StudyCondition | null>(null);  // A/B 实验条件(非参与者=null)
  const [agentSteps, setAgentSteps] = useState<{ tool?: string; status?: string; found?: number }[]>([]);
  const [reasoning, setReasoning] = useState('');
  const sendingRef = useRef(false);                       // in-flight guard — no concurrent send/edit (H2)
  const abortRef = useRef<AbortController | null>(null);  // current stream's aborter (Stop / chat-switch)
  // A_direct = clean control (no tools); B_socratic & non-participants get the tool-using agent
  const useAgent = condition !== 'A_direct';

  // Mirror activeChatId into a ref so async stream callbacks can detect a mid-flight
  // chat switch and avoid committing a stale reply into the newly-opened chat.
  const activeChatIdRef = useRef(activeChatId);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  // LLM history mapping: student → user; supervisor intervention → a clearly-marked
  // user note (NOT 'assistant', which would make the AI think it said the teacher's words).
  const toChatHistory = (msgs: Message[]): ChatMessage[] => msgs.map((msg): ChatMessage =>
    msg.sender === Role.STUDENT ? { role: 'user', content: msg.content }
    : msg.sender === Role.SUPERVISOR ? { role: 'user', content: `[导师介入指导，请参考]：${msg.content}` }
    : { role: 'assistant', content: msg.content });

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

  // A/B 条件:入组并同意的学生按条件走;B 默认开 RAG,A 关 RAG
  useEffect(() => {
    getMyCondition().then(c => {
      setCondition(c);
      if (c === 'B_socratic') setUseRag(true);
      else if (c === 'A_direct') setUseRag(false);
    });
  }, []);

  // Load Messages — abort any in-flight stream when switching chats (H3)
  useEffect(() => {
    abortRef.current?.abort();
    setAgentSteps([]);
    setReasoning('');
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
    if (sendingRef.current) return;          // H2: ignore re-entrant send while one is streaming
    sendingRef.current = true;

    const isImage = !!file && file.type.startsWith('image/');
    let fullContent = content;          // text persisted to DB / transcript / RAG
    let imageDataUrl = '';
    try {
      if (file && isImage) {
        imageDataUrl = await readImageAsDataURL(file);     // multimodal: image sent transiently to a vision model
        fullContent = content ? `${content}\n\n[图片]` : '[图片]';
      } else if (file) {
        const fileContent = await readFileContent(file);
        fullContent = `[Attachment: ${file.name}]\n\nContent:\n${fileContent}\n\nUser Question: ${content}`;
      }
    } catch (e) {
      console.error('File read failed:', e);
      sendingRef.current = false;
      return;
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
    setAgentSteps([]);
    setReasoning('');

    const abort = new AbortController();
    abortRef.current = abort;
    const convId = activeChatId;

    try {
      const userMessage = await ConversationService.sendMessage(convId, fullContent, Role.STUDENT);
      if (convId === activeChatIdRef.current) setMessages(prev => prev.map(m => m.id === tempUserMsgId ? userMessage : m));

      const chatHistory = toChatHistory(messages);
      if (isImage && imageDataUrl) {
        chatHistory.push({ role: 'user', content: [
          { type: 'text', text: content || '请看这张图，并引导我思考（不要直接给出答案）。' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]});
      } else {
        chatHistory.push({ role: 'user', content: fullContent });
      }

      const modelInfo = AI_MODELS[selectedModel];
      const config = modelInfo
        ? { provider: modelInfo.provider, model: modelInfo.model }
        : AI_CONFIGS.deepseekChat;
      // A/B:A_direct=普通提示+无RAG+无工具(对照);B_socratic=苏格拉底+RAG+智能体;null(非参与者)=默认苏格拉底+智能体
      const sysPrompt = condition === 'A_direct' ? SYSTEM_PROMPTS.direct
        : condition === 'B_socratic' ? SYSTEM_PROMPTS.academic
        : getRolePrompt(selectedRole);   // non-participants pick a role; participants stay on the A/B prompt
      const ragOptions = condition === 'A_direct'
        ? undefined
        : ((condition === 'B_socratic' || useRag) ? { use_rag: true } : undefined);
      let fullResponse = '';
      let ragSources: { id: string; source_title: string; layer: number }[] = [];
      let collectedArtifacts: { charts: string[]; files: { name: string; b64?: string; url?: string }[] } | undefined;

      try {
        for await (const chunk of streamChat(chatHistory, config, sysPrompt, ragOptions,
          (s) => { ragSources = s; },
          {
            signal: abort.signal,
            use_agent: useAgent,
            onAgentStep: (step) => setAgentSteps(prev => [...prev, step]),
            onReasoning: (t) => setReasoning(prev => prev + t),
            onArtifacts: (a) => { collectedArtifacts = a; },
          })) {
          fullResponse += chunk;
          if (convId === activeChatIdRef.current) setStreamingContent(fullResponse);
        }
      } catch (aiError) {
        if (abort.signal.aborted) { if (!fullResponse) fullResponse = '（已停止生成）'; }
        else if (!fullResponse) fullResponse = `AI 出错：${(aiError as Error).message}`;
      }

      // 检索到的知识块 → 引用卡片(只有真实来源才会被存储与展示)
      const citations = ragSources.map(s => ({ id: s.id, title: s.source_title, source: s.source_title, author: '', year: 0, url: '' }));
      const aiMessage = await ConversationService.sendMessage(convId, fullResponse, Role.AI, selectedModel, citations);
      if (convId === activeChatIdRef.current) setMessages(prev => [...prev, collectedArtifacts ? { ...aiMessage, artifacts: collectedArtifacts } : aiMessage]);

      if (chatHistory.length === 1) {
        const newTitle = content.slice(0, 20) || 'New Chat';
        ConversationService.updateConversationTitle(convId, newTitle).then(loadConversations);
      }

    } catch (err) {
      console.error('Send failed:', err);
      setMessages(prev => prev.filter(m => m.id !== tempUserMsgId));
    } finally {
      setIsThinking(false);
      setStreamingContent('');
      setAgentSteps([]);
      setReasoning('');
      sendingRef.current = false;
      abortRef.current = null;
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChatId) return;
    if (sendingRef.current) return;          // H2: shared in-flight lock with send
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    sendingRef.current = true;

    const keptMessages = messages.slice(0, msgIndex);

    const editedUserMsg: Message = {
      ...messages[msgIndex],
      content: newContent,
      timestamp: new Date().toLocaleTimeString() + ' (edited)'
    };

    setMessages([...keptMessages, editedUserMsg]);
    setIsThinking(true);
    setStreamingContent('');
    setAgentSteps([]);
    setReasoning('');

    const abort = new AbortController();
    abortRef.current = abort;
    const convId = activeChatId;

    try {
      // #4 fix: delete the edited turn + everything after it from the DB FIRST,
      // else the old messages reappear on reload (the edit looked like a no-op).
      await ConversationService.deleteMessagesFrom(convId, messageId);
      const newUserMsg = await ConversationService.sendMessage(convId, newContent, Role.STUDENT);
      if (convId === activeChatIdRef.current) setMessages([...keptMessages, newUserMsg]);

      const chatHistory = toChatHistory(keptMessages);
      chatHistory.push({ role: 'user', content: newContent });

      const modelInfo = AI_MODELS[selectedModel];
      const config = modelInfo
        ? { provider: modelInfo.provider, model: modelInfo.model }
        : AI_CONFIGS.deepseekChat;
      const sysPrompt = condition === 'A_direct' ? SYSTEM_PROMPTS.direct
        : condition === 'B_socratic' ? SYSTEM_PROMPTS.academic
        : getRolePrompt(selectedRole);   // non-participants pick a role; participants stay on the A/B prompt
      const ragOptions = condition === 'A_direct'
        ? undefined
        : ((condition === 'B_socratic' || useRag) ? { use_rag: true } : undefined);
      let fullResponse = '';
      let ragSources: { id: string; source_title: string; layer: number }[] = [];
      let collectedArtifacts: { charts: string[]; files: { name: string; b64?: string; url?: string }[] } | undefined;

      try {
        for await (const chunk of streamChat(chatHistory, config, sysPrompt, ragOptions,
          (s) => { ragSources = s; },
          {
            signal: abort.signal,
            use_agent: useAgent,
            onAgentStep: (step) => setAgentSteps(prev => [...prev, step]),
            onReasoning: (t) => setReasoning(prev => prev + t),
            onArtifacts: (a) => { collectedArtifacts = a; },
          })) {
          fullResponse += chunk;
          if (convId === activeChatIdRef.current) setStreamingContent(fullResponse);
        }
      } catch (aiError) {
        if (abort.signal.aborted) { if (!fullResponse) fullResponse = '（已停止生成）'; }
        else if (!fullResponse) fullResponse = `AI 出错：${(aiError as Error).message}`;
      }

      const citations = ragSources.map(s => ({ id: s.id, title: s.source_title, source: s.source_title, author: '', year: 0, url: '' }));
      const aiMessage = await ConversationService.sendMessage(convId, fullResponse, Role.AI, selectedModel, citations);
      if (convId === activeChatIdRef.current) setMessages(prev => [...prev, collectedArtifacts ? { ...aiMessage, artifacts: collectedArtifacts } : aiMessage]);

    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      setIsThinking(false);
      setStreamingContent('');
      setAgentSteps([]);
      setReasoning('');
      sendingRef.current = false;
      abortRef.current = null;
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
            agentSteps={agentSteps}
            reasoning={reasoning}
            onStop={() => abortRef.current?.abort()}
            selectedRole={selectedRole}
            onRoleSelect={handleRoleSelect}
            roleLocked={condition !== null}
          />
        )}
      </div>
    </div>
  );
};

export default StudentView;
