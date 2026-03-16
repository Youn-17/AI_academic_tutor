import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    BookOpen, Clock, Zap, Target, Award, TrendingUp,
    Calendar, FileText, Bot, BrainCircuit
} from 'lucide-react';
import { getInsights, StudentInsight } from '@/services/ProfileService';
import { Theme } from '@/types';

interface StudentDashboardProps {
    theme: Theme;
    userName: string;
}

const WEEKLY_DATA = [
    { name: '周一', hours: 2.5, focus: 85 },
    { name: '周二', hours: 3.8, focus: 92 },
    { name: '周三', hours: 1.5, focus: 78 },
    { name: '周四', hours: 4.2, focus: 88 },
    { name: '周五', hours: 3.0, focus: 90 },
    { name: '周六', hours: 5.5, focus: 95 },
    { name: '周日', hours: 2.0, focus: 82 },
];

const StatCard = ({ icon: Icon, label, value, trend, theme, color }: any) => (
    <div className={`p-6 rounded-2xl border transition-all hover:shadow-lg ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-slate-800/50 border-slate-700'
        }`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${theme === 'light' ? `bg-${color}-50 text-${color}-600` : `bg-${color}-900/30 text-${color}-400`
                }`}>
                <Icon size={20} />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700'
                    }`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <div className="space-y-1">
            <p className={`text-2xl font-bold font-heading ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {value}
            </p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        </div>
    </div>
);

const InsightCard = ({ insight, theme }: { insight: StudentInsight; theme: Theme }) => {
    const colors = {
        strength: 'emerald',
        weakness: 'rose',
        suggestion: 'blue',
        milestone: 'amber'
    };
    const color = colors[insight.type];

    // Translate types for display
    const typeLabels = {
        strength: '优势',
        weakness: '待改进',
        suggestion: '建议',
        milestone: '里程碑'
    };

    return (
        <div className={`p-4 rounded-xl border-l-4 mb-3 ${theme === 'light'
            ? 'bg-slate-50 border-slate-200'
            : 'bg-slate-800/30 border-slate-700'
            }`} style={{ borderLeftColor: `var(--color-${color}-500)` }}>
            <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${theme === 'light' ? `bg-${color}-100 text-${color}-700` : `bg-${color}-900/30 text-${color}-400`
                    }`}>
                    {typeLabels[insight.type] || insight.type}
                </span>
                <span className="text-[10px] text-slate-400">{new Date(insight.created_at).toLocaleDateString()}</span>
            </div>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                {insight.content}
            </p>
        </div>
    );
};

export default function StudentDashboard({ theme, userName }: StudentDashboardProps) {
    const [insights, setInsights] = useState<StudentInsight[]>([]);

    useEffect(() => {
        getInsights().then(setInsights).catch(console.error);

        // Mock insights if empty (for demo)
        if (insights.length === 0) {
            setInsights([
                { id: '1', content: '文献阅读量显著提升，建议加强对方法论的批判性思考。', type: 'strength', created_by: 'supervisor', created_at: new Date().toISOString() },
                { id: '2', content: '尝试使用 Zotero 管理引文，并建立自己的知识图谱。', type: 'suggestion', created_by: 'ai', created_at: new Date(Date.now() - 86400000).toISOString() },
            ]);
        }
    }, [insights.length]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className={`text-3xl md:text-4xl font-bold font-heading mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        欢迎回来, {userName}
                    </h1>
                    <p className="text-slate-500">这里是您目前的学术进展概览。</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:translate-y-[-1px] transition-transform hover:bg-indigo-700">
                        开始新学习
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Clock} label="学习时长 (小时)" value="24.5" trend={12} theme={theme} color="blue" />
                <StatCard icon={BookOpen} label="阅读文献" value="8" trend={-5} theme={theme} color="indigo" />
                <StatCard icon={BrainCircuit} label="AI 交互次数" value="142" trend={28} theme={theme} color="violet" />
                <StatCard icon={Target} label="专注度评分" value="88" trend={3} theme={theme} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Chart */}
                <div className={`col-span-2 p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={`font-bold font-heading ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            学习活跃度
                        </h3>
                        <select className={`text-xs p-1 rounded border ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-900 border-slate-700'}`}>
                            <option>本周</option>
                            <option>上月</option>
                        </select>
                    </div>
                    <div className="h-64 cursor-crosshair">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={WEEKLY_DATA}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme === 'light' ? '#fff' : '#1e293b',
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Area type="monotone" dataKey="hours" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Insights & Guidance */}
                <div className={`col-span-1 p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-6">
                        <Bot size={20} className="text-indigo-500" />
                        <h3 className={`font-bold font-heading ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            AI 指导建议
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {insights.length > 0 ? (
                            insights.map(insight => <InsightCard key={insight.id} insight={insight} theme={theme} />)
                        ) : (
                            <p className="text-sm text-slate-400">暂无新建议，请保持学习！</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
