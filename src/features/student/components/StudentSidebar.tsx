import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    LayoutDashboard, UserCircle, Presentation, Library,
    Plus, MoreVertical, Archive, Trash2, Edit2, LogOut, PanelLeftClose, PanelLeftOpen, Network,
    MessageSquare, Sparkles, Tag
} from 'lucide-react';
import { Conversation, Theme, Locale } from '@/types';
import { isSubmitEnter } from '@/lib/keyboard';

interface StudentSidebarProps {
    conversations: Conversation[];
    activeChatId: string;
    onSelectChat: (id: string) => void;
    onCreateChat: () => void;
    onDeleteChat: (id: string) => void;
    onArchiveChat: (id: string) => void;
    onRenameChat: (id: string, newTitle: string) => void;
    onUpdateTags?: (id: string, tags: string[]) => void;
    currentView: 'dashboard' | 'chat' | 'profile' | 'classroom' | 'knowledge' | 'graph';
    onSelectView: (view: 'dashboard' | 'chat' | 'profile' | 'classroom' | 'knowledge' | 'graph') => void;
    onLogout: () => void;
    theme: Theme;
    locale: Locale;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({
    conversations, activeChatId, onSelectChat, onCreateChat,
    onDeleteChat, onArchiveChat, onRenameChat, onUpdateTags,
    currentView, onSelectView, onLogout, theme, locale,
    isCollapsed, onToggleCollapse
}) => {
    const isDark = theme === 'dark';

    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [tagFilter, setTagFilter] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    useEffect(() => {
        const handleScroll = () => { if (menuOpenId) setMenuOpenId(null); };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [menuOpenId]);

    useEffect(() => {
        if (editingId && editInputRef.current) editInputRef.current.focus();
    }, [editingId]);

    const handleRenameSubmit = (id: string) => {
        if (editTitle.trim()) onRenameChat(id, editTitle.trim());
        setEditingId(null);
    };

    const handleMenuTrigger = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (menuOpenId === chatId) {
            setMenuOpenId(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            // clamp so the menu never spills past the right / bottom edge of the viewport
            const MENU_W = 152, MENU_H = 130;
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_W - 8));
            const top = rect.bottom + 5 + MENU_H > window.innerHeight ? Math.max(8, rect.top - MENU_H) : rect.bottom + 5;
            setMenuPosition({ top, left });
            setMenuOpenId(chatId);
        }
    };

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: locale === 'en' ? 'Dashboard' : '学习概览' },
        { id: 'classroom', icon: Presentation, label: locale === 'en' ? 'Classroom' : '课堂互动' },
        { id: 'knowledge', icon: Library, label: locale === 'en' ? 'Library' : '知识库' },
        { id: 'graph', icon: Network, label: locale === 'en' ? 'Graph' : '知识图谱' },
        { id: 'profile', icon: UserCircle, label: locale === 'en' ? 'Home' : '个人主页' },
    ];

    const sidebarBg = isDark
        ? 'bg-[#07111A] border-blue-900/20'
        : 'bg-slate-50/95 border-slate-200/70 backdrop-blur-xl';

    // tags across all conversations (for the filter) + the conversations matching the active filter
    const allTags = Array.from(new Set(conversations.flatMap(c => c.tags || [])));
    const visibleConvs = tagFilter ? conversations.filter(c => (c.tags || []).includes(tagFilter)) : conversations;
    const chipCls = (on: boolean) =>
        `px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${on
            ? 'bg-blue-600 text-white'
            : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`;

    return (
        <div className={`relative flex flex-col h-full border-r transition-all duration-300 ease-in-out z-30 ${sidebarBg} ${isCollapsed ? 'w-[68px]' : 'w-[260px]'}`}>

            {/* Brand */}
            <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-5'} border-b ${isDark ? 'border-blue-900/20' : 'border-slate-200/50'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-sky-400 rounded-xl flex justify-center items-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                        <Sparkles size={15} />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <h1 className={`font-bold leading-none font-heading tracking-tight text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>ACADEMIC</h1>
                            <span className={`text-[10px] font-mono tracking-widest ${isDark ? 'text-blue-500/70' : 'text-blue-600/60'}`}>AI TUTOR</span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button onClick={onToggleCollapse} className={`shrink-0 transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}>
                        <PanelLeftClose size={17} />
                    </button>
                )}
            </div>

            {/* Main Nav */}
            <div className="px-2.5 pt-3 pb-2 space-y-0.5">
                {isCollapsed && (
                    <button onClick={onToggleCollapse} className={`w-full flex justify-center py-2 mb-3 transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}>
                        <PanelLeftOpen size={19} />
                    </button>
                )}

                {navItems.map(item => {
                    const active = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelectView(item.id as any)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                                ${active
                                    ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700 shadow-sm')
                                    : (isDark ? 'text-slate-400 hover:bg-white/4 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')
                                }
                                ${isCollapsed ? 'justify-center px-0' : ''}
                            `}
                        >
                            <item.icon size={18} className={active ? 'text-blue-500' : 'group-hover:text-blue-500 transition-colors'} />
                            {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                            {isCollapsed && (
                                <div className={`absolute left-full ml-3 px-2 py-1 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className={`mx-3 my-1 h-px ${isDark ? 'bg-white/5' : 'bg-slate-200/60'}`} />

            {/* Chat History Header */}
            <div className={`px-4 py-2.5 flex items-center ${isCollapsed ? 'flex-col gap-2 px-0 justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {locale === 'en' ? 'Conversations' : '对话记录'}
                    </span>
                )}
                <button
                    onClick={onCreateChat}
                    className={`p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm
                        ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
                    title={locale === 'en' ? 'New Chat' : '新建对话'}
                >
                    <Plus size={15} />
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-0.5 scrollbar-hide relative">
                {/* Tag filter (classification) */}
                {!isCollapsed && allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1 pb-2">
                        <button onClick={() => setTagFilter(null)} className={chipCls(tagFilter === null)}>{locale === 'en' ? 'All' : '全部'}</button>
                        {allTags.map(t => (
                            <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className={chipCls(tagFilter === t)}># {t}</button>
                        ))}
                    </div>
                )}

                {visibleConvs.length === 0 && !isCollapsed && (
                    <div className={`px-3 py-6 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        <MessageSquare size={20} className="mx-auto mb-2 opacity-40" />
                        <p>{tagFilter ? (locale === 'en' ? 'No conversations with this tag' : '该标签下暂无对话') : (locale === 'en' ? 'No conversations yet' : '暂无对话')}</p>
                    </div>
                )}
                {visibleConvs.map(chat => (
                    <div key={chat.id} className="relative group/item">
                        {editingId === chat.id ? (
                            <input
                                ref={editInputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleRenameSubmit(chat.id)}
                                onKeyDown={(e) => isSubmitEnter(e) && handleRenameSubmit(chat.id)}
                                className={`w-full text-sm px-3 py-2 rounded-lg outline-none border ${isDark ? 'bg-slate-800 border-blue-500/50 text-white' : 'bg-white border-blue-500 text-slate-900'}`}
                            />
                        ) : (
                            <button
                                onClick={() => onSelectChat(chat.id)}
                                className={`
                                    w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors relative
                                    ${activeChatId === chat.id && currentView === 'chat'
                                        ? (isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-200/50')
                                        : (isDark ? 'text-slate-400 hover:bg-white/4 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')
                                    }
                                    ${isCollapsed ? 'justify-center px-0' : ''}
                                `}
                            >
                                <MessageSquare size={14} className={`shrink-0 ${activeChatId === chat.id && currentView === 'chat' ? 'text-blue-500' : 'opacity-40'}`} />
                                {!isCollapsed && (
                                    <>
                                        <span className="truncate text-sm flex-1 pr-5">{chat.title || (locale === 'en' ? 'New Conversation' : '新对话')}</span>
                                        <div
                                            className={`absolute right-2 opacity-0 group-hover/item:opacity-100 transition-all ${menuOpenId === chat.id ? 'opacity-100' : ''}`}
                                            onClick={(e) => handleMenuTrigger(e, chat.id)}
                                        >
                                            <div className={`p-1 rounded-md cursor-pointer ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                                                <MoreVertical size={13} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </button>
                        )}

                        {/* tag chips (display) */}
                        {!isCollapsed && editingId !== chat.id && editingTagsId !== chat.id && (chat.tags?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1 px-3 pb-1.5">
                                {chat.tags!.map(t => (
                                    <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-500/10 text-blue-600'}`}># {t}</span>
                                ))}
                            </div>
                        )}

                        {/* tag editor */}
                        {!isCollapsed && editingTagsId === chat.id && (
                            <div className={`mx-1 mb-1 p-2 rounded-lg border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
                                {(chat.tags?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {chat.tags!.map(t => (
                                            <span key={t} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-500/10 text-blue-600'}`}>
                                                # {t}
                                                <button onClick={() => onUpdateTags?.(chat.id, (chat.tags || []).filter(x => x !== t))} className="hover:text-rose-500">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-1 items-center">
                                    <input
                                        value={tagInput}
                                        autoFocus
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (isSubmitEnter(e)) {
                                                const nt = tagInput.trim();
                                                if (nt && !(chat.tags || []).includes(nt)) onUpdateTags?.(chat.id, [...(chat.tags || []), nt]);
                                                setTagInput('');
                                            }
                                        }}
                                        placeholder={locale === 'en' ? 'Add tag, Enter' : '加标签后回车'}
                                        className={`flex-1 text-xs px-2 py-1 rounded outline-none border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                    />
                                    <button onClick={() => { setEditingTagsId(null); setTagInput(''); }} className="text-xs px-2 py-1 text-slate-400 hover:text-blue-500">{locale === 'en' ? 'Done' : '完成'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* User Footer */}
            <div className={`px-3 py-3 border-t ${isDark ? 'border-white/5' : 'border-slate-200/50'}`}>
                {isCollapsed ? (
                    <button onClick={onLogout} title="Logout" className={`w-full flex justify-center p-2 transition-colors ${isDark ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'}`}>
                        <LogOut size={18} />
                    </button>
                ) : (
                    <button onClick={onLogout} className={`flex items-center gap-2 text-sm transition-colors w-full px-2 py-1.5 rounded-lg ${isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-900/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}>
                        <LogOut size={15} />
                        <span>{locale === 'en' ? 'Sign out' : '退出登录'}</span>
                    </button>
                )}
            </div>

            {/* Context Menu */}
            {menuOpenId && menuPosition && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
                    className={`w-36 rounded-xl border shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 ${isDark ? 'bg-[#0D1E2C] border-slate-700' : 'bg-white border-slate-200'}`}
                >
                    <button onClick={() => { setEditingId(menuOpenId); setEditTitle(conversations.find(c => c.id === menuOpenId)?.title || ''); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Edit2 size={12} /> {locale === 'en' ? 'Rename' : '重命名'}
                    </button>
                    <button onClick={() => { setEditingTagsId(menuOpenId); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Tag size={12} /> {locale === 'en' ? 'Tags' : '标签'}
                    </button>
                    <button onClick={() => { onArchiveChat(menuOpenId); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Archive size={12} /> {locale === 'en' ? 'Archive' : '归档'}
                    </button>
                    <hr className={`my-1 ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />
                    <button onClick={() => { onDeleteChat(menuOpenId); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500">
                        <Trash2 size={12} /> {locale === 'en' ? 'Delete' : '删除'}
                    </button>
                </div>,
                document.body,
            )}
        </div>
    );
};

export default StudentSidebar;
