import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Bot, Loader2, ChevronDown, Cpu, Paperclip, FileText,
    XCircle, Network, PanelRightOpen, PanelRightClose, Plus, Minus, Type, Sun, Moon
} from 'lucide-react';
import { Conversation, Message, Theme, Locale, Role } from '@/types';
import ChatBubble from '@/shared/components/ChatBubble';
import KnowledgeGraph from './KnowledgeGraph';
import { AI_CONFIGS } from '@/services/RealAIService';

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
}

const AI_MODELS = {
    'deepseek-chat': { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '快速响应' },
    'deepseek-reasoner': { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '深度推理' },
    'glm-4.7': { id: 'glm-4.7', name: '智谱 GLM-4', description: '学术专业' },
};

const StudentChatView: React.FC<StudentChatViewProps> = ({
    activeChat, messages, loading, streamingContent,
    onSendMessage, onEditMessage, selectedModel, onModelSelect,
    theme, onToggleTheme, locale
}) => {
    const [inputValue, setInputValue] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [showGraph, setShowGraph] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

    // UI Customization State
    const [chatWidth, setChatWidth] = useState<'narrow' | 'normal' | 'wide'>('normal');
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isDark = theme === 'dark';

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent, loading]);

    // Click outside model menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setIsModelMenuOpen(false);
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

    const handleSubmit = () => {
        if ((!inputValue.trim() && !attachedFile) || loading) return;

        const content = inputValue;
        const file = attachedFile || undefined;

        // 1. Clear UI immediately (Optimistic UI)
        setInputValue('');
        setAttachedFile(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // 2. Fire and forget
        onSendMessage(content, file);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    };

    const getMaxWidthClass = () => {
        switch (chatWidth) {
            case 'narrow': return 'max-w-2xl';
            case 'wide': return 'max-w-6xl';
            default: return 'max-w-4xl';
        }
    };

    const getFontSizeClass = () => {
        switch (fontSize) {
            case 'sm': return 'text-sm';
            case 'lg': return 'text-lg';
            default: return 'text-base';
        }
    };

    return (
        <div className={`flex h-full w-full relative overflow-hidden bg-transparent ${getFontSizeClass()}`}>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">

                {/* Header */}
                <header className={`h-14 px-6 flex items-center justify-between border-b sticky top-0 backdrop-blur-md z-10 
           ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}
        `}>
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex flex-col">
                            <h2 className="font-bold truncate text-sm">{activeChat.title}</h2>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <Cpu size={10} />
                                <span>{AI_MODELS[selectedModel as keyof typeof AI_MODELS]?.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        {/* Display Settings */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-2">
                            <button onClick={() => setChatWidth('narrow')} className={`p-1 rounded ${chatWidth === 'narrow' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`} title="窄"><Minus size={12} className="rotate-90" /></button>
                            <button onClick={() => setChatWidth('normal')} className={`p-1 rounded ${chatWidth === 'normal' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`} title="标准"><Minus size={12} className="rotate-90 scale-125" /></button>
                            <button onClick={() => setChatWidth('wide')} className={`p-1 rounded ${chatWidth === 'wide' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`} title="宽"><Minus size={12} className="rotate-90 scale-150" /></button>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-2">
                            <button onClick={() => setFontSize('sm')} className={`p-1 rounded ${fontSize === 'sm' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`} title="小字"><Type size={10} /></button>
                            <button onClick={() => setFontSize('base')} className={`p-1 rounded ${fontSize === 'base' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`} title="中字"><Type size={12} /></button>
                            <button onClick={() => setFontSize('lg')} className={`p-1 rounded ${fontSize === 'lg' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`} title="大字"><Type size={14} /></button>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-2">
                            <button
                                onClick={onToggleTheme}
                                className={`p-1 rounded ${theme === 'dark' ? 'bg-slate-600 text-yellow-400 shadow-sm' : 'text-slate-400 hover:text-indigo-500'}`}
                                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                            </button>
                        </div>

                        <div className={`h-4 w-[1px] ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

                        {/* Model Selector */}
                        <div className="relative" ref={modelMenuRef}>
                            <button
                                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} text-slate-500`}
                            >
                                {AI_MODELS[selectedModel as keyof typeof AI_MODELS]?.name}
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isModelMenuOpen && (
                                <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl border shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                    {Object.values(AI_MODELS).map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => { onModelSelect(m.id); setIsModelMenuOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs rounded-lg ${selectedModel === m.id ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            <div className="font-bold">{m.name}</div>
                                            <div className="text-[10px] opacity-70">{m.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowGraph(!showGraph)}
                            className={`p-2 rounded-md transition-colors ${showGraph ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                            title="切换侧边图谱"
                        >
                            <Network size={18} />
                        </button>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className={`${getMaxWidthClass()} mx-auto px-4 py-6 space-y-6 transition-all duration-300`}>
                        {messages.map(msg => (
                            <ChatBubble
                                key={msg.id}
                                message={msg}
                                onEdit={onEditMessage ? (newContent) => onEditMessage(msg.id, newContent) : undefined}
                            />
                        ))}

                        {loading && (
                            <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div className={`px-4 py-3 rounded-2xl rounded-tl-none border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-100 text-slate-700'}`}>
                                    {streamingContent ? (
                                        <div className="text-sm whitespace-pre-wrap leading-relaxed markdown-body">{streamingContent}</div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> 思考中...</div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-4 pb-4">
                    <div className={`${getMaxWidthClass()} mx-auto rounded-3xl p-2 border shadow-lg transition-all duration-300 ${isDark ? 'bg-slate-800 border-slate-700 focus-within:ring-1 focus-within:ring-slate-600' : 'bg-white border-slate-200 focus-within:ring-1 focus-within:ring-slate-300'}`}>

                        {/* File Pill */}
                        {attachedFile && (
                            <div className="mx-2 mt-1 mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium animate-in fade-in zoom-in-95">
                                <FileText size={12} />
                                <span className="max-w-[150px] truncate">{attachedFile.name}</span>
                                <button onClick={() => setAttachedFile(null)} className="hover:text-indigo-800 dark:hover:text-indigo-200"><XCircle size={14} /></button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            {/* Attachment */}
                            <div className="relative shrink-0 pb-1 pl-1">
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                    title="上传文件"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Text Input */}
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入您的问题..."
                                rows={1}
                                className={`flex-1 bg-transparent border-none focus:ring-0 px-2 py-3 min-h-[44px] max-h-[150px] resize-none text-sm outline-none leading-relaxed ${isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`}
                                disabled={loading}
                            />

                            {/* Send Button */}
                            <div className="shrink-0 pb-1 pr-1">
                                <button
                                    onClick={handleSubmit}
                                    disabled={(!inputValue.trim() && !attachedFile) || loading}
                                    className={`p-2 rounded-full transition-all duration-200 
                          ${(!inputValue.trim() && !attachedFile)
                                            ? (isDark ? 'bg-slate-700 text-slate-500 opacity-50' : 'bg-slate-100 text-slate-300')
                                            : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-2 text-[10px] text-slate-400 opacity-60">
                        AI 模型由 DeepSeek & Zhipu 提供支持 · 内容仅供参考
                    </div>
                </div>

            </div>

            {/* Right Panel: Knowledge Graph */}
            <div className={`
         border-l transition-all duration-300 ease-in-out relative
         ${showGraph ? 'w-[400px]' : 'w-0'} 
         ${isDark ? 'bg-[#0B101E] border-slate-800' : 'bg-white border-slate-200'}
      `}>
                <div className="w-[400px] h-full flex flex-col">
                    <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
                        <span className="font-bold text-xs uppercase tracking-widest">实时图谱</span>
                        <button onClick={() => setShowGraph(false)} className="text-slate-400 hover:text-indigo-500"><PanelRightClose size={18} /></button>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden relative">
                        {showGraph && <KnowledgeGraph messages={messages} theme={theme === 'dark' ? 'dark' : 'light'} />}
                    </div>
                    <div className="h-1/3 border-t p-4 text-xs space-y-2 overflow-y-auto">
                        <div className="font-bold text-slate-500">关键洞察</div>
                        {messages.length > 0 ? (
                            <div className="space-y-2">
                                <div className="p-2 rounded bg-indigo-500/5 border border-indigo-500/10 text-indigo-500">
                                    已分析 {messages.reduce((acc, m) => acc + m.content.split(' ').length, 0)} 个关键词节点。
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400">开始对话以生成知识节点。</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentChatView;
