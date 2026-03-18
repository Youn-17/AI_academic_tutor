import React, { useEffect, useState } from 'react';
import { UserProfile, updateProfile, getProfile, getStats, UserStats } from '@/services/ProfileService';
import { Theme } from '@/types';
import {
    Save, GraduationCap, Key, Mail, School, BookOpen,
    MessageSquare, BrainCircuit, Clock, ChevronRight, Pencil,
    CheckCircle2, Shield, Sparkles, User
} from 'lucide-react';

interface StudentProfileProps {
    theme: Theme;
}

const IDENTITY_OPTIONS = [
    { value: 'undergraduate', label: '本科生', icon: '🎓' },
    { value: 'master', label: '硕士研究生', icon: '📚' },
    { value: 'phd', label: '博士研究生', icon: '🔬' },
    { value: 'other', label: '其他', icon: '📖' },
];

const RESEARCH_INTERESTS = [
    '机器学习', '自然语言处理', '计算机视觉', '知识图谱',
    '教育技术', '数据挖掘', '人机交互', '强化学习',
    '生物信息', '量子计算', '认知科学', '社会计算'
];

export default function StudentProfile({ theme }: StudentProfileProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [editingSection, setEditingSection] = useState<'basic' | 'academic' | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        nickname: '',
        school: '',
        student_identity: '' as string,
        email: '',
        title: '',
    });

    useEffect(() => {
        Promise.all([getProfile(), getStats()])
            .then(([data, st]) => {
                if (data) {
                    setProfile(data);
                    setFormData({
                        full_name: data.full_name || '',
                        nickname: data.nickname || '',
                        school: data.school || '',
                        student_identity: data.student_identity || '',
                        email: data.email || '',
                        title: data.title || '',
                    });
                }
                setStats(st);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await updateProfile({
                full_name: formData.full_name || null,
                nickname: formData.nickname || null,
                school: formData.school || null,
                title: formData.title || null,
                student_identity: (formData.student_identity as UserProfile['student_identity']) || null,
            });
            setSaved(true);
            setEditingSection(null);
            setMessage({ text: '档案已更新', type: 'success' });
            setTimeout(() => { setSaved(false); setMessage(null); }, 3000);
        } catch (err) {
            setMessage({ text: '更新失败，请重试', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const isDark = theme === 'dark';

    const initials = (formData.full_name || formData.nickname || formData.email || '?')
        .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const identityLabel = IDENTITY_OPTIONS.find(o => o.value === formData.student_identity)?.label || '—';
    const identityIcon = IDENTITY_OPTIONS.find(o => o.value === formData.student_identity)?.icon || '📖';

    const cardBase = `rounded-2xl border ${isDark ? 'bg-[#0D1E2C] border-emerald-900/20' : 'bg-white border-slate-100'}`;
    const inputBase = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
        ${isDark
            ? 'bg-[#07111A] border-emerald-900/30 text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20'
        }`;
    const labelBase = `text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`;

    if (loading) {
        return (
            <div className={`flex-1 flex items-center justify-center ${isDark ? 'bg-[#07111A]' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>加载中...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#07111A]' : 'bg-slate-50'}`}>

            {/* Hero Header */}
            <div className={`relative overflow-hidden px-6 pt-10 pb-6 border-b ${isDark ? 'bg-gradient-to-br from-[#07111A] via-[#0B1A28] to-[#07111A] border-emerald-900/20' : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border-slate-200/50'}`}>
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-teal-500/5 translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="max-w-3xl mx-auto relative">
                    <div className="flex items-start gap-5">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                                <span className="text-2xl font-bold text-white font-heading">{initials}</span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isDark ? 'bg-[#0D1E2C] border-[#07111A]' : 'bg-white border-emerald-50'}`}>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className={`text-2xl font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {formData.full_name || formData.nickname || '同学'}
                            </h1>
                            {formData.nickname && formData.full_name && (
                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>@{formData.nickname}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                {formData.student_identity && (
                                    <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                        <span>{identityIcon}</span> {identityLabel}
                                    </span>
                                )}
                                {formData.school && (
                                    <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                        <School size={11} /> {formData.school}
                                    </span>
                                )}
                                {formData.title && (
                                    <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                        <Sparkles size={11} /> {formData.title}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mt-6">
                        {[
                            { label: '对话数', value: stats?.total_conversations ?? '—', icon: MessageSquare, color: 'text-emerald-500' },
                            { label: 'AI 交互', value: stats?.ai_interactions ?? '—', icon: BrainCircuit, color: 'text-teal-500' },
                            { label: '总消息', value: stats?.total_messages ?? '—', icon: BookOpen, color: 'text-blue-500' },
                        ].map(s => (
                            <div key={s.label} className={`p-3 rounded-xl border text-center ${isDark ? 'bg-white/3 border-white/5' : 'bg-white/60 border-white shadow-sm'}`}>
                                <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
                                <p className={`text-lg font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
                                <p className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-6 space-y-5">

                {/* Basic Info */}
                <section className={`${cardBase} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-emerald-900/20' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <User size={14} className="text-emerald-500" />
                            </div>
                            <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>基本信息</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditingSection(editingSection === 'basic' ? null : 'basic')}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${editingSection === 'basic' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700')}`}
                        >
                            <Pencil size={12} /> {editingSection === 'basic' ? '收起' : '编辑'}
                        </button>
                    </div>
                    <div className="p-5">
                        {editingSection === 'basic' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelBase}>姓名</label>
                                    <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className={inputBase} placeholder="请输入真实姓名" />
                                </div>
                                <div>
                                    <label className={labelBase}>昵称</label>
                                    <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} className={inputBase} placeholder="显示给他人的名称" />
                                </div>
                                <div>
                                    <label className={labelBase}>头衔 / 研究方向</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputBase} placeholder="如：NLP 研究者" />
                                </div>
                                <div>
                                    <label className={labelBase}>邮箱</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="email" value={formData.email} disabled className={`${inputBase} pl-8 opacity-50 cursor-not-allowed`} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: '姓名', value: formData.full_name || '—', icon: User },
                                    { label: '昵称', value: formData.nickname || '—', icon: User },
                                    { label: '头衔', value: formData.title || '—', icon: Sparkles },
                                    { label: '邮箱', value: formData.email || '—', icon: Mail },
                                ].map(f => (
                                    <div key={f.label}>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{f.label}</p>
                                        <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{f.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Academic Info */}
                <section className={`${cardBase} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-emerald-900/20' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                                <GraduationCap size={14} className="text-teal-500" />
                            </div>
                            <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>学术信息</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditingSection(editingSection === 'academic' ? null : 'academic')}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${editingSection === 'academic' ? (isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-100 text-teal-700') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700')}`}
                        >
                            <Pencil size={12} /> {editingSection === 'academic' ? '收起' : '编辑'}
                        </button>
                    </div>
                    <div className="p-5">
                        {editingSection === 'academic' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelBase}>学校 / 机构</label>
                                    <div className="relative">
                                        <School size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" name="school" value={formData.school} onChange={handleChange} className={`${inputBase} pl-8`} placeholder="例如：北京大学" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelBase}>学生身份</label>
                                    <select name="student_identity" value={formData.student_identity} onChange={handleChange} className={inputBase}>
                                        <option value="">请选择...</option>
                                        {IDENTITY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>学校</p>
                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{formData.school || '—'}</p>
                                </div>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>身份</p>
                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{identityIcon} {identityLabel}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Research Interests */}
                <section className={`${cardBase} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b ${isDark ? 'border-emerald-900/20' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <BrainCircuit size={14} className="text-blue-500" />
                            </div>
                            <div>
                                <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>研究兴趣</h2>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>选择你感兴趣的领域，AI 导师将为你定制学习建议</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="flex flex-wrap gap-2">
                            {RESEARCH_INTERESTS.map(interest => (
                                <button
                                    key={interest}
                                    type="button"
                                    onClick={() => toggleInterest(interest)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
                                        selectedInterests.includes(interest)
                                            ? (isDark ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20')
                                            : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200')
                                    }`}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                        {selectedInterests.length > 0 && (
                            <p className={`text-xs mt-3 ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                                已选择 {selectedInterests.length} 个领域
                            </p>
                        )}
                    </div>
                </section>

                {/* Security */}
                <section className={`${cardBase} overflow-hidden`}>
                    <div className={`px-5 py-4 border-b ${isDark ? 'border-emerald-900/20' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
                                <Shield size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                            </div>
                            <h2 className={`font-bold text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>安全设置</h2>
                        </div>
                    </div>
                    <div className="px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>登录密码</p>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>如需修改密码，请退出后使用"忘记密码"重置。</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Key size={12} /> <span>已保护</span>
                        </div>
                    </div>
                </section>

                {/* Save / Feedback */}
                {message && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : null}
                        {message.text}
                    </div>
                )}

                <div className="flex justify-end pt-2 pb-8">
                    <button
                        type="submit"
                        disabled={saving || editingSection === null}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95
                            ${editingSection === null
                                ? (isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                                : (saved
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20 hover:-translate-y-0.5'
                                )
                            }
                        `}
                    >
                        {saving ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 保存中...</>
                        ) : saved ? (
                            <><CheckCircle2 size={16} /> 已保存</>
                        ) : (
                            <><Save size={16} /> 保存档案</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
