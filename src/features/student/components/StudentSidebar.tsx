import React, { useEffect, useRef, useState } from 'react';
import {
    LayoutDashboard, UserCircle, Presentation,
    Plus, MoreVertical, Archive, Trash2, Edit2, LogOut, PanelLeftClose, PanelLeftOpen, Network,
    MessageSquare, Sparkles
} from 'lucide-react';
import { Conversation, Theme, Locale } from '@/types';

interface StudentSidebarProps {
    conversations: Conversation[];
    activeChatId: string;
    onSelectChat: (id: string) => void;
    onCreateChat: () => void;
    onDeleteChat: (id: string) => void;
    onArchiveChat: (id: string) => void;
    onRenameChat: (id: string, newTitle: string) => void;
    currentView: 'dashboard' | 'chat' | 'profile' | 'classroom' | 'knowledge';
    onSelectView: (view: 'dashboard' | 'chat' | 'profile' | 'classroom' | 'knowledge') => void;
    onLogout: () => void;
    theme: Theme;
    locale: Locale;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({
    conversations, activeChatId, onSelectChat, onCreateChat,
    onDeleteChat, onArchiveChat, onRenameChat,
    currentView, onSelectView, onLogout, theme, locale,
    isCollapsed, onToggleCollapse
}) => {
    const isDark = theme === 'dark';

    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

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
            setMenuPosition({ top: rect.bottom + 5, left: rect.left });
            setMenuOpenId(chatId);
        }
    };

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: locale === 'en' ? 'Dashboard' : '学习概览' },
        { id: 'classroom', icon: Presentation, label: locale === 'en' ? 'Classroom' : '课堂互动' },
        { id: 'knowledge', icon: Network, label: locale === 'en' ? 'Knowledge' : '知识图谱' },
        { id: 'profile', icon: UserCircle, label: locale === 'en' ? 'Profile' : '个人档案' },
    ];

    const sidebarBg = isDark
        ? 'bg-[#07111A] border-emerald-900/20'
        : 'bg-slate-50/95 border-slate-200/70 backdrop-blur-xl';

    return (
        <div className={`relative flex flex-col h-full border-r transition-all duration-300 ease-in-out z-30 ${sidebarBg} ${isCollapsed ? 'w-[68px]' : 'w-[260px]'}`}>

            {/* Brand */}
            <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-5'} border-b ${isDark ? 'border-emerald-900/20' : 'border-slate-200/50'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex justify-center items-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
                        <Sparkles size={15} />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <h1 className={`font-bold leading-none font-heading tracking-tight text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>ACADEMIC</h1>
                            <span className={`text-[10px] font-mono tracking-widest ${isDark ? 'text-emerald-500/70' : 'text-emerald-600/60'}`}>AI TUTOR</span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button onClick={onToggleCollapse} className={`shrink-0 transition-colors ${isDark ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-600'}`}>
                        <PanelLeftClose size={17} />
                    </button>
                )}
            </div>

            {/* Main Nav */}
            <div className="px-2.5 pt-3 pb-2 space-y-0.5">
                {isCollapsed && (
                    <button onClick={onToggleCollapse} className={`w-full flex justify-center py-2 mb-3 transition-colors ${isDark ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-600'}`}>
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
                                    ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700 shadow-sm')
                                    : (isDark ? 'text-slate-400 hover:bg-white/4 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')
                                }
                                ${isCollapsed ? 'justify-center px-0' : ''}
                            `}
                        >
                            <item.icon size={18} className={active ? 'text-emerald-500' : 'group-hover:text-emerald-500 transition-colors'} />
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
                        ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'}`}
                    title={locale === 'en' ? 'New Chat' : '新建对话'}
                >
                    <Plus size={15} />
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-0.5 scrollbar-hide relative">
                {conversations.length === 0 && !isCollapsed && (
                    <div className={`px-3 py-6 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        <MessageSquare size={20} className="mx-auto mb-2 opacity-40" />
                        <p>{locale === 'en' ? 'No conversations yet' : '暂无对话'}</p>
                    </div>
                )}
                {conversations.map(chat => (
                    <div key={chat.id} className="relative group/item">
                        {editingId === chat.id ? (
                            <input
                                ref={editInputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleRenameSubmit(chat.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(chat.id)}
                                className={`w-full text-sm px-3 py-2 rounded-lg outline-none border ${isDark ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-white border-emerald-500 text-slate-900'}`}
                            />
                        ) : (
                            <button
                                onClick={() => onSelectChat(chat.id)}
                                className={`
                                    w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors relative
                                    ${activeChatId === chat.id && currentView === 'chat'
                                        ? (isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-200/50')
                                        : (isDark ? 'text-slate-400 hover:bg-white/4 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')
                                    }
                                    ${isCollapsed ? 'justify-center px-0' : ''}
                                `}
                            >
                                <MessageSquare size={14} className={`shrink-0 ${activeChatId === chat.id && currentView === 'chat' ? 'text-emerald-500' : 'opacity-40'}`} />
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
            {menuOpenId && menuPosition && (
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left + 16, zIndex: 9999 }}
                    className={`w-36 rounded-xl border shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 ${isDark ? 'bg-[#0D1E2C] border-slate-700' : 'bg-white border-slate-200'}`}
                >
                    <button onClick={() => { setEditingId(menuOpenId); setEditTitle(conversations.find(c => c.id === menuOpenId)?.title || ''); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Edit2 size={12} /> {locale === 'en' ? 'Rename' : '重命名'}
                    </button>
                    <button onClick={() => { onArchiveChat(menuOpenId); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Archive size={12} /> {locale === 'en' ? 'Archive' : '归档'}
                    </button>
                    <hr className={`my-1 ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />
                    <button onClick={() => { onDeleteChat(menuOpenId); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500">
                        <Trash2 size={12} /> {locale === 'en' ? 'Delete' : '删除'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentSidebar;
