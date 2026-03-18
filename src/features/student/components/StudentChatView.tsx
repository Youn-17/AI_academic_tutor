import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Send, Loader2, ChevronDown, Cpu, Paperclip, FileText,
    XCircle, Network, PanelRightOpen, PanelRightClose, Plus, Minus, Type, Sun, Moon,
    Search, BookOpen, ExternalLink, ChevronRight, Sparkles as SparklesIcon,
    Lightbulb, MessageSquare, ArrowRight, Copy, Trash2, Download, MoreVertical, Code, BookText, Check,
    GitCompare, Zap, Repeat, Clock
} from 'lucide-react';
import { Conversation, Message, Role, Theme, Locale } from '@/types';
import ChatBubble from '@/shared/components/ChatBubble';
import KnowledgeGraph from './KnowledgeGraph';
import AITutorAvatar from '@/shared/components/AITutorAvatar';
import { AI_MODELS, MODEL_CATEGORIES, COMPARE_RECOMMENDATIONS, compareAIModels } from '@/services/RealAIService';
import * as SemanticScholar from '@/services/SemanticScholarService';
import type { PaperBasic } from '@/services/SemanticScholarService';

interface StudentChatViewProps {
    activeChat: Conversation;
    messages: Message[];
    loading: boolean;
    streamingContent: string;
    onSendMessage: (content: string, file?: File) => Promise<void>;
    onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
    selectedModel: string;
    onModelSelect: (modelId: string) => void;
    theme: Theme;
    onToggleTheme: () => void;
    locale: Locale;
    onLocaleChange: (locale: Locale) => void;
    onClearChat?: () => Promise<void>;
    onExportChat?: () => Promise<void>;
    onCompareModels?: (models: string[]) => Promise<void>;
}

type RightPanelTab = 'graph' | 'sources' | 'compare' | null;
type ChatWidth = 'narrow' | 'normal' | 'wide';
type FontSize = 'sm' | 'base' | 'lg';

