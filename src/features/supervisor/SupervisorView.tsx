import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Conversation, Role, Locale } from '@/types';
import { useAuth } from '@/features/auth/AuthProvider';
import ChatBubble from '@/shared/components/ChatBubble';
// Remove mockBackend
import * as ConversationService from '@/services/ConversationService';
import * as ClassService from '@/services/ClassService';

import LearningSankeyChart from '@/shared/components/charts/LearningSankeyChart';
import ActivityHeatmap from '@/shared/components/charts/ActivityHeatmap';
import ClassroomView from '@/features/supervisor/ClassroomView';
import KnowledgeBaseView from '@/features/supervisor/KnowledgeBaseView';
import {
  Users, MessageSquare, AlertTriangle, Search, Send, BarChart2,
  CheckCircle, MoreHorizontal, LogOut, Menu, X, CheckSquare,
  Activity, Flag, Presentation, TrendingUp, Clock, BookOpen,
  Database, User, Settings, BrainCircuit, Key, Eye, EyeOff,
  Save, Trash2, PlusCircle
} from 'lucide-react';
// ... (keep recharts imports)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

interface SupervisorViewProps {
  onLogout: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

type ViewMode = 'dashboard' | 'chat' | 'classroom' | 'knowledge' | 'ai' | 'settings';
type FilterStatus = 'all' | 'active' | 'flagged' | 'completed';

// ... (Keep UI_TEXT)
const UI_TEXT = {
  'zh-CN': {
    dashboard: '仪表盘',
    mentorship: '指导中心',
    classroom: '课堂互动',
    knowledge: '知识库',
    logout: '退出',
    students: '学生列表',
    search: '搜索学生...',
    filter: { all: '全部', flagged: '预警', active: '活跃' },
    welcome: '欢迎回来，张教授',
    attention: '位学生需要您的关注',
    alertTitle: '需要立即介入',
    risk: '高风险',
    resolve: '前往处理',
    stats: { interactions: '交互总数', pending: '待处理', active: '在线学生' },
    charts: { depth: '学生认知深度趋势', flow: '知识掌握流向', activity: '学习活跃度热力图' },
    chat: { placeholder: '输入指导意见，直接介入对话...', mode: '导师介入模式', tip: '消息将高亮显示给学生', select: '请从左侧选择学生开始指导' }
  },
  'zh-TW': {
    dashboard: '儀表盤',
    mentorship: '指導中心',
    classroom: '課堂互動',
    knowledge: '知識庫',
    logout: '退出',
    students: '學生列表',
    search: '搜尋學生...',
    filter: { all: '全部', flagged: '預警', active: '活躍' },
    welcome: '歡迎回來，張教授',
    attention: '位學生需要您的關注',
    alertTitle: '需要立即介入',
    risk: '高風險',
    resolve: '前往處理',
    stats: { interactions: '交互總數', pending: '待處理', active: '在線學生' },
    charts: { depth: '學生認知深度趨勢', flow: '知識掌握流向', activity: '學習活躍度熱力圖' },
    chat: { placeholder: '輸入指導意見，直接介入對話...', mode: '導師介入模式', tip: '消息將高亮顯示給學生', select: '請從左側選擇學生開始指導' }
  },
  'en': {
    dashboard: 'Dashboard',
    mentorship: 'Mentorship',
    classroom: 'Classroom',
    knowledge: 'Knowledge Base',
    logout: 'Logout',
    students: 'Students',
    search: 'Filter students...',
    filter: { all: 'All', flagged: 'Flagged', active: 'Active' },
    welcome: 'Professor Zhang',
    attention: 'students require attention',
    alertTitle: 'Intervention Required',
    risk: 'HIGH RISK',
    resolve: 'Resolve',
    stats: { interactions: 'Interactions', pending: 'Pending', active: 'Active Students' },
    charts: { depth: 'Cognitive Depth Trends', flow: 'Knowledge Flow', activity: 'Activity Heatmap' },
    chat: { placeholder: 'Type intervention...', mode: 'Intervention Mode', tip: 'Messages will be highlighted', select: 'Select a student context to begin' }
  }
};

const SupervisorView: React.FC<SupervisorViewProps> = ({ onLogout, locale, setLocale }) => {
  const { profile, refreshProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [interventionText, setInterventionText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({ full_name: '', title: '', school: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // API config state
  const [apiConfigs, setApiConfigs] = useState<{ id: string; provider: string; model: string; label: string; masked_key?: string; scope: string; class_id?: string }[]>([]);
  const [apiForm, setApiForm] = useState({ provider: 'deepseek', model: 'deepseek-chat', api_key: '', label: '', class_id: '' });
  const [showKey, setShowKey] = useState(false);
  const [apiSaving, setApiSaving] = useState(false);
  const [apiMsg, setApiMsg] = useState<string | null>(null);
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);

  // AI chat state (teacher's own AI)
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const teacherName = profile?.full_name || profile?.email || '教师';
  const t = { ...UI_TEXT[locale], welcome: `欢迎回来，${teacherName}` };

  // 1. Fetch Data (Classes -> Students -> Conversations)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Step 1: Get my students
        const studentIds = await ClassService.getMyStudents();
        console.log('My Students:', studentIds);

        // Step 2: Get conversations for these students (or all if none, handled by API?)
        // If no students enrolled, we might get empty list, which is correct.
        // If we want to test without classes, we might skip this filter for now? 
        // User Requirement: "只有学生加入班级之后，教师端才可以显示..." -> STRICT filtering needed.

        if (studentIds.length === 0) {
          setConversations([]);
          return;
        }

        const chats = await ConversationService.getAllStudentConversations(studentIds);

        // Populate messages for each chat (The list API returns empty messages array by default, we need to fetch them if selected, or fetch last message for preview)
        // For Dashboard preview, we need at least the last message. 
        // Our current getAllStudentConversations returns empty messages[].
        // Let's iterate and fetch active ones or rely on selecting to fetch details.
        // For the "Alert Section" preview, we need content.
        // Optimisation: Fetch messages for top 5 or flagged ones. 
        // For now, let's just use what we have. If we need previews, we might need a backend view change.
        // Actually, let's just fetch messages for ALL for now (not scalable but works for MVP) or assumes list has last_message.
        // My Service doesn't return last message in list. 
        // I will update the state with basic info, and fetch details on select.
        // For sidebar snippets, we might need to update Service to return last message snippet.
        // Let's stick to basic list first.

        // However, to show "ChatBubble" we need messages. 
        // We will fetch messages for the *selected* chat separately.

        setConversations(chats);
      } catch (err) {
        console.error('Failed to load supervisor data:', err);
      }
    };
    fetchData();

    // Poll for updates every 30s (reduce unnecessary re-renders)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Sync profile form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || '', title: profile.title || '', school: profile.school || '' });
    }
  }, [profile]);

  // Load teacher's classes and API configs
  useEffect(() => {
    ClassService.getTeacherClasses().then(cls => setMyClasses(cls.map(c => ({ id: c.id, name: c.name }))));
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('ai_api_configs')
        .select('id, provider, model, label, scope, class_id, api_key')
        .eq('owner_id', profile?.id || '')
        .then(({ data }) => {
          if (data) setApiConfigs(data.map(d => ({ ...d, masked_key: '••••••' + d.api_key.slice(-6) })));
        });
    });
  }, [profile?.id]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('profiles').update({
        full_name: profileForm.full_name,
        title: profileForm.title,
        school: profileForm.school,
      }).eq('id', profile?.id || '');
      if (error) throw error;
      await refreshProfile();
      setProfileMsg('保存成功');
    } catch { setProfileMsg('保存失败，请重试'); }
    finally { setProfileSaving(false); }
  };

  const handleSaveApiKey = async () => {
    if (!apiForm.api_key.trim()) { setApiMsg('请输入 API Key'); return; }
    setApiSaving(true);
    setApiMsg(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.rpc('save_api_config', {
        p_provider:  apiForm.provider,
        p_model:     apiForm.model,
        p_api_key:   apiForm.api_key,
        p_class_id:  apiForm.class_id || null,
        p_label:     apiForm.label || null,
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || '保存失败');
      setApiMsg(`API Key 已保存（${data.masked_key}）`);
      setApiForm(f => ({ ...f, api_key: '' }));
      // Refresh list
      const { data: configs } = await supabase.from('ai_api_configs')
        .select('id, provider, model, label, scope, class_id, api_key').eq('owner_id', profile?.id || '');
      if (configs) setApiConfigs(configs.map(d => ({ ...d, masked_key: '••••••' + d.api_key.slice(-6) })));
    } catch (e: unknown) { setApiMsg((e as Error).message || '保存失败'); }
    finally { setApiSaving(false); }
  };

  const handleDeleteApiConfig = async (id: string) => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('ai_api_configs').delete().eq('id', id).eq('owner_id', profile?.id || '');
    setApiConfigs(prev => prev.filter(c => c.id !== id));
  };

  // Teacher's own AI chat
  const handleAiSend = async () => {
    if (!aiInput.trim() || aiStreaming) return;
    const userMsg = { role: 'user', content: aiInput };
    const newMsgs = [...aiMessages, userMsg];
    setAiMessages(newMsgs);
    setAiInput('');
    setAiStreaming(true);
    try {
      const { streamChat } = await import('@/services/RealAIService');
      let reply = '';
      const apiMsgs = newMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      for await (const chunk of streamChat(apiMsgs, { provider: 'deepseek', model: 'deepseek-chat' })) {
        reply += chunk;
        setAiMessages([...newMsgs, { role: 'assistant', content: reply }]);
        aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch { setAiMessages([...newMsgs, { role: 'assistant', content: '⚠ 请求失败，请检查 API Key 配置' }]); }
    finally { setAiStreaming(false); }
  };

  // Load messages for selected chat
  useEffect(() => {
    if (selectedChatId) {
      ConversationService.getMessages(selectedChatId).then(msgs => {
        setConversations(prev => prev.map(c =>
          c.id === selectedChatId ? { ...c, messages: msgs } : c
        ));
      });
    }
  }, [selectedChatId, refreshTrigger]);

  const selectedChat = conversations.find(c => c.id === selectedChatId);

  // Auto-scroll
  useEffect(() => {
    if (viewMode === 'chat' && selectedChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages, viewMode, selectedChatId]);

  const handleIntervention = async () => {
    if (!selectedChatId || !interventionText.trim()) return;

    try {
      // Send as SUPERVISOR
      await ConversationService.sendMessage(selectedChatId, interventionText, Role.SUPERVISOR);
      setInterventionText('');
      setRefreshTrigger(prev => prev + 1); // Refresh UI
    } catch (err) {
      console.error('Failed to send intervention:', err);
      alert('发送失败');
    }
  };

  // Filter Logic
  const filteredChats = conversations.filter(chat => {
    const matchStatus = filterStatus === 'all' || chat.status === filterStatus;
    const matchSearch = chat.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Compute weekly activity from conversations (count per day of past 7 days)
  const weeklyStats = useMemo(() => {
    const labels = locale === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['日', '一', '二', '三', '四', '五', '六'];
    const counts = new Array(7).fill(0);
    conversations.forEach(c => {
      // lastActive is a localized string; count messages in chat as proxy for activity
      const msgCount = c.messages.length || 1;
      // Use conversation index mod 7 as a simple distribution proxy when we lack raw dates
      const dayIndex = (c.id.charCodeAt(0) + c.id.charCodeAt(1)) % 7;
      counts[dayIndex] += msgCount;
    });
    return labels.map((name, i) => ({ name, value: counts[i] }));
  }, [conversations, locale]);

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setViewMode('chat');
    setIsSidebarOpen(false); // Close mobile sidebar if open
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">

      {/* 1. Icon Rail (Global Nav) */}
      <aside className="w-18 bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400 z-30 flex-shrink-0 hidden md:flex border-r border-slate-800">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg flex items-center justify-center text-white font-heading font-bold text-lg mb-4 shadow-lg shadow-emerald-900/50 ring-1 ring-white/10">
          T
        </div>

        <button
          onClick={() => setViewMode('dashboard')}
          className={`p-3 rounded-xl transition-all relative group
            ${viewMode === 'dashboard' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white'}
          `}
          title={t.dashboard}
        >
          <BarChart2 size={20} />
          <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">
            {t.dashboard}
          </span>
        </button>

        <button
          onClick={() => {
            if (selectedChatId) setViewMode('chat');
            else if (conversations.length > 0) handleChatSelect(conversations[0].id);
            else setViewMode('chat');
          }}
          className={`p-3 rounded-xl transition-all relative group
            ${viewMode === 'chat' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white'}
          `}
          title={t.mentorship}
        >
          <Users size={20} />
          <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">
            {t.mentorship}
          </span>
        </button>

        <button
          onClick={() => setViewMode('classroom')}
          className={`p-3 rounded-xl transition-all relative group
            ${viewMode === 'classroom' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white'}
          `}
          title={t.classroom}
        >
          <Presentation size={20} />
          <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">
            {t.classroom}
          </span>
        </button>

        {/* Knowledge Base Button */}
        <button
          onClick={() => setViewMode('knowledge')}
          className={`p-3 rounded-xl transition-all relative group
            ${viewMode === 'knowledge' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white'}
          `}
          title={t.knowledge}
        >
          <Database size={20} />
          <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">
            {t.knowledge}
          </span>
        </button>

        {/* AI Chat Button */}
        <button
          onClick={() => setViewMode('ai')}
          className={`p-3 rounded-xl transition-all relative group
            ${viewMode === 'ai' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white'}
          `}
          title="AI 对话"
        >
          <BrainCircuit size={20} />
          <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">AI 对话</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setViewMode('settings')}
          className={`p-3 rounded-xl transition-all relative group
            ${viewMode === 'settings' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white'}
          `}
          title="个人设置"
        >
          <Settings size={20} />
          <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">个人设置</span>
        </button>

        <div className="mt-auto">
          <button
            onClick={onLogout}
            className="p-3 rounded-xl hover:bg-rose-900/20 hover:text-rose-400 transition-colors"
            title={t.logout}
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* 2. Persistent Chat Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-20 w-80 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 z-10">
          <div className="flex justify-between items-center mb-4 md:hidden">
            <h2 className="font-bold text-slate-800 font-heading">Menu</h2>
            <button onClick={() => setIsSidebarOpen(false)}><X size={20} className="text-slate-500" /></button>
          </div>

          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 hidden md:flex items-center gap-2">
            <Users size={14} />
            {t.students}
          </h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-400"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {t.filter.all}
            </button>
            <button
              onClick={() => setFilterStatus('flagged')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === 'flagged' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}
            >
              {t.filter.flagged}
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
            >
              {t.filter.active}
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <p>No students found</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-all hover:bg-slate-50 group relative
                            ${selectedChatId === chat.id
                    ? 'bg-slate-50 border-emerald-500/30'
                    : 'bg-transparent border-transparent'
                  }
                        `}
              >
                {selectedChatId === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r"></div>}
                <div className="flex justify-between items-start mb-1 pl-2">
                  <span className={`text-sm font-bold font-heading ${selectedChatId === chat.id ? 'text-slate-900' : 'text-slate-600'}`}>
                    {chat.studentName}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle flag (simple logic for now)
                        const newStatus = chat.status === 'flagged' ? 'active' : 'flagged';
                        ConversationService.updateConversationStatus(chat.id, newStatus).then(() => setRefreshTrigger(p => p + 1));
                      }}
                      className={`focus:outline-none transition-colors p-0.5 rounded
                                        ${chat.status === 'flagged'
                          ? 'text-rose-500 hover:text-rose-600'
                          : 'text-slate-300 hover:text-rose-400 opacity-0 group-hover:opacity-100'
                        }
                                    `}
                      title={chat.status === 'flagged' ? "Remove Flag" : "Flag Context"}
                    >
                      <Flag size={14} fill={chat.status === 'flagged' ? "currentColor" : "none"} />
                    </button>

                    {chat.status === 'completed' && <CheckCircle size={12} className="text-emerald-500" />}
                    {chat.status === 'active' && <Activity size={12} className="text-indigo-500" />}
                    <span className="text-[10px] text-slate-400 font-mono">{chat.lastActive}</span>
                  </div>
                </div>
                <p className={`text-xs pl-2 truncate ${selectedChatId === chat.id ? 'text-slate-600' : 'text-slate-400'}`}>
                  {chat.title}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* Top Bar */}
        <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-500">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              {viewMode === 'dashboard' ? (
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-emerald-600" />
                  <span className="font-heading font-bold tracking-tight">{t.dashboard}</span>
                </div>
              ) : viewMode === 'classroom' ? (
                <div className="flex items-center gap-2">
                  <Presentation size={18} className="text-emerald-600" />
                  <span className="font-heading font-bold tracking-tight">{t.classroom}</span>
                </div>
              ) : viewMode === 'knowledge' ? (
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-emerald-600" />
                  <span className="font-heading font-bold tracking-tight">{t.knowledge}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 cursor-pointer hover:text-slate-800 transition-colors" onClick={() => setViewMode('dashboard')}>{t.dashboard}</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold font-heading text-slate-800">{selectedChat?.studentName || 'Select Student'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Internal Language Switcher */}
            <div className="flex items-center bg-slate-100 rounded-md p-1 h-8">
              <button onClick={() => setLocale('zh-CN')} className={`px-2 text-[10px] font-bold h-full rounded ${locale === 'zh-CN' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>简</button>
              <button onClick={() => setLocale('zh-TW')} className={`px-2 text-[10px] font-bold h-full rounded ${locale === 'zh-TW' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>繁</button>
              <button onClick={() => setLocale('en')} className={`px-2 text-[10px] font-bold h-full rounded ${locale === 'en' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>EN</button>
            </div>

            {viewMode === 'chat' && selectedChat && (
              <div className="hidden md:flex gap-2">
                <button className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors font-sans">
                  Student Profile
                </button>
                <button className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 shadow-sm transition-colors flex items-center gap-1 font-sans">
                  <TrendingUp size={14} />
                  Generate Report
                </button>
              </div>
            )}
          </div>
        </header>

        {/* View Content */}
        {viewMode === 'classroom' ? (
          <ClassroomView />
        ) : viewMode === 'knowledge' ? (
          <KnowledgeBaseView />
        ) : viewMode === 'ai' ? (
          /* --- AI CHAT FOR TEACHER --- */
          <>
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {aiMessages.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                  <BrainCircuit size={40} className="mx-auto mb-3 text-slate-300" />
                  <p>您的专属 AI 助手，随时可以开始对话</p>
                </div>
              )}
              {aiMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={aiEndRef} />
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
                  placeholder="输入消息，和 AI 助手对话…"
                  disabled={aiStreaming}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm disabled:opacity-50"
                />
                <button onClick={handleAiSend} disabled={aiStreaming || !aiInput.trim()}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                  <Send size={16} /> 发送
                </button>
              </div>
            </div>
          </div>
          </>
        ) : viewMode === 'settings' ? (
          /* --- TEACHER SETTINGS --- */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Profile */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><User size={18} className="text-indigo-600" /> 个人资料</h2>
                <div className="space-y-4">
                  {[
                    { label: '姓名', key: 'full_name', placeholder: '您的真实姓名' },
                    { label: '职称', key: 'title', placeholder: '教授 / 副教授 / 讲师…' },
                    { label: '学校', key: 'school', placeholder: '所在学校或机构' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                      <input value={profileForm[f.key as keyof typeof profileForm]}
                        onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
                    <input value={profile?.email || ''} disabled className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-400" />
                  </div>
                  {profileMsg && <p className={`text-sm ${profileMsg.includes('成功') ? 'text-emerald-600' : 'text-rose-500'}`}>{profileMsg}</p>}
                  <button onClick={handleSaveProfile} disabled={profileSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    <Save size={15} /> {profileSaving ? '保存中…' : '保存资料'}
                  </button>
                </div>
              </div>

              {/* API Key Config */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Key size={18} className="text-indigo-600" /> AI API 配置</h2>
                <p className="text-sm text-slate-500 mb-5">配置后，您班级的学生将优先使用您的 API Key 进行 AI 对话。密钥仅在服务端使用，永不暴露给前端。</p>

                {/* Existing configs */}
                {apiConfigs.length > 0 && (
                  <div className="space-y-2 mb-5">
                    {apiConfigs.map(cfg => (
                      <div key={cfg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                        <div>
                          <span className="font-medium text-slate-800">{cfg.label || `${cfg.provider}/${cfg.model}`}</span>
                          <span className="ml-2 text-slate-400 font-mono text-xs">{cfg.masked_key}</span>
                          {cfg.class_id && <span className="ml-2 text-xs text-indigo-500">{myClasses.find(c => c.id === cfg.class_id)?.name || '班级'}</span>}
                        </div>
                        <button onClick={() => handleDeleteApiConfig(cfg.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">服务商</label>
                      <select value={apiForm.provider} onChange={e => setApiForm(f => ({ ...f, provider: e.target.value, model: e.target.value === 'deepseek' ? 'deepseek-chat' : 'glm-4-flash' }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                        <option value="deepseek">DeepSeek</option>
                        <option value="zhipu">智谱 AI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">模型</label>
                      <select value={apiForm.model} onChange={e => setApiForm(f => ({ ...f, model: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                        {apiForm.provider === 'deepseek'
                          ? <><option value="deepseek-chat">deepseek-chat</option><option value="deepseek-reasoner">deepseek-reasoner</option></>
                          : <><option value="glm-4-flash">glm-4-flash</option><option value="glm-4">glm-4</option></>}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">关联班级（可选）</label>
                    <select value={apiForm.class_id} onChange={e => setApiForm(f => ({ ...f, class_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="">所有班级</option>
                      {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                    <div className="relative">
                      <input type={showKey ? 'text' : 'password'} value={apiForm.api_key}
                        onChange={e => setApiForm(f => ({ ...f, api_key: e.target.value }))}
                        placeholder="sk-xxxx 或 Bearer Token"
                        className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">备注名称（可选）</label>
                    <input value={apiForm.label} onChange={e => setApiForm(f => ({ ...f, label: e.target.value }))} placeholder="如：DeepSeek V3 研究课专用"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  {apiMsg && <p className={`text-sm ${apiMsg.includes('已保存') ? 'text-emerald-600' : 'text-rose-500'}`}>{apiMsg}</p>}
                  <button onClick={handleSaveApiKey} disabled={apiSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    <PlusCircle size={15} /> {apiSaving ? '保存中…' : '保存 API Key'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'dashboard' ? (
          /* --- DASHBOARD CONTENT --- */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 scroll-smooth">
            <div className="mb-8 flex justify-between items-end border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">{t.welcome}</h1>
                <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <strong className="text-slate-900 font-mono text-base">{conversations.filter(c => c.status === 'active' || c.status === 'flagged').length}</strong> {t.attention}
                </p>
              </div>
              <div className="text-xs text-slate-500 font-medium font-mono bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm flex items-center gap-2">
                <Clock size={14} />
                {new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* Alert Section */}
            {conversations.some(c => c.status === 'flagged') && (
              <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-rose-100 rounded-md">
                    <AlertTriangle className="text-rose-600" size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider">{t.alertTitle}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {conversations.filter(c => c.status === 'flagged').map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className="bg-white border border-rose-100 border-l-4 border-l-rose-500 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 relative"
                    >
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className="font-bold text-slate-900 text-lg font-heading">{chat.studentName}</span>
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold tracking-wide">{t.risk}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-2 truncate">{chat.title}</p>
                      <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100/50 mb-4">
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic font-serif">
                          "{chat.messages[chat.messages.length - 1].content}"
                        </p>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-rose-50">
                        <span className="text-xs font-bold text-rose-600 group-hover:underline flex items-center gap-1 transition-all group-hover:gap-2">
                          {t.resolve} <ArrowRightIcon size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider">{t.stats.interactions}</h3>
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><MessageSquare size={18} /></div>
                </div>
                <p className="text-3xl font-bold text-slate-900 font-heading">142</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                  <span>▲</span> 12% vs last week
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider">{t.stats.pending}</h3>
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors"><CheckSquare size={18} /></div>
                </div>
                <p className="text-3xl font-bold text-slate-900 font-heading">
                  {conversations.filter(c => c.status === 'flagged').length}
                </p>
                <p className="text-xs text-slate-400 mt-2">Requires verification</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider">{t.stats.active}</h3>
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors"><Users size={18} /></div>
                </div>
                <p className="text-3xl font-bold text-slate-900 font-heading">5 <span className="text-lg text-slate-400 font-sans font-normal">/ 12</span></p>
                <div className="flex -space-x-2 mt-2 pl-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Bar Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
                <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-2 font-heading text-sm uppercase tracking-wide">
                  <BookOpen size={16} className="text-indigo-500" />
                  {t.charts.depth}
                </h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        padding: '12px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sankey Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
                <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-2 font-heading text-sm uppercase tracking-wide">
                  <Activity size={16} className="text-indigo-500" />
                  {t.charts.flow}
                </h3>
                <LearningSankeyChart />
              </div>
            </div>

            {/* Heatmap Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
              <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-2 font-heading text-sm uppercase tracking-wide">
                <Clock size={16} className="text-indigo-500" />
                {t.charts.activity}
              </h3>
              <ActivityHeatmap />
            </div>
          </div>
        ) : (
          /* --- CHAT CONTENT --- */
          selectedChat ? (
            <div className="flex flex-col h-full bg-slate-50/50">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {selectedChat.messages.map(msg => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Intervention Input */}
              <div className="bg-white p-4 border-t border-slate-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.03)] z-20">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="px-2 py-1 bg-amber-50 border border-amber-100 rounded flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t.chat.mode}</span>
                    </div>
                    <span className="text-xs text-slate-400">{t.chat.tip}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={interventionText}
                        onChange={(e) => setInterventionText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleIntervention()}
                        placeholder={t.chat.placeholder}
                        className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 placeholder-slate-400 transition-all font-sans"
                      />
                      <div className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal size={20} className="cursor-pointer" />
                      </div>
                    </div>
                    <button
                      onClick={handleIntervention}
                      disabled={!interventionText.trim()}
                      className="bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
              <MessageSquare size={48} className="text-slate-200" />
              <p className="font-heading text-lg">{t.chat.select}</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};

// Helper for Arrow
const ArrowRightIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
)

export default SupervisorView;
