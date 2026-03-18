import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Send, Loader2, ChevronDown, Cpu, Paperclip, FileText,
    XCircle, Network, PanelRightOpen, PanelRightClose, Plus, Minus, Type, Sun, Moon,
    Search, BookOpen, ExternalLink, ChevronRight, Sparkles as SparklesIcon,
    Lightbulb, MessageSquare, ArrowRight, Copy, Trash2, Download, MoreVertical, Code, BookText, Check
} from 'lucide-react';
import { Conversation, Message, Theme, Locale } from '@/types';
import ChatBubble from '@/shared/components/ChatBubble';
import KnowledgeGraph from './KnowledgeGraph';
import AITutorAvatar from '@/shared/components/AITutorAvatar';
import { AI_CONFIGS } from '@/services/RealAIService';
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
}

const AI_MODELS = {
    'deepseek-chat': { id: 'deepseek-chat', name: 'DeepSeek', description: '快速响应', color: 'bg-blue-500' },
    'deepseek-reasoner': { id: 'deepseek-reasoner', name: 'DeepSeek R', description: '深度推理', color: 'bg-purple-500' },
    'glm-4.7': { id: 'glm-4.7', name: 'GLM-4', description: '学术专业', color: 'bg-emerald-500' },
};

type RightPanelTab = 'graph' | 'sources' | null;
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

    // Nature theme colors
    const colors = {
        bg: isDark ? '#1c1917' : '#fafaf9',
        card: isDark ? '#292524' : '#ffffff',
        border: isDark ? '#44403c' : '#e7e5e4',
        text: isDark ? '#fafaf9' : '#1c1917',
        textSecondary: isDark ? '#a8a29e' : '#78716c',
        primary: '#10b981',
    };

    return (
        <div className={`flex h-full w-full relative overflow-hidden ${fontSizeClass}`} style={{ backgroundColor: colors.bg }}>
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b sticky top-0 backdrop-blur-md z-10" style={{ backgroundColor: isDark ? 'rgba(28, 25, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: colors.border }}>
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
                                <div className="absolute top-full right-0 mt-2 w-44 rounded-xl border shadow-xl p-1.5 z-50" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    {Object.values(AI_MODELS).map(m => (
                                        <button key={m.id} onClick={() => { onModelSelect(m.id); setIsModelMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all" style={{ backgroundColor: selectedModel === m.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: selectedModel === m.id ? colors.primary : colors.text }}>
                                            <span className={`w-2 h-2 rounded-full ${m.color}`}></span>
                                            <div className="flex-1 text-left">
                                                <div className="font-semibold">{m.name}</div>
                                                <div className="text-[10px] opacity-70">{m.description}</div>
                                            </div>
                                        </button>
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
                            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                                        <SparklesIcon size={36} className="text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-md">
                                        <AITutorAvatar size="sm" theme={theme} />
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>{isEN ? 'Socratic Academic Tutor' : '苏格拉底式学术导师'}</h2>
                                <p className="text-sm mb-8 max-w-md" style={{ color: colors.textSecondary }}>{isEN ? 'I guide your thinking through questions, not answers.' : '我通过追问引导你思考，而非直接给出答案。'}</p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full mb-8">
                                    {quickPrompts.map((prompt, idx) => (
                                        <button key={idx} onClick={() => { setInputValue(prompt.text); textareaRef.current?.focus(); }} className="p-4 rounded-xl border transition-all hover:scale-105 cursor-pointer" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 mx-auto bg-emerald-500/10 text-emerald-500">{prompt.icon}</div>
                                            <h3 className="font-semibold text-xs" style={{ color: colors.text }}>{prompt.text.slice(0, 15)}...</h3>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <span className="text-xs" style={{ color: colors.textSecondary }}>{isEN ? 'Try asking:' : '试试询问：'}</span>
                                    {suggestionPrompts.map((suggestion, idx) => (
                                        <button key={idx} onClick={() => { setInputValue(suggestion); textareaRef.current?.focus(); }} className="px-3 py-1.5 rounded-full text-xs transition-all hover:scale-105" style={{ backgroundColor: isDark ? '#292524' : '#f5f5f4', color: colors.text }}>
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
                                <div className="px-4 py-3 rounded-2xl rounded-tl-none border shadow-sm max-w-2xl" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                                    {streamingContent ? (
                                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm"><Loader2 size={14} className="animate-spin text-emerald-500" /> <span style={{ color: colors.textSecondary }}>{isEN ? 'Thinking...' : '思考中...'}</span></div>
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
                </div>
            )}
        </div>
    );
};

export default StudentChatView;
