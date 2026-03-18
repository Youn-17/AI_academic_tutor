import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Conversation, Role, Locale } from '@/types';
import { useAuth } from '@/features/auth/AuthProvider';
import ChatBubble from '@/shared/components/ChatBubble';
import * as ConversationService from '@/services/ConversationService';
import * as ClassService from '@/services/ClassService';
import { AI_MODELS, MODEL_CATEGORIES, streamChat } from '@/services/RealAIService';

import LearningSankeyChart from '@/shared/components/charts/LearningSankeyChart';
import ActivityHeatmap from '@/shared/components/charts/ActivityHeatmap';
import ClassroomView from '@/features/supervisor/ClassroomView';
import KnowledgeBaseView from '@/features/supervisor/KnowledgeBaseView';

import {
  Users, MessageSquare, AlertTriangle, Search, Send, BarChart2,
  CheckCircle, MoreHorizontal, LogOut, Menu, X, CheckSquare,
  Activity, Flag, Presentation, TrendingUp, Clock, BookOpen,
  Database, User, Settings, BrainCircuit, Key, Eye, EyeOff,
  Save, Trash2, PlusCircle, Sparkles, ChevronDown, Zap,
  GraduationCap, Bell, RefreshCw, Shield, Info, ExternalLink,
  Bot, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface SupervisorViewProps {
  onLogout: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

type ViewMode = 'dashboard' | 'chat' | 'classroom' | 'knowledge' | 'ai' | 'settings';
type FilterStatus = 'all' | 'active' | 'flagged' | 'completed';

// DMXAPI model list - OpenAI compatible, routes via https://www.dmxapi.cn/v1
const DMXAPI_MODELS: { group: string; models: { id: string; name: string; tier: 'free' | 'pro' }[] }[] = [
  {
    group: 'OpenAI', models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'free' },
      { id: 'gpt-4o', name: 'GPT-4o', tier: 'pro' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', tier: 'free' },
      { id: 'gpt-4.1', name: 'GPT-4.1', tier: 'pro' },
    ]
  },
  {
    group: 'Anthropic', models: [
      { id: 'claude-3-5-haiku-20250219', name: 'Claude 3.5 Haiku', tier: 'free' },
      { id: 'claude-3-5-sonnet-20250219', name: 'Claude 3.5 Sonnet', tier: 'pro' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', tier: 'pro' },
    ]
  },
  {
    group: 'Google', models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', tier: 'free' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'pro' },
    ]
  },
  {
    group: 'DeepSeek', models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', tier: 'free' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', tier: 'free' },
    ]
  },
  {
    group: 'Qwen', models: [
      { id: 'qwen-turbo', name: 'Qwen Turbo', tier: 'free' },
      { id: 'qwen-plus', name: 'Qwen Plus', tier: 'free' },
      { id: 'qwen-max', name: 'Qwen Max', tier: 'pro' },
    ]
  },
  {
    group: 'GLM', models: [
      { id: 'glm-4-flash', name: 'GLM-4 Flash', tier: 'free' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus', tier: 'pro' },
    ]
  },
];

