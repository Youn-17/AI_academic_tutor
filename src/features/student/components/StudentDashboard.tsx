import React, { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import {
    BookOpen, Clock, Zap, Target, BrainCircuit, TrendingUp,
    Bot, Flame, Calendar, ChevronRight, Lightbulb, MessageSquare, Award, BarChart2
} from 'lucide-react';
import { getInsights, StudentInsight, getStats, UserStats } from '@/services/ProfileService';
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

const RADAR_DATA = [
    { subject: '文献阅读', value: 78 },
    { subject: '批判思维', value: 65 },
    { subject: '写作能力', value: 80 },
    { subject: '方法论', value: 55 },
    { subject: 'AI协作', value: 90 },
    { subject: '研究设计', value: 70 },
];

const QUICK_ACTIONS = [
    { label: '开始新对话', sub: '与 AI 导师探讨研究', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: '查看知识图谱', sub: '可视化你的知识体系', icon: BrainCircuit, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: '今日学习计划', sub: '3 项任务待完成', icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: '文献检索', sub: '在 Semantic Scholar 搜索', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

interface StatCardProps {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    trend?: number;
    theme: Theme;
    iconClass: string;
    iconBg: string;
}

const StatCard = ({ icon: Icon, label, value, trend, theme, iconClass, iconBg }: StatCardProps) => (
    <div className={`p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5 ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-[#0D1E2C] border-emerald-900/20'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon size={18} className={iconClass} />
            </div>
            {trend !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <p className={`text-2xl font-bold font-heading mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{value}</p>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
    </div>
);

const InsightCard = ({ insight, theme }: { insight: StudentInsight; theme: Theme }) => {
    const config = {
        strength:   { label: '优势', className: 'bg-emerald-100 text-emerald-700', borderColor: '#10b981' },
        weakness:   { label: '待改进', className: 'bg-rose-100 text-rose-700', borderColor: '#f43f5e' },
        suggestion: { label: '建议', className: 'bg-blue-100 text-blue-700', borderColor: '#3b82f6' },
        milestone:  { label: '里程碑', className: 'bg-amber-100 text-amber-700', borderColor: '#f59e0b' },
    };
    const c = config[insight.type];
    return (
        <div
            className={`p-4 rounded-xl border-l-4 ${theme === 'light' ? 'bg-slate-50' : 'bg-[#0D1E2C]/60'}`}
            style={{ borderLeftColor: c.borderColor }}
        >
            <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.className}`}>{c.label}</span>
                <span className="text-[10px] text-slate-400">{new Date(insight.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
            <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{insight.content}</p>
        </div>
    );
};

export default function StudentDashboard({ theme, userName }: StudentDashboardProps) {
    const [insights, setInsights] = useState<StudentInsight[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        Promise.all([getInsights(), getStats()])
            .then(([ins, st]) => {
                if (ins.length > 0) {
                    setInsights(ins);
                } else {
                    setInsights([
                        { id: '1', content: '文献阅读量显著提升，建议加强对方法论的批判性思考。', type: 'strength', created_by: 'supervisor', created_at: new Date().toISOString() },
                        { id: '2', content: '尝试使用 Zotero 管理引文，并建立自己的知识图谱。', type: 'suggestion', created_by: 'ai', created_at: new Date(Date.now() - 86400000).toISOString() },
                        { id: '3', content: '本周专注度提升 8%，保持当前学习节奏！', type: 'milestone', created_by: 'ai', created_at: new Date(Date.now() - 172800000).toISOString() },
                    ]);
                }
                setStats(st);
            })
            .catch(console.error);
    }, []);

    const isDark = theme === 'dark';
    const cardBase = `rounded-2xl border ${isDark ? 'bg-[#0D1E2C] border-emerald-900/20' : 'bg-white border-slate-100'}`;

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 6) return '深夜好';
        if (h < 12) return '早上好';
        if (h < 18) return '下午好';
        return '晚上好';
    })();

    return (
        <div className={`flex-1 overflow-y-auto p-5 md:p-8 space-y-6 ${isDark ? 'bg-[#07111A]' : 'bg-slate-50'}`}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Flame size={18} className="text-amber-400" />
                        <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                            连续学习 7 天
                        </span>
                    </div>
                    <h1 className={`text-3xl md:text-4xl font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {greeting}，{userName.split(' ')[0]}
                    </h1>
                    <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>这里是你的学术成长概览。</p>
                </div>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isDark ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200/50'}`}>
                    <Calendar size={18} className="text-emerald-500" />
                    <div>
                        <p className={`text-xs font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>今日目标</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>阅读 2 篇文献 · 1 次 AI 讨论</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Clock} label="本周学习 (h)" value="22.5" trend={12} theme={theme}
                    iconClass="text-blue-500" iconBg="bg-blue-500/10"
                />
                <StatCard
                    icon={BookOpen} label="累计对话" value={stats?.total_conversations ?? '—'} theme={theme}
                    iconClass="text-teal-500" iconBg="bg-teal-500/10"
                />
                <StatCard
                    icon={BrainCircuit} label="AI 交互" value={stats?.ai_interactions ?? '—'} trend={28} theme={theme}
                    iconClass="text-emerald-500" iconBg="bg-emerald-500/10"
                />
                <StatCard
                    icon={Target} label="专注度评分" value="88" trend={3} theme={theme}
                    iconClass="text-amber-500" iconBg="bg-amber-500/10"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {QUICK_ACTIONS.map((action, i) => (
                    <button key={i} className={`p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${cardBase}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${action.bg}`}>
                            <action.icon size={17} className={action.color} />
                        </div>
                        <p className={`text-sm font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{action.label}</p>
                        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{action.sub}</p>
                    </button>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Activity Chart */}
                <div className={`lg:col-span-2 p-5 ${cardBase}`}>
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" />
                            <h3 className={`font-bold font-heading text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>学习活跃度</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {['本周', '上月'].map(t => (
                                <button key={t} className={`text-[11px] px-3 py-1 rounded-lg transition-colors ${t === '本周' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={WEEKLY_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#0D1E2C' : '#fff',
                                        borderRadius: '12px',
                                        border: isDark ? '1px solid rgba(16,185,129,0.15)' : '1px solid #e2e8f0',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                        fontSize: '12px'
                                    }}
                                    formatter={(v: number) => [`${v} 小时`, '学习时长']}
                                />
                                <Area type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar Chart */}
                <div className={`p-5 ${cardBase}`}>
                    <div className="flex items-center gap-2 mb-5">
                        <BarChart2 size={16} className="text-emerald-500" />
                        <h3 className={`font-bold font-heading text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>能力分布</h3>
                    </div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={RADAR_DATA}>
                                <PolarGrid stroke={isDark ? '#1e3a2f' : '#e2e8f0'} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                                <Radar name="能力" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Insights */}
            <div className={`p-5 ${cardBase}`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Bot size={15} className="text-emerald-500" />
                        </div>
                        <h3 className={`font-bold font-heading text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>AI 导师建议</h3>
                    </div>
                    <button className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                        查看全部 <ChevronRight size={13} />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {insights.map(insight => <InsightCard key={insight.id} insight={insight} theme={theme} />)}
                </div>
            </div>

            {/* Learning Tips */}
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border-emerald-800/30' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/50'}`}>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Lightbulb size={15} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>今日学习提示</p>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            苏格拉底式学习法建议：当 AI 给出答案时，尝试追问"为什么"和"如何验证"，这会帮助你构建更深入的理解，而不只是获取答案。
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <Award size={13} className="text-amber-400" />
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>本周专注度优于 82% 的学生</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
