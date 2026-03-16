import React, { useEffect, useState } from 'react';
import { UserProfile, updateProfile, getProfile } from '@/services/ProfileService';
import { Theme } from '@/types';
import { Save, User, GraduationCap, Key } from 'lucide-react';

interface StudentProfileProps {
    theme: Theme;
}

const IDENTITY_OPTIONS = [
    { value: 'undergraduate', label: '本科生' },
    { value: 'master', label: '硕士研究生' },
    { value: 'phd', label: '博士研究生' },
    { value: 'other', label: '其他' },
];

export default function StudentProfile({ theme }: StudentProfileProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        nickname: '',
        school: '',
        student_identity: '' as string,
        email: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getProfile();
            if (data) {
                setProfile(data);
                setFormData({
                    full_name: data.full_name || '',
                    nickname: data.nickname || '',
                    school: data.school || '',
                    student_identity: data.student_identity || '',
                    email: data.email || '',
                });
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

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
                student_identity: (formData.student_identity as UserProfile['student_identity']) || null,
            });
            setMessage({ text: '档案更新成功', type: 'success' });
        } catch (err) {
            console.error('Failed to update profile:', err);
            setMessage({ text: '更新失败，请重试', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    const bgClass = theme === 'light' ? 'bg-white' : 'bg-[#0F172A]';
    const borderClass = theme === 'light' ? 'border-slate-100' : 'border-slate-800';
    const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all ${theme === 'light'
        ? 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
        : 'bg-slate-900/50 border-slate-700 focus:border-indigo-500 text-slate-100'
        }`;
    const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block";

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className={`text-3xl font-bold font-heading mb-8 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    个人档案
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info */}
                    <section className={`p-6 rounded-2xl border ${bgClass} ${borderClass}`}>
                        <h2 className="flex items-center gap-2 text-lg font-bold mb-6">
                            <User size={20} className="text-indigo-500" /> 基本信息
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>姓名</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="请输入您的真实姓名"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>昵称</label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={formData.nickname}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="显示给他人的名称"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>邮箱</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className={`${inputClass} opacity-50 cursor-not-allowed`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Academic Info */}
                    <section className={`p-6 rounded-2xl border ${bgClass} ${borderClass}`}>
                        <h2 className="flex items-center gap-2 text-lg font-bold mb-6">
                            <GraduationCap size={20} className="text-indigo-500" /> 学术信息
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>学校</label>
                                <input
                                    type="text"
                                    name="school"
                                    value={formData.school}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="例如：北京大学"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>学生身份</label>
                                <select
                                    name="student_identity"
                                    value={formData.student_identity}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">请选择...</option>
                                    {IDENTITY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <section className={`p-6 rounded-2xl border ${bgClass} ${borderClass}`}>
                        <h2 className="flex items-center gap-2 text-lg font-bold mb-4 opacity-50">
                            <Key size={20} /> 安全设置
                        </h2>
                        <p className="text-sm text-slate-500">如需修改密码，请退出后使用"忘记密码"功能重置。</p>
                    </section>

                    {message && (
                        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 ${saving ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            <Save size={18} />
                            {saving ? '保存中...' : '保存档案'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