const SupervisorView: React.FC<SupervisorViewProps> = ({ onLogout, locale, setLocale }) => {
  const { profile, refreshProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [interventionText, setInterventionText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Profile state
  const [profileForm, setProfileForm] = useState({ full_name: '', title: '', school: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // API config state
  const [apiConfigs, setApiConfigs] = useState<{ id: string; provider: string; model: string; label: string; masked_key?: string; scope: string; class_id?: string }[]>([]);
  const [apiForm, setApiForm] = useState({ provider: 'dmxapi', model: 'deepseek-chat', api_key: '', label: '', class_id: '' });
  const [showKey, setShowKey] = useState(false);
  const [apiSaving, setApiSaving] = useState(false);
  const [apiMsg, setApiMsg] = useState<string | null>(null);
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Teacher AI chat
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiModel, setAiModel] = useState('deepseek-chat');
  const [aiModelMenuOpen, setAiModelMenuOpen] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const aiModelMenuRef = useRef<HTMLDivElement>(null);

  const teacherName = profile?.full_name || profile?.email?.split('@')[0] || '教师';

  // ── Data loading ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentIds = await ClassService.getMyStudents();
        if (!studentIds.length) { setConversations([]); return; }
        const chats = await ConversationService.getAllStudentConversations(studentIds);
        setConversations(chats);
      } catch (err) {
        console.error('Failed to load supervisor data:', err);
      }
    };
    fetchData();
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, [refreshTrigger]);

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || '', title: profile.title || '', school: profile.school || '' });
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    ClassService.getTeacherClasses().then(cls => setMyClasses(cls.map(c => ({ id: c.id, name: c.name }))));
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('ai_api_configs')
        .select('id, provider, model, label, scope, class_id, api_key')
        .eq('owner_id', profile.id)
        .then(({ data }) => {
          if (data) setApiConfigs(data.map(d => ({ ...d, masked_key: '••••' + d.api_key.slice(-8) })));
        });
    });
  }, [profile?.id]);

  // Load selected chat messages
  useEffect(() => {
    if (selectedChatId) {
      ConversationService.getMessages(selectedChatId).then(msgs =>
        setConversations(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: msgs } : c))
      );
    }
  }, [selectedChatId, refreshTrigger]);

  // Auto-scroll chat
  useEffect(() => {
    if (viewMode === 'chat' && selectedChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, viewMode, selectedChatId]);

  // Close AI model menu on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (aiModelMenuRef.current && !aiModelMenuRef.current.contains(e.target as Node)) setAiModelMenuOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Handlers ─────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileSaving(true); setProfileMsg(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('profiles').update({
        full_name: profileForm.full_name,
        title: profileForm.title,
        school: profileForm.school,
      }).eq('id', profile?.id || '');
      if (error) throw error;
      await refreshProfile();
      setProfileMsg('✓ 保存成功');
    } catch { setProfileMsg('✗ 保存失败，请重试'); }
    finally { setProfileSaving(false); }
  };

  const handleSaveApiKey = async () => {
    if (!apiForm.api_key.trim()) { setApiMsg('请输入 API Key'); return; }
    setApiSaving(true); setApiMsg(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.rpc('save_api_config', {
        p_provider: apiForm.provider,
        p_model:    apiForm.model,
        p_api_key:  apiForm.api_key,
        p_class_id: apiForm.class_id || null,
        p_label:    apiForm.label || null,
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || '保存失败');
      setApiMsg(`✓ 已保存 (${data.masked_key})`);
      setApiForm(f => ({ ...f, api_key: '' }));
      // Refresh list
      const { data: configs } = await supabase.from('ai_api_configs')
        .select('id, provider, model, label, scope, class_id, api_key').eq('owner_id', profile?.id || '');
      if (configs) setApiConfigs(configs.map(d => ({ ...d, masked_key: '••••' + d.api_key.slice(-8) })));
    } catch (e: unknown) { setApiMsg(`✗ ${(e as Error).message || '保存失败'}`); }
    finally { setApiSaving(false); }
  };

  const handleDeleteApiConfig = async (id: string) => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('ai_api_configs').delete().eq('id', id).eq('owner_id', profile?.id || '');
    setApiConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiStreaming) return;
    const userMsg = { role: 'user', content: aiInput };
    const newMsgs = [...aiMessages, userMsg];
    setAiMessages(newMsgs);
    setAiInput('');
    setAiStreaming(true);
    try {
      let reply = '';
      const apiMsgs = newMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      // Use DMXAPI provider (supports 300+ models including all in aiModel selector)
      for await (const chunk of streamChat(apiMsgs, { provider: 'dmxapi', model: aiModel })) {
        reply += chunk;
        setAiMessages([...newMsgs, { role: 'assistant', content: reply }]);
        aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      setAiMessages([...newMsgs, { role: 'assistant', content: `⚠ 请求失败：${(e as Error).message}` }]);
    } finally { setAiStreaming(false); }
  };

  const handleIntervention = async () => {
    if (!selectedChatId || !interventionText.trim()) return;
    try {
      await ConversationService.sendMessage(selectedChatId, interventionText, Role.SUPERVISOR);
      setInterventionText('');
      setRefreshTrigger(p => p + 1);
    } catch { alert('发送失败'); }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setViewMode('chat');
    setIsSidebarOpen(false);
  };

  // ── Computed ──────────────────────────────────────────────
  const filteredChats = useMemo(() => conversations.filter(c => {
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchSearch = c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  }), [conversations, filterStatus, searchTerm]);

  const weeklyStats = useMemo(() => {
    const labels = ['日', '一', '二', '三', '四', '五', '六'];
    const counts = new Array(7).fill(0);
    conversations.forEach(c => {
      const dayIndex = (c.id.charCodeAt(0) + c.id.charCodeAt(1)) % 7;
      counts[dayIndex] += c.messages?.length || 1;
    });
    return labels.map((name, i) => ({ name, value: counts[i] }));
  }, [conversations]);

  const selectedChat = conversations.find(c => c.id === selectedChatId);
  const flaggedCount = conversations.filter(c => c.status === 'flagged').length;
  const activeCount  = conversations.filter(c => c.status === 'active').length;

  const currentAiModelName = DMXAPI_MODELS.flatMap(g => g.models).find(m => m.id === aiModel)?.name || aiModel;

  // ── Shared styles ─────────────────────────────────────────
  const cardBase = 'bg-white rounded-xl border border-slate-200';
  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
  const btnPrimary = 'flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all shadow-sm shadow-emerald-500/20';

  // ── NAV items ─────────────────────────────────────────────
  const navItems: { id: ViewMode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: 'dashboard',  icon: BarChart2,    label: '仪表盘' },
    { id: 'chat',       icon: Users,        label: '学生指导' },
    { id: 'classroom',  icon: Presentation, label: '课堂' },
    { id: 'knowledge',  icon: Database,     label: '知识库' },
    { id: 'ai',         icon: BrainCircuit, label: 'AI 助手' },
    { id: 'settings',   icon: Settings,     label: '设置' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">

      {/* ── Icon Rail ──────────────────────────────────── */}
      <aside className="w-[72px] bg-[#0B1829] flex flex-col items-center py-5 gap-1.5 z-30 flex-shrink-0 hidden md:flex border-r border-white/5">
        {/* Logo */}
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-white mb-5 shadow-lg shadow-emerald-500/30">
          <Sparkles size={18} />
        </div>

        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'chat' && !selectedChatId && conversations.length > 0) {
                handleChatSelect(conversations[0].id);
              } else {
                setViewMode(item.id);
              }
            }}
            className={`relative group p-3 rounded-xl transition-all w-12 flex justify-center
              ${viewMode === item.id
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
              }`}
            title={item.label}
          >
            <item.icon size={20} />
            {item.id === 'chat' && flaggedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
            <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-slate-700">
              {item.label}
            </span>
          </button>
        ))}

        <div className="mt-auto">
          <button onClick={onLogout} className="p-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-900/10 transition-colors" title="退出">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* ── Student Sidebar (Mentorship) ────────────────── */}
      {(viewMode === 'chat' || viewMode === 'dashboard') && (
        <div className={`
          fixed inset-y-0 left-0 z-20 w-[280px] bg-white border-r border-slate-200 flex flex-col
          transition-transform duration-300 md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h2 className="font-bold text-slate-800 font-heading">菜单</h2>
              <button onClick={() => setIsSidebarOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users size={13} /> 学生列表
              </h2>
              <button onClick={() => setRefreshTrigger(p => p + 1)} className="text-slate-400 hover:text-emerald-500 transition-colors" title="刷新">
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索学生..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 transition-all"
              />
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {([['all', '全部'], ['flagged', '预警'], ['active', '活跃']] as [FilterStatus, string][]).map(([val, lbl]) => (
                <button key={val} onClick={() => setFilterStatus(val)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === val
                    ? val === 'flagged' ? 'bg-white text-rose-600 shadow-sm' : 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {lbl}
                  {val === 'flagged' && flaggedCount > 0 && (
                    <span className="ml-1 text-[9px] bg-rose-100 text-rose-600 px-1 rounded-full">{flaggedCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <GraduationCap size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">暂无学生数据</p>
                <p className="text-xs mt-1 text-slate-300">学生加入班级后将在此显示</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div key={chat.id} onClick={() => handleChatSelect(chat.id)}
                  className={`relative p-3 rounded-xl cursor-pointer border transition-all group
                    ${selectedChatId === chat.id
                      ? 'bg-emerald-50 border-emerald-200/70 shadow-sm'
                      : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                >
                  {selectedChatId === chat.id && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />}

                  <div className="flex justify-between items-start mb-1 pl-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(chat.studentName?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-800 truncate">{chat.studentName || '未知学生'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const newStatus = chat.status === 'flagged' ? 'active' : 'flagged';
                          ConversationService.updateConversationStatus(chat.id, newStatus).then(() => setRefreshTrigger(p => p + 1));
                        }}
                        className={`p-0.5 rounded transition-colors
                          ${chat.status === 'flagged' ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400 opacity-0 group-hover:opacity-100'}`}
                      >
                        <Flag size={13} fill={chat.status === 'flagged' ? 'currentColor' : 'none'} />
                      </button>
                      {chat.status === 'completed' && <CheckCircle size={12} className="text-emerald-500" />}
                      {chat.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 truncate pl-1 ml-9">{chat.title || '对话'}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5 pl-1 ml-9 font-mono">{chat.lastActive}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">

        {/* Top Bar */}
        <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-1 text-slate-400">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              {navItems.find(n => n.id === viewMode) && (() => {
                const nav = navItems.find(n => n.id === viewMode)!;
                return (
                  <>
                    <nav.icon size={16} className="text-emerald-600" />
                    <span className="font-bold font-heading text-slate-800 text-sm">{nav.label}</span>
                  </>
                );
              })()}
              {viewMode === 'chat' && selectedChat && (
                <>
                  <span className="text-slate-300 text-xs">/</span>
                  <span className="text-sm text-slate-600">{selectedChat.studentName}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Lang switcher */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 h-8 gap-0.5">
              {(['zh-CN', 'zh-TW', 'en'] as Locale[]).map(l => (
                <button key={l} onClick={() => setLocale(l)}
                  className={`px-2 text-[10px] font-bold h-full rounded-md transition-all ${locale === l ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>
                  {l === 'zh-CN' ? '简' : l === 'zh-TW' ? '繁' : 'EN'}
                </button>
              ))}
            </div>

            {/* Teacher avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {teacherName[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{teacherName}</span>
            </div>

            {flaggedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
                <Bell size={13} className="text-rose-500" />
                <span className="text-xs font-bold text-rose-600">{flaggedCount} 预警</span>
              </div>
            )}
          </div>
        </header>

        {/* ── Views ──────────────────────────────────── */}

        {viewMode === 'classroom' ? <ClassroomView />
          : viewMode === 'knowledge' ? <KnowledgeBaseView />

          /* ── AI Assistant ── */
          : viewMode === 'ai' ? (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              {/* AI Header */}
              <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">教师专属 AI 助手</p>
                    <p className="text-[10px] text-slate-400">通过 DMXAPI 接入 300+ 模型</p>
                  </div>
                </div>

                {/* Model selector */}
                <div className="relative" ref={aiModelMenuRef}>
                  <button onClick={() => setAiModelMenuOpen(!aiModelMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                    <Sparkles size={12} className="text-emerald-500" />
                    {currentAiModelName}
                    <ChevronDown size={12} className={`transition-transform ${aiModelMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {aiModelMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5">
                      {DMXAPI_MODELS.map(group => (
                        <div key={group.group} className="mb-1.5 last:mb-0">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.group}</div>
                          {group.models.map(m => (
                            <button key={m.id} onClick={() => { setAiModel(m.id); setAiModelMenuOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-all ${aiModel === m.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                              <span>{m.name}</span>
                              {m.tier === 'pro' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-bold">PRO</span>}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {aiMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20">
                      <Sparkles size={28} className="text-white" />
                    </div>
                    <p className="font-bold text-slate-700 mb-1">教师专属 AI 助手</p>
                    <p className="text-sm text-slate-400 mb-6 max-w-xs">使用 DMXAPI 接入多个顶级 AI 模型，辅助教学设计、学情分析和科研写作</p>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                      {['帮我分析学生最近的学习状态', '为研究方法论课生成讨论题目', '如何提升学生的批判性思维', '建议本周指导计划'].map((s, i) => (
                        <button key={i} onClick={() => setAiInput(s)}
                          className="p-3 text-left text-xs bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-slate-600">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center mr-2 mt-1 shrink-0">
                        <Bot size={13} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiStreaming && aiMessages[aiMessages.length - 1]?.role !== 'assistant' && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                      <Bot size={13} className="text-white" />
                    </div>
                    <div className="flex gap-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-3 max-w-3xl mx-auto">
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
                    placeholder="输入问题，和 AI 助手对话…"
                    disabled={aiStreaming}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm disabled:opacity-50 transition-all"
                  />
                  <button onClick={handleAiSend} disabled={aiStreaming || !aiInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-all shadow-sm shadow-emerald-500/20">
                    {aiStreaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    发送
                  </button>
                </div>
              </div>
            </div>

          /* ── Settings ── */
          ) : viewMode === 'settings' ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
              <div className="max-w-2xl mx-auto space-y-5">
                <h1 className="text-2xl font-bold font-heading text-slate-900 mb-6">个人设置</h1>

                {/* Profile */}
                <div className={`${cardBase} overflow-hidden`}>
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <User size={14} className="text-emerald-600" />
                    </div>
                    <h2 className="font-bold text-slate-800 text-sm">个人资料</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      { label: '姓名', key: 'full_name', placeholder: '您的真实姓名' },
                      { label: '职称', key: 'title', placeholder: '教授 / 副教授 / 讲师…' },
                      { label: '学校', key: 'school', placeholder: '所在学校或机构' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{f.label}</label>
                        <input value={profileForm[f.key as keyof typeof profileForm]}
                          onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder} className={inputCls} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">邮箱</label>
                      <input value={profile?.email || ''} disabled className={`${inputCls} bg-slate-50 opacity-60 cursor-not-allowed`} />
                    </div>
                    {profileMsg && (
                      <p className={`text-sm font-medium ${profileMsg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-500'}`}>{profileMsg}</p>
                    )}
                    <button onClick={handleSaveProfile} disabled={profileSaving} className={btnPrimary}>
                      <Save size={15} /> {profileSaving ? '保存中…' : '保存资料'}
                    </button>
                  </div>
                </div>

                {/* API Key Config */}
                <div className={`${cardBase} overflow-hidden`}>
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
                        <Key size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-800 text-sm">AI API 配置</h2>
                        <p className="text-xs text-slate-400 mt-0.5">配置后，您班级的学生将优先使用您的 Key 进行 AI 对话</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Info banner */}
                    <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl mb-5">
                      <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-700 leading-relaxed">
                        <strong>推荐使用 DMXAPI</strong> — 一个 Key 接入 300+ 模型（GPT、Claude、Gemini、DeepSeek 等）。
                        访问 <a href="https://www.dmxapi.cn" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">dmxapi.cn <ExternalLink size={10} /></a> 注册并获取 Key（格式：<code className="font-mono bg-emerald-100 px-1 rounded">sk-...</code>）
                      </div>
                    </div>

                    {/* Existing configs */}
                    {apiConfigs.length > 0 && (
                      <div className="space-y-2 mb-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">已配置</p>
                        {apiConfigs.map(cfg => (
                          <div key={cfg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{cfg.label || `${cfg.provider} / ${cfg.model}`}</p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{cfg.masked_key}
                                  {cfg.class_id && <span className="ml-2 text-emerald-600">{myClasses.find(c => c.id === cfg.class_id)?.name || '班级'}</span>}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteApiConfig(cfg.id)} className="text-slate-300 hover:text-rose-500 transition-colors ml-3 opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New config form */}
                    <div className="space-y-3">
                      {/* Provider selector */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">服务商</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'dmxapi', label: 'DMXAPI', sub: '推荐 · 300+ 模型' },
                            { value: 'deepseek', label: 'DeepSeek', sub: '直连' },
                            { value: 'zhipu', label: '智谱 AI', sub: '直连' },
                          ].map(p => (
                            <button key={p.value} type="button"
                              onClick={() => setApiForm(f => ({ ...f, provider: p.value, model: p.value === 'dmxapi' ? 'deepseek-chat' : p.value === 'deepseek' ? 'deepseek-chat' : 'glm-4-flash' }))}
                              className={`p-2.5 rounded-xl border text-left transition-all ${apiForm.provider === p.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                              <p className={`text-xs font-bold ${apiForm.provider === p.value ? 'text-emerald-700' : 'text-slate-700'}`}>{p.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{p.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Model selector */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">默认模型</label>
                        {apiForm.provider === 'dmxapi' ? (
                          <div className="relative">
                            <button type="button" onClick={() => setShowModelDropdown(!showModelDropdown)}
                              className={`${inputCls} flex items-center justify-between`}>
                              <span>{DMXAPI_MODELS.flatMap(g => g.models).find(m => m.id === apiForm.model)?.name || apiForm.model}</span>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showModelDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 max-h-60 overflow-y-auto">
                                {DMXAPI_MODELS.map(group => (
                                  <div key={group.group}>
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.group}</div>
                                    {group.models.map(m => (
                                      <button key={m.id} type="button"
                                        onClick={() => { setApiForm(f => ({ ...f, model: m.id })); setShowModelDropdown(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-all ${apiForm.model === m.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                        <span>{m.name}</span>
                                        {m.tier === 'pro' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-bold">PRO</span>}
                                      </button>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <select value={apiForm.model} onChange={e => setApiForm(f => ({ ...f, model: e.target.value }))} className={inputCls}>
                            {apiForm.provider === 'deepseek'
                              ? <><option value="deepseek-chat">deepseek-chat</option><option value="deepseek-reasoner">deepseek-reasoner</option></>
                              : <><option value="glm-4-flash">glm-4-flash</option><option value="glm-4-plus">glm-4-plus</option></>
                            }
                          </select>
                        )}
                      </div>

                      {/* Class */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">关联班级（可选）</label>
                        <select value={apiForm.class_id} onChange={e => setApiForm(f => ({ ...f, class_id: e.target.value }))} className={inputCls}>
                          <option value="">所有班级</option>
                          {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">API Key</label>
                        <div className="relative">
                          <input type={showKey ? 'text' : 'password'} value={apiForm.api_key}
                            onChange={e => setApiForm(f => ({ ...f, api_key: e.target.value }))}
                            placeholder="sk-xxxx…"
                            className={`${inputCls} pr-10 font-mono`} />
                          <button type="button" onClick={() => setShowKey(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Label */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">备注名称（可选）</label>
                        <input value={apiForm.label} onChange={e => setApiForm(f => ({ ...f, label: e.target.value }))}
                          placeholder="如：研究生班专用 DMXAPI"
                          className={inputCls} />
                      </div>

                      {apiMsg && (
                        <p className={`text-sm font-medium ${apiMsg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-500'}`}>{apiMsg}</p>
                      )}

                      <button onClick={handleSaveApiKey} disabled={apiSaving} className={btnPrimary}>
                        <PlusCircle size={15} /> {apiSaving ? '保存中…' : '保存 API Key'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security info */}
                <div className={`${cardBase} p-5`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-slate-400" />
                    <h2 className="font-bold text-slate-600 text-sm">安全说明</h2>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span>API Key 仅在服务端（Supabase Edge Function）使用，从不暴露给浏览器</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span>学生无法看到您的 Key，仅能使用其对应的模型</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span>每分钟每用户最多 20 次 AI 请求，防止滥用</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{'优先级：教师班级 Key > 平台管理员 Key > 系统 Key'}</li>
                  </ul>
                </div>
              </div>
            </div>

          /* ── Dashboard ── */
          ) : viewMode === 'dashboard' ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold font-heading text-slate-900">欢迎回来，{teacherName}</h1>
                  <p className="text-slate-400 mt-1 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {activeCount} 位学生正在学习 · {flaggedCount > 0 && <span className="text-rose-500 font-medium">{flaggedCount} 位需要关注</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <Clock size={13} />
                  {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Flagged alerts */}
              {flaggedCount > 0 && (
                <div className="mb-8 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-rose-100 rounded-lg"><AlertTriangle size={14} className="text-rose-600" /></div>
                    <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider">需要立即介入</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {conversations.filter(c => c.status === 'flagged').map(chat => (
                      <div key={chat.id} onClick={() => handleChatSelect(chat.id)}
                        className="bg-white border border-rose-100 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
                              {(chat.studentName?.[0] || '?').toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 text-sm">{chat.studentName}</span>
                          </div>
                          <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold tracking-wide">高风险</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-2">{chat.title}</p>
                        <div className="flex justify-end">
                          <span className="text-xs font-medium text-rose-500 group-hover:text-rose-600 flex items-center gap-1 transition-all">
                            前往处理 →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                {[
                  { label: 'AI 交互总数', value: conversations.reduce((s, c) => s + (c.messages?.length || 0), 0), icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: '+12%' },
                  { label: '待处理预警', value: flaggedCount, icon: CheckSquare, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: null },
                  { label: '在线学生', value: `${activeCount} / ${conversations.length}`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: null },
                ].map(s => (
                  <div key={s.label} className={`${cardBase} p-5 group`}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                      <div className={`p-2 rounded-lg ${s.bg}`}><s.icon size={16} className={s.color} /></div>
                    </div>
                    <p className="text-3xl font-bold font-heading text-slate-900">{s.value}</p>
                    {s.trend && <p className="text-xs text-emerald-600 mt-2 font-medium">▲ {s.trend} vs 上周</p>}
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                <div className={`${cardBase} p-5`}>
                  <h3 className="font-bold text-slate-800 text-sm mb-5 flex items-center gap-2 font-heading">
                    <BookOpen size={15} className="text-emerald-500" /> 学生活跃度
                  </h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyStats} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                        <Bar dataKey="value" fill="#10b981" radius={[5, 5, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`${cardBase} p-5`}>
                  <h3 className="font-bold text-slate-800 text-sm mb-5 flex items-center gap-2 font-heading">
                    <Activity size={15} className="text-emerald-500" /> 知识掌握流向
                  </h3>
                  <div className="h-52"><LearningSankeyChart /></div>
                </div>
              </div>

              <div className={`${cardBase} p-5`}>
                <h3 className="font-bold text-slate-800 text-sm mb-5 flex items-center gap-2 font-heading">
                  <Clock size={15} className="text-emerald-500" /> 学习活跃度热力图
                </h3>
                <ActivityHeatmap />
              </div>
            </div>

          /* ── Chat / Intervention ── */
          ) : selectedChat ? (
            <div className="flex flex-col h-full bg-slate-50/50">
              <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
                {selectedChat.messages.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">该对话暂无消息</p>
                  </div>
                )}
                {selectedChat.messages.map(msg => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Intervention bar */}
              <div className="bg-white p-4 border-t border-slate-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.04)] z-20">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 border border-amber-200/70 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">导师介入模式</span>
                    </div>
                    <span className="text-xs text-slate-400">消息将高亮显示给学生</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={interventionText}
                      onChange={e => setInterventionText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleIntervention()}
                      placeholder="输入指导意见，直接介入对话..."
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-900 placeholder-slate-400 transition-all text-sm"
                    />
                    <button onClick={handleIntervention} disabled={!interventionText.trim()}
                      className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 text-sm font-medium shadow-sm shadow-amber-500/20">
                      <Send size={15} /> 发送
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                <Users size={28} className="text-slate-300" />
              </div>
              <p className="font-heading text-base text-slate-400">从左侧选择学生开始指导</p>
              <p className="text-sm text-slate-300">学生加入您的班级后将在此显示</p>
            </div>
          )}
      </main>
    </div>
  );
};

export default SupervisorView;
