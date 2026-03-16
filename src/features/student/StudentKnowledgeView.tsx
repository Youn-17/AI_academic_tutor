import React, { useState, useEffect } from 'react';
import { Conversation, Message } from '@/types';
import KnowledgeGraph from './components/KnowledgeGraph';
import { Network, Zap, Share2, Download, Search } from 'lucide-react';
import * as ConversationService from '@/services/ConversationService';

interface StudentKnowledgeViewProps {
    theme: 'light' | 'dark';
}

const StudentKnowledgeView: React.FC<StudentKnowledgeViewProps> = ({ theme }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'recent'>('recent');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load recent conversation messages to populate graph
        const loadData = async () => {
            try {
                const convs = await ConversationService.getConversations();
                if (convs.length > 0) {
                    // Flatten messages from top 3 active conversations for a "Global" view
                    // Note: In a real app we might have a dedicated 'Knowledge' endpoint
                    const recentId = convs[0].id;
                    const msgs = await ConversationService.getMessages(recentId);
                    setMessages(msgs);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <div className={`flex flex-col h-full overflow-hidden ${theme === 'light' ? 'bg-slate-50' : 'bg-[#0B101E]'}`}>

            {/* Header */}
            <header className={`h-16 px-8 flex items-center justify-between border-b ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0F172A] border-slate-800'}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                        <Network size={20} />
                    </div>
                    <h1 className={`text-xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>个人知识图谱</h1>
                </div>

                <div className="flex gap-2">
                    <div className={`relative flex items-center px-3 py-1.5 rounded-lg border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                        <Search size={14} className="text-slate-400 mr-2" />
                        <input
                            type="text"
                            placeholder="搜索概念节点..."
                            className="bg-transparent border-none outline-none text-sm w-48"
                        />
                    </div>
                    <button className="p-2 text-slate-400 hover:text-indigo-500"><Share2 size={18} /></button>
                    <button className="p-2 text-slate-400 hover:text-indigo-500"><Download size={18} /></button>
                </div>
            </header>

            {/* Toolbar */}
            <div className={`px-8 py-4 flex gap-4 border-b ${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-[#0F172A]/50 border-slate-800'}`}>
                <button
                    onClick={() => setActiveTab('recent')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'recent' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    当前会话
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    全局知识库
                </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative p-4 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">正在生成图谱...</div>
                ) : (
                    <div className="w-full h-full shadow-inner rounded-3xl overflow-hidden relative">
                        <KnowledgeGraph messages={messages} theme={theme} />

                        {/* Floating Stats */}
                        <div className={`absolute bottom-6 right-6 p-4 rounded-xl border backdrop-blur-md ${theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/80 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={14} className="text-amber-500" />
                                <span className="text-xs font-bold uppercase text-slate-500">图谱洞察</span>
                            </div>
                            <div className="text-2xl font-bold font-mono">
                                {messages.reduce((acc, m) => acc + (m.content.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{5,}/g) || []).length, 0)}
                            </div>
                            <div className="text-xs text-slate-400">已识别知识节点</div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default StudentKnowledgeView;