const StudentChatView: React.FC<StudentChatViewProps> = ({
    activeChat, messages, loading, streamingContent,
    onSendMessage, onEditMessage, selectedModel, onModelSelect,
    theme, onToggleTheme, locale, onLocaleChange, onClearChat, onExportChat
}) => {
    const [inputValue, setInputValue] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);

    // UI State
    const [chatWidth, setChatWidth] = useState<ChatWidth>('normal');
    const [fontSize, setFontSize] = useState<FontSize>('base');
    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>(null);

    // Semantic Scholar State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PaperBasic[]>([]);
    const [selectedPaper, setSelectedPaper] = useState<PaperBasic | null>(null);
    const [paperDetails, setPaperDetails] = useState<PaperBasic | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // AI Compare State
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCompareModels, setSelectedCompareModels] = useState<string[]>(['gpt-4o-mini', 'deepseek-chat', 'claude-3-5-haiku']);
    const [compareResults, setCompareResults] = useState<{ model: string; response: string; error?: string }[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [showComparePanel, setShowComparePanel] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isDark = theme === 'dark';
    const isEN = locale === 'en';

    // Computed values
    const maxWidthClass = useMemo(() => {
        const map = { narrow: 'max-w-2xl', normal: 'max-w-4xl', wide: 'max-w-6xl' };
        return map[chatWidth];
    }, [chatWidth]);

    const fontSizeClass = useMemo(() => {
        const map = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' };
        return map[fontSize];
    }, [fontSize]);

    // Auto-scroll
    useEffect(() => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    }, [messages, streamingContent, loading]);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setIsModelMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [inputValue]);

    // Open sources panel on search results
    useEffect(() => {
        if (searchResults.length > 0 && !rightPanelTab) {
            setRightPanelTab('sources');
        }
    }, [searchResults, rightPanelTab]);

    // Handlers
    const handleSubmit = useCallback(() => {
        if ((!inputValue.trim() && !attachedFile) || loading) return;
        const content = inputValue;
        setInputValue('');
        setAttachedFile(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        onSendMessage(content, attachedFile || undefined);
    }, [inputValue, attachedFile, loading, onSendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    }, []);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const result = await SemanticScholar.searchPapers({ query: searchQuery, limit: 10 });
            setSearchResults(result.data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    const handlePaperClick = useCallback(async (paper: PaperBasic) => {
        setSelectedPaper(paper);
        setIsLoadingDetails(true);
        try {
            const result = await SemanticScholar.getPaperDetails(paper.paperId);
            setPaperDetails(result.data);
        } catch (error) {
            setPaperDetails(paper);
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

    const handleInsertPaper = useCallback(() => {
        if (!paperDetails) return;
        const citation = SemanticScholar.formatCitation(paperDetails, 'apa');
        setInputValue(`请帮我分析这篇论文：\n\n${citation}\n\n${paperDetails.abstract ? `摘要：${paperDetails.abstract}` : ''}`);
        setRightPanelTab(null);
        textareaRef.current?.focus();
    }, [paperDetails]);

    const handleCopyMessage = useCallback((content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }, []);

    // AI Compare handlers
    const handleToggleCompareMode = useCallback(() => {
        setCompareMode(!compareMode);
        if (!compareMode) {
            setShowComparePanel(true);
            setRightPanelTab('compare');
        }
    }, [compareMode]);

    const handleRunCompare = useCallback(async () => {
        if (messages.length === 0) return;

        setIsComparing(true);
        setCompareResults([]);

        // Get last user message
        const lastUserMessage = [...messages].reverse().find(m => m.sender === Role.STUDENT);
        if (!lastUserMessage) return;

        const chatHistory = messages.slice(0, messages.indexOf(lastUserMessage)).map(m => ({
            role: (m.sender === Role.STUDENT ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
        }));

        try {
            const { AI_CONFIGS: configs } = await import('@/services/RealAIService');
            const selectedConfigs = selectedCompareModels
                .map(id => AI_MODELS[id])
                .filter(Boolean)
                .map(m => ({ provider: m.provider, model: m.model }));

            if (selectedConfigs.length === 0) {
                setCompareResults([{ model: 'Error', response: isEN ? 'Please select models' : '请选择模型', error: 'No models selected' }]);
                return;
            }

            const results = await compareAIModels(chatHistory, selectedConfigs);
            setCompareResults(results);
            setShowComparePanel(true);
            setRightPanelTab('compare');
        } catch (error) {
            setCompareResults([{ model: 'Error', response: (error as Error).message, error: 'Request failed' }]);
        } finally {
            setIsComparing(false);
        }
    }, [messages, selectedCompareModels, isEN]);

    const toggleCompareModel = useCallback((modelId: string) => {
        setSelectedCompareModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : prev.length < 4
                ? [...prev, modelId]
                : prev
        );
    }, []);

    const quickComparePresets = useMemo(() => [
        { name: isEN ? 'Fast & Free' : '快速免费', models: ['gpt-4o-mini', 'deepseek-chat', 'claude-3-5-haiku'] },
        { name: isEN ? 'Premium' : '高级模型', models: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-2.5-pro'] },
        { name: isEN ? 'Reasoning' : '推理专用', models: ['deepseek-reasoner', 'claude-3-5-sonnet', 'glm-4-plus'] },
    ], [isEN]);

    const quickPrompts = useMemo(() => isEN ? [
        { text: 'Help me clarify my research question', icon: <MessageSquare size={14} /> },
        { text: 'What theoretical frameworks could I use?', icon: <Code size={14} /> },
        { text: 'How do I find relevant literature?', icon: <Search size={14} /> },
        { text: 'Critique my methodology', icon: <BookText size={14} /> },
    ] : [
        { text: '帮我澄清研究问题', icon: <MessageSquare size={14} /> },
        { text: '我可以用什么理论框架？', icon: <Code size={14} /> },
        { text: '如何找到相关文献？', icon: <Search size={14} /> },
        { text: '批评我的方法论', icon: <BookText size={14} /> },
    ], [isEN]);

    const suggestionPrompts = useMemo(() => isEN ? [
        'How do I narrow my research topic?',
        'What methods suit my study?',
    ] : [
        '如何缩小研究选题范围？',
        '什么方法适合我的研究？',
    ], [isEN]);

    // Deep navy academic theme
    const colors = {
        bg: isDark ? '#07111A' : '#f8fafc',
        card: isDark ? '#0D1E2C' : '#ffffff',
        border: isDark ? 'rgba(16,185,129,0.12)' : '#e2e8f0',
        text: isDark ? '#f1f5f9' : '#0f172a',
        textSecondary: isDark ? '#64748b' : '#64748b',
        primary: '#10b981',
        headerBg: isDark ? 'rgba(7,17,26,0.92)' : 'rgba(255,255,255,0.95)',
    };

    return (
        <div className={`flex h-full w-full relative overflow-hidden ${fontSizeClass}`} style={{ backgroundColor: colors.bg }}>
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b sticky top-0 backdrop-blur-md z-10" style={{ backgroundColor: colors.headerBg, borderColor: colors.border }}>
                    {/* Left: Chat Info */}
                    <div className="flex items-center gap-3 min-w-0">
                        <AITutorAvatar size="md" theme={theme} animate={loading} />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold truncate text-sm" style={{ color: colors.text }}>{activeChat.title}</h2>
                                {messages.length === 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500">{isEN ? 'New' : '新对话'}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]" style={{ color: colors.textSecondary }}>
                                <span>{AI_MODELS[selectedModel as keyof typeof AI_MODELS]?.name}</span>
                                <span>·</span>
                                <span className="text-emerald-500">{isEN ? 'Socratic' : '苏格拉底式'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Width Control */}
                        <div className="hidden md:flex items-center gap-1 rounded-lg p-0.5 mr-1" style={{ backgroundColor: isDark ? '#292524' : '#f5f5f4' }}>
                            <button onClick={() => setChatWidth('narrow')} className={`p-1 rounded transition-all ${chatWidth === 'narrow' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><Minus size={12} className="rotate-90" /></button>
                            <button onClick={() => setChatWidth('normal')} className={`p-1 rounded transition-all ${chatWidth === 'normal' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><Minus size={12} className="rotate-90 scale-125" /></button>
                            <button onClick={() => setChatWidth('wide')} className={`p-1 rounded transition-all ${chatWidth === 'wide' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><Minus size={12} className="rotate-90 scale-150" /></button>
                        </div>

                        {/* Font Size */}
                        <div className="hidden sm:flex items-center gap-1 rounded-lg p-0.5 mr-1" style={{ backgroundColor: isDark ? '#292524' : '#f5f5f4' }}>
                            <button onClick={() => setFontSize('sm')} className={`p-1 rounded transition-all ${fontSize === 'sm' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><Type size={10} /></button>
                            <button onClick={() => setFontSize('base')} className={`p-1 rounded transition-all ${fontSize === 'base' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><Type size={12} /></button>
                            <button onClick={() => setFontSize('lg')} className={`p-1 rounded transition-all ${fontSize === 'lg' ? 'bg-white shadow-sm' : 'text-slate-400'}`}><Type size={14} /></button>
                        </div>

                        {/* Theme Toggle */}
                        <button onClick={onToggleTheme} className="p-2 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-800">
                            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
                        </button>

                        {/* Language Switcher */}
                        <button onClick={() => {
                            const locales: Locale[] = ['zh-CN', 'zh-TW', 'en'];
                            const idx = locales.indexOf(locale);
                            onLocaleChange(locales[(idx + 1) % 3]);
                        }} className="p-2 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-800 hidden sm:flex" title="Language / 语言">
                            <span className="text-xs font-medium">{locale === 'en' ? 'EN' : locale === 'zh-CN' ? '简' : '繁'}</span>
                        </button>

                        <div className="h-5 w-px mx-1" style={{ backgroundColor: colors.border }}></div>

                        {/* Model Selector */}
                        <div className="relative" ref={modelMenuRef}>
                            <button onClick={() => setIsModelMenuOpen(!isModelMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: isModelMenuOpen ? (isDark ? '#292524' : '#f5f5f4') : 'transparent', color: colors.textSecondary }}>
                                <span className="hidden sm:inline">{AI_MODELS[selectedModel as keyof typeof AI_MODELS]?.name}</span>
                                <ChevronDown size={12} className={`transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isModelMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-52 max-h-80 overflow-y-auto rounded-xl border shadow-xl p-1.5 z-50" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    {/* Model Categories */}
                                    {Object.entries(MODEL_CATEGORIES).map(([catKey, category]) => (
                                        <div key={catKey} className="mb-2 last:mb-0">
                                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: colors.textSecondary }}>
                                                <span className={`w-1.5 h-1.5 rounded ${category.color}`}></span>
                                                {category.name}
                                            </div>
                                            {category.models.map(modelId => {
                                                const m = AI_MODELS[modelId];
                                                if (!m) return null;
                                                return (
                                                    <button
                                                        key={modelId}
                                                        onClick={() => { onModelSelect(modelId); setIsModelMenuOpen(false); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all"
                                                        style={{ backgroundColor: selectedModel === modelId ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: selectedModel === modelId ? colors.primary : colors.text }}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${m.color}`}></span>
                                                        <div className="flex-1 text-left">
                                                            <div className="font-semibold">{m.name}</div>
                                                            <div className="text-[10px] opacity-70">{m.description}</div>
                                                        </div>
                                                        {m.category === 'premium' && (
                                                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-600">PRO</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* More Menu */}
                        <div className="relative" ref={moreMenuRef}>
                            <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="p-2 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-800">
                                <MoreVertical size={18} style={{ color: colors.textSecondary }} />
                            </button>

                            {isMoreMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-44 rounded-xl border shadow-xl p-1.5 z-50" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <button onClick={() => { onExportChat?.(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" style={{ color: colors.text }}>
                                        <Download size={14} /> {isEN ? 'Export' : '导出'}
                                    </button>
                                    <button onClick={() => { onClearChat?.(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-red-500">
                                        <Trash2 size={14} /> {isEN ? 'Clear' : '清空'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Panel Toggles */}
                        <button onClick={handleToggleCompareMode} className={`p-2 rounded-lg transition-all ${compareMode || rightPanelTab === 'compare' ? 'bg-purple-500/10 text-purple-500' : ''}`} title={isEN ? 'Compare AI Models' : 'AI 模型对比'}>
                            <GitCompare size={18} />
                        </button>
                        <button onClick={() => setRightPanelTab(rightPanelTab === 'sources' ? null : 'sources')} className={`p-2 rounded-lg transition-all ${rightPanelTab === 'sources' ? 'bg-emerald-500/10 text-emerald-500' : ''}`}>
                            <BookOpen size={18} />
                        </button>
                        <button onClick={() => setRightPanelTab(rightPanelTab === 'graph' ? null : 'graph')} className={`p-2 rounded-lg transition-all ${rightPanelTab === 'graph' ? 'bg-emerald-500/10 text-emerald-500' : ''}`}>
                            <Network size={18} />
                        </button>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className={`${maxWidthClass} mx-auto px-4 py-6 space-y-6`}>
                        {/* Welcome State */}
                        {messages.length === 0 && !loading && (
                            <div className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
                                {/* Hero Icon */}
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 shadow-2xl shadow-emerald-500/25">
                                        <SparklesIcon size={40} className="text-white" />
                                    </div>
                                    {/* Orbit ring */}
                                    <div className="absolute inset-0 rounded-3xl border-2 border-emerald-500/20 scale-125 animate-pulse" />
                                    <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                                        <AITutorAvatar size="sm" theme={theme} />
                                    </div>
                                </div>

                                <h2 className="text-3xl font-bold mb-3 font-heading" style={{ color: colors.text }}>
                                    {isEN ? 'Socratic Academic Tutor' : '苏格拉底式 AI 导师'}
                                </h2>
                                <p className="text-sm mb-2 max-w-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                                    {isEN ? 'I guide your thinking through questions — not just answers.' : '通过追问引导你深入思考，而非仅仅给出答案。'}
                                </p>
                                <div className="flex items-center gap-2 mb-10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-medium" style={{ color: colors.primary }}>{isEN ? 'Ready to explore' : '随时开始探索'}</span>
                                </div>

                                {/* Quick Prompts */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full mb-8">
                                    {quickPrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setInputValue(prompt.text); textareaRef.current?.focus(); }}
                                            className="p-4 rounded-2xl border text-left transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/5 active:scale-[0.98] group"
                                            style={{ backgroundColor: colors.card, borderColor: colors.border }}
                                        >
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                                                {prompt.icon}
                                            </div>
                                            <h3 className="font-semibold text-xs leading-snug" style={{ color: colors.text }}>{prompt.text}</h3>
                                        </button>
                                    ))}
                                </div>

                                {/* Suggestion Pills */}
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <span className="text-xs" style={{ color: colors.textSecondary }}>{isEN ? 'Try:' : '试试：'}</span>
                                    {suggestionPrompts.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setInputValue(suggestion); textareaRef.current?.focus(); }}
                                            className="px-3.5 py-1.5 rounded-full text-xs transition-all hover:scale-105 border"
                                            style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#f1f5f9', color: colors.text, borderColor: colors.border }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.map(msg => (
                            <div key={msg.id} className="group relative">
                                <ChatBubble message={msg} onEdit={onEditMessage ? (c) => onEditMessage(msg.id, c) : undefined} />
                                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={() => handleCopyMessage(msg.content, msg.id)} className="p-1.5 rounded-lg shadow-md transition-all hover:scale-110" style={{ backgroundColor: colors.card }}>
                                        {copiedMessageId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} style={{ color: colors.textSecondary }} />}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Loading */}
                        {loading && (
                            <div className="flex items-start gap-3 animate-in fade-in">
                                <AITutorAvatar size="lg" theme={theme} animate />
                                <div className="px-5 py-4 rounded-2xl rounded-tl-none border shadow-sm max-w-2xl" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                                    {streamingContent ? (
                                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="flex gap-1">
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                                ))}
                                            </div>
                                            <span style={{ color: colors.textSecondary }}>{isEN ? 'Thinking...' : '思考中...'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input */}
                <div className="px-4 pb-4">
                    <div className={`${maxWidthClass} mx-auto rounded-2xl p-2 border shadow-lg transition-all`} style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        {attachedFile && (
                            <div className="mx-2 mt-1 mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium">
                                <FileText size={12} /><span className="max-w-[150px] truncate">{attachedFile.name}</span><button onClick={() => setAttachedFile(null)}><XCircle size={14} /></button>
                            </div>
                        )}

                        {showSearchInput && (
                            <div className="mx-2 mt-2 mb-2 flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ backgroundColor: isDark ? '#1c1917' : '#f5f5f4', borderColor: colors.border }}>
                                    <Search size={16} style={{ color: colors.textSecondary }} />
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={isEN ? 'Search papers...' : '搜索论文...'} className="flex-1 bg-transparent border-none outline-none text-sm" style={{ color: colors.text }} />
                                    {isSearching ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : searchQuery ? <button onClick={handleSearch} className="text-emerald-500"><SparklesIcon size={16} /></button> : null}
                                </div>
                                <button onClick={() => setShowSearchInput(false)} style={{ color: colors.textSecondary }}><XCircle size={16} /></button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <div className="flex items-center gap-1 shrink-0 pb-1 pl-1">
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full transition-all hover:scale-110" style={{ color: colors.textSecondary }}><Plus size={20} /></button>
                                <button onClick={() => setShowSearchInput(!showSearchInput)} className={`p-2 rounded-full transition-all hover:scale-110 ${showSearchInput ? 'text-emerald-500 bg-emerald-500/10' : ''}`} style={{ color: showSearchInput ? undefined : colors.textSecondary }}><Search size={20} /></button>
                            </div>

                            <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={messages.length === 0 ? (isEN ? 'What would you like to explore?' : '今天想探索什么？') : (isEN ? 'Continue...' : '继续讨论...')} rows={1} className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3 min-h-[44px] max-h-[150px] resize-none text-sm outline-none leading-relaxed" style={{ color: colors.text }} disabled={loading} />

                            <div className="shrink-0 pb-1 pr-1">
                                <button onClick={handleSubmit} disabled={(!inputValue.trim() && !attachedFile) || loading} className="p-3 rounded-full transition-all shadow-md" style={{ backgroundColor: (!inputValue.trim() && !attachedFile) || loading ? (isDark ? '#292524' : '#e7e5e4') : '#10b981', color: ((!inputValue.trim() && !attachedFile) || loading) ? colors.textSecondary : '#fff' }}>
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-3 flex items-center justify-center gap-2 text-[10px]" style={{ color: colors.textSecondary }}>
                        <span className="flex items-center gap-1"><SparklesIcon size={10} className="text-emerald-500" />{isEN ? 'Socratic tutoring' : '苏格拉底式'}</span>·<span>DeepSeek & Zhipu</span>·<span>{isEN ? 'For reference only' : '仅供参考'}</span>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            {rightPanelTab && (
                <div className="border-l transition-all w-[400px]" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    {rightPanelTab === 'sources' && (
                        <div className="w-full h-full flex flex-col">
                            <div className="h-14 border-b flex items-center justify-between px-4" style={{ borderColor: colors.border }}>
                                <div className="flex items-center gap-2"><BookOpen size={16} className="text-emerald-500" /><span className="font-bold text-xs" style={{ color: colors.text }}>{isEN ? 'Literature' : '文献来源'}</span></div>
                                <button onClick={() => setRightPanelTab(null)} style={{ color: colors.textSecondary }}><PanelRightClose size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {paperDetails ? (
                                    <div className="p-4 space-y-4">
                                        <button onClick={() => setPaperDetails(null)} className="text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}><ChevronRight size={14} className="rotate-180" />{isEN ? 'Back' : '返回'}</button>
                                        <h3 className="font-bold text-sm" style={{ color: colors.text }}>{paperDetails.title}</h3>
                                        <p className="text-xs" style={{ color: colors.textSecondary }}>{paperDetails.authors?.slice(0, 5).map(a => a.name).join(', ')} · {paperDetails.year}</p>
                                        {paperDetails.abstract && <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{paperDetails.abstract.slice(0, 500)}...</p>}
                                        <button onClick={handleInsertPaper} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs"><Send size={14} />{isEN ? 'Insert' : '插入'}</button>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-3">
                                        {searchResults.length > 0 ? searchResults.map((paper) => (
                                            <button key={paper.paperId} onClick={() => handlePaperClick(paper)} className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02]" style={{ borderColor: colors.border }}>
                                                <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10"><BookOpen size={14} className="text-emerald-500" /></div><div className="flex-1"><h4 className="font-semibold text-xs" style={{ color: colors.text }}>{paper.title}</h4><p className="text-[10px]" style={{ color: colors.textSecondary }}>{paper.authors?.slice(0, 2).map(a => a.name).join(', ')} · {paper.year}</p></div></div>
                                            </button>
                                        )) : <div className="text-center py-8" style={{ color: colors.textSecondary }}><Search size={24} className="mx-auto mb-2 opacity-50" /><p className="text-xs">{isEN ? 'Search papers' : '搜索论文'}</p></div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {rightPanelTab === 'graph' && (
                        <div className="w-full h-full flex flex-col">
                            <div className="h-14 border-b flex items-center justify-between px-4" style={{ borderColor: colors.border }}>
                                <span className="font-bold text-xs" style={{ color: colors.text }}>{isEN ? 'Knowledge Graph' : '知识图谱'}</span>
                                <button onClick={() => setRightPanelTab(null)} style={{ color: colors.textSecondary }}><PanelRightClose size={18} /></button>
                            </div>
                            <div className="flex-1 p-4"><KnowledgeGraph messages={messages} theme={theme} /></div>
                        </div>
                    )}

                    {/* AI Compare Panel */}
                    {rightPanelTab === 'compare' && (
                        <div className="w-full h-full flex flex-col">
                            <div className="h-14 border-b flex items-center justify-between px-4" style={{ borderColor: colors.border }}>
                                <div className="flex items-center gap-2">
                                    <GitCompare size={16} className="text-purple-500" />
                                    <span className="font-bold text-xs" style={{ color: colors.text }}>{isEN ? 'AI Model Compare' : 'AI 模型对比'}</span>
                                </div>
                                <button onClick={() => setRightPanelTab(null)} style={{ color: colors.textSecondary }}><PanelRightClose size={18} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Compare Controls */}
                                <div className="space-y-3">
                                    {/* Presets */}
                                    <div>
                                        <label className="text-xs font-medium mb-2 block" style={{ color: colors.textSecondary }}>{isEN ? 'Quick Select:' : '快速选择:'}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {quickComparePresets.map(preset => (
                                                <button
                                                    key={preset.name}
                                                    onClick={() => setSelectedCompareModels(preset.models)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCompareModels.length === preset.models.length && selectedCompareModels.every(m => preset.models.includes(m)) ? 'bg-purple-500 text-white' : ''}`}
                                                    style={{ backgroundColor: selectedCompareModels.length === preset.models.length && selectedCompareModels.every(m => preset.models.includes(m)) ? undefined : colors.card, border: colors.border }}
                                                >
                                                    {preset.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Model Selection */}
                                    <div>
                                        <label className="text-xs font-medium mb-2 block" style={{ color: colors.textSecondary }}>{isEN ? 'Select Models (max 4):' : '选择模型（最多4个）:'}</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(MODEL_CATEGORIES).map(([catKey, category]) => (
                                                <div key={catKey} className="space-y-1">
                                                    <div className="text-[10px] font-medium uppercase" style={{ color: colors.textSecondary }}>{category.name}</div>
                                                    {category.models.slice(0, 4).map(modelId => {
                                                        const m = AI_MODELS[modelId];
                                                        if (!m) return null;
                                                        const isSelected = selectedCompareModels.includes(modelId);
                                                        return (
                                                            <button
                                                                key={modelId}
                                                                onClick={() => toggleCompareModel(modelId)}
                                                                className={`px-2 py-1 rounded text-[10px] text-left transition-all ${isSelected ? 'text-white' : ''}`}
                                                                style={{
                                                                    backgroundColor: isSelected ? m.color : colors.card,
                                                                    border: isSelected ? undefined : colors.border,
                                                                    opacity: isSelected ? 1 : 0.8
                                                                }}
                                                            >
                                                                <span className="truncate block">{m.name}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Run Compare Button */}
                                    <button
                                        onClick={handleRunCompare}
                                        disabled={isComparing || messages.length === 0}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                                    >
                                        {isComparing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                        {isEN ? 'Compare Models' : '开始对比'}
                                    </button>
                                </div>

                                {/* Results */}
                                {compareResults.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                            {isEN ? 'Results' : '对比结果'}
                                        </div>
                                        {compareResults.map((result, idx) => {
                                            const modelInfo = AI_MODELS[result.model];
                                            return (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border p-3 transition-all hover:scale-[1.01]"
                                                    style={{ backgroundColor: colors.card, borderColor: result.error ? '#fca5a5' : colors.border }}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`w-2 h-2 rounded-full ${modelInfo?.color || 'bg-slate-500'}`}></span>
                                                        <span className="text-xs font-bold" style={{ color: colors.text }}>{modelInfo?.name || result.model}</span>
                                                        {result.error && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-600">Error</span>}
                                                    </div>
                                                    <div className="text-xs leading-relaxed max-h-32 overflow-y-auto" style={{ color: colors.text }}>
                                                        {result.error || result.response || isEN ? 'No response' : '无响应'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {compareResults.length === 0 && !isComparing && (
                                    <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                                        <GitCompare size={24} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">{isEN ? 'Select models and run comparison' : '选择模型后开始对比'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentChatView;
