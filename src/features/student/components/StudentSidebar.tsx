import React, { useEffect, useRef, useState } from 'react';
import {
    Sparkles, LayoutDashboard, UserCircle, Presentation, History,
    Plus, MoreVertical, Archive, Trash2, Edit2, LogOut, PanelLeftClose, PanelLeftOpen, Network
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

    // Context Menu State
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const menuRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Close menu on click outside - using capture to ensure we catch it before others
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // If click is outside the menu AND outside the trigger button (which we handle separately via stopPropagation)
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        };
        // Use true for capture phase to be safer with other event listeners
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    // Update menu position on scroll (to close it, or update it)
    useEffect(() => {
        const handleScroll = () => {
            if (menuOpenId) setMenuOpenId(null);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [menuOpenId]);

    // Focus input on edit
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingId]);

    const handleRenameSubmit = (id: string) => {
        if (editTitle.trim()) {
            onRenameChat(id, editTitle.trim());
        }
        setEditingId(null);
    };

    const handleMenuTrigger = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        e.preventDefault();

        if (menuOpenId === chatId) {
            setMenuOpenId(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 5,
                left: rect.left
            });
            setMenuOpenId(chatId);
        }
    };

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: locale === 'en' ? 'Dashboard' : '学习概览' },
        { id: 'classroom', icon: Presentation, label: locale === 'en' ? 'Classroom' : '课堂互动' },
        { id: 'profile', icon: UserCircle, label: locale === 'en' ? 'Profile' : '个人档案' },
        { id: 'knowledge', icon: Network, label: '知识图谱' },
    ];

    return (
        <div className={`
      relative flex flex-col h-full border-r transition-all duration-300 ease-in-out z-30
      ${isDark ? 'bg-[#0B101E] border-white/5' : 'bg-slate-50/80 border-slate-200/60 backdrop-blur-xl'}
      ${isCollapsed ? 'w-20' : 'w-72'}
    `}>

            {/* Brand */}
            <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} border-b ${isDark ? 'border-white/5' : 'border-slate-200/50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-xl flex justify-center items-center text-white shadow-lg shadow-indigo-500/20">
                        <Sparkles size={16} />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="font-bold leading-none font-heading tracking-tight">ACADEMIC</h1>
                            <span className="text-[10px] text-slate-400 font-mono tracking-widest">PRO v2.4</span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button onClick={onToggleCollapse} className="text-slate-400 hover:text-indigo-500 transition-colors">
                        <PanelLeftClose size={18} />
                    </button>
                )}
            </div>

            {/* Main Nav */}
            <div className="p-3 space-y-1">
                {isCollapsed && (
                    <button onClick={onToggleCollapse} className="w-full flex justify-center py-2 mb-4 text-slate-400 hover:text-indigo-500">
                        <PanelLeftOpen size={20} />
                    </button>
                )}

                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSelectView(item.id as any)}
                        className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${currentView === item.id
                                ? (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm')
                                : (isDark ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700')
                            }
                ${isCollapsed ? 'justify-center px-0' : ''}
              `}
                    >
                        <item.icon size={20} className={`${currentView === item.id ? 'text-indigo-500' : 'group-hover:text-indigo-500 transition-colors'}`} />
                        {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}

                        {/* Tooltip for collapsed */}
                        {isCollapsed && (
                            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Chat History Header */}
            <div className={`mt-4 px-6 flex items-center justify-between group ${isCollapsed ? 'flex-col gap-4' : ''}`}>
                {!isCollapsed && <span className="text-xs font-bold uppercase tracking-widest text-slate-400/80">{locale === 'en' ? 'History' : '对话列表'}</span>}
                <button
                    onClick={onCreateChat}
                    className={`
             p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm
             ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100'}
           `}
                    title={locale === 'en' ? 'New Chat' : '新建对话'}
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto mt-2 px-3 pb-4 space-y-1 scrollbar-hide relative">
                {conversations.map(chat => (
                    <div key={chat.id} className="relative group/item">
                        {editingId === chat.id ? (
                            <input
                                ref={editInputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleRenameSubmit(chat.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(chat.id)}
                                className={`w-full text-sm px-3 py-2 rounded-lg outline-none border ${isDark ? 'bg-slate-800 border-indigo-500' : 'bg-white border-indigo-500'}`}
                            />
                        ) : (
                            <button
                                onClick={() => { onSelectChat(chat.id); }}
                                className={`
                       w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors relative
                       ${activeChatId === chat.id && currentView === 'chat'
                                        ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm ring-1 ring-slate-200 text-slate-900')
                                        : (isDark ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700')
                                    }
                       ${isCollapsed ? 'justify-center px-0' : ''}
                    `}
                            >
                                <History size={16} className={`shrink-0 ${activeChatId === chat.id ? 'text-indigo-500' : 'opacity-50'}`} />

                                {!isCollapsed ? (
                                    <>
                                        <span className="truncate text-sm font-medium flex-1 pr-6">{chat.title || (locale === 'en' ? 'New Conversation' : '新对话')}</span>

                                        {/* Context Menu Trigger */}
                                        <div
                                            className={`absolute right-2 opacity-0 group-hover/item:opacity-100 transition-all ${menuOpenId === chat.id ? 'opacity-100' : ''}`}
                                            onClick={(e) => handleMenuTrigger(e, chat.id)}
                                        >
                                            <div className={`p-1 rounded-md cursor-pointer ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                                                <MoreVertical size={14} />
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* User Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-slate-200/50'}`}>
                {isCollapsed ? (
                    <button onClick={onLogout} title="Logout" className="w-full flex justify-center p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <LogOut size={20} />
                    </button>
                ) : (
                    <button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-500 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10">
                        <LogOut size={16} /> <span>{locale === 'en' ? 'Log out' : '退出登录'}</span>
                    </button>
                )}
            </div>

            {/* Fixed Context Menu (Portal-like behavior via fixed position) */}
            {menuOpenId && menuPosition && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left + 20, // Add padding to not overlap cursor
                        zIndex: 9999
                    }}
                    className={`w-36 rounded-xl border shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100
                ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}
            `}
                >
                    <button onClick={() => { setEditingId(menuOpenId); setEditTitle(conversations.find(c => c.id === menuOpenId)?.title || ''); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Edit2 size={12} /> {locale === 'en' ? 'Rename' : '重命名'}
                    </button>
                    <button onClick={() => { onArchiveChat(menuOpenId); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <Archive size={12} /> {locale === 'en' ? 'Archive' : '归档'}
                    </button>
                    <hr className={`my-1 ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />
                    <button onClick={() => { onDeleteChat(menuOpenId); setMenuOpenId(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500`}>
                        <Trash2 size={12} /> {locale === 'en' ? 'Delete' : '删除'}
                    </button>
                </div>
            )}

        </div>
    );
};

export default StudentSidebar;
