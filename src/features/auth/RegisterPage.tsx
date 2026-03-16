import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit,
    AlertCircle, User, CheckCircle, GraduationCap, BookOpen, Building2, Award
} from 'lucide-react';

interface RegisterPageProps {
    onSwitchToLogin: () => void;
    onSuccess: () => void;
    theme: 'light' | 'dark';
}

type StudentIdentity = 'undergraduate' | 'master' | 'phd' | 'other';
const IDENTITY_LABELS: Record<StudentIdentity, string> = {
    undergraduate: '本科生',
    master: '硕士生',
    phd: '博士生',
    other: '其他',
};

const TITLE_OPTIONS = ['教授', '副教授', '讲师', '助理讲师', '研究员', '其他'];

const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin, onSuccess, theme }) => {
    const { signUp } = useAuth();
    const isDark = theme === 'dark';

    const [requestedRole, setRequestedRole] = useState<'student' | 'supervisor'>('student');

    // Shared fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [school, setSchool] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Teacher-specific
    const [fullName, setFullName] = useState('');
    const [title, setTitle] = useState('');

    // Student-specific
    const [nickname, setNickname] = useState('');
    const [studentIdentity, setStudentIdentity] = useState<StudentIdentity>('undergraduate');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const inputCls = `w-full pl-12 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20
        ${isDark
            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'}`;

    const iconCls = `absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
    const labelCls = `block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
        if (password.length < 8) { setError('密码长度至少为8位'); return; }
        if (!school.trim()) { setError('请填写学校名称'); return; }

        if (requestedRole === 'supervisor') {
            if (!fullName.trim()) { setError('请填写您的姓名'); return; }
            if (!title.trim()) { setError('请选择您的职称'); return; }
        } else {
            if (!nickname.trim()) { setError('请填写昵称'); return; }
        }

        setLoading(true);
        const metadata = requestedRole === 'supervisor'
            ? { full_name: fullName, title, school, requested_role: 'supervisor' }
            : { nickname, student_identity: studentIdentity, school, requested_role: 'student' };

        const { error } = await signUp(email, password, metadata);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-6 font-sans ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
                <div className={`w-full max-w-md p-8 rounded-2xl border text-center ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-6">
                        <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>注册成功！</h2>
                    <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {requestedRole === 'supervisor' ? (
                            <>请先验证邮箱 <span className="font-medium text-indigo-500">{email}</span>，验证后您的教师申请将等待管理员审核批准。</>
                        ) : (
                            <>请检查您的邮箱 <span className="font-medium text-indigo-500">{email}</span>，点击确认链接完成注册。</>
                        )}
                    </p>
                    <button onClick={onSwitchToLogin} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold">
                        返回登录
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 font-sans transition-colors duration-500 ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-[100%] blur-[120px] opacity-30 ${isDark ? 'bg-indigo-900' : 'bg-blue-200'}`}></div>
            </div>

            <div className={`relative w-full max-w-md p-8 rounded-2xl border shadow-xl backdrop-blur-sm ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 mb-4">
                        <BrainCircuit size={28} className="text-white" />
                    </div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>创建账号</h1>
                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>加入智能学术研讨室</p>
                </div>

                {/* Role Selector */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => setRequestedRole('student')}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${requestedRole === 'student'
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                : isDark ? 'border-slate-700 text-slate-400 hover:border-slate-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                        <GraduationCap size={16} /> 学生
                    </button>
                    <button
                        type="button"
                        onClick={() => setRequestedRole('supervisor')}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${requestedRole === 'supervisor'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                                : isDark ? 'border-slate-700 text-slate-400 hover:border-slate-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                        <BookOpen size={16} /> 教师/导师
                    </button>
                </div>

                {requestedRole === 'supervisor' && (
                    <div className={`mb-4 p-3 rounded-lg text-xs ${isDark ? 'bg-amber-900/20 text-amber-400 border border-amber-700/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        ⚠ 教师账号需经管理员审核后方可使用督导功能
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <AlertCircle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-rose-500">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Teacher fields */}
                    {requestedRole === 'supervisor' && (
                        <>
                            <div>
                                <label className={labelCls}>姓名 <span className="text-rose-400">*</span></label>
                                <div className="relative">
                                    <User size={18} className={iconCls} />
                                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                        placeholder="您的真实姓名" required className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>职称 <span className="text-rose-400">*</span></label>
                                <div className="relative">
                                    <Award size={18} className={iconCls} />
                                    <select value={title} onChange={e => setTitle(e.target.value)} required
                                        className={`${inputCls} appearance-none`}>
                                        <option value="">请选择职称</option>
                                        {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Student fields */}
                    {requestedRole === 'student' && (
                        <>
                            <div>
                                <label className={labelCls}>昵称 <span className="text-rose-400">*</span></label>
                                <div className="relative">
                                    <User size={18} className={iconCls} />
                                    <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                                        placeholder="用于平台显示的昵称（不需要真实姓名）" required className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>学生身份 <span className="text-rose-400">*</span></label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(Object.keys(IDENTITY_LABELS) as StudentIdentity[]).map(k => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => setStudentIdentity(k)}
                                            className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all
                                                ${studentIdentity === k
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                                    : isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600'}`}
                                        >
                                            {IDENTITY_LABELS[k]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* School — both roles */}
                    <div>
                        <label className={labelCls}>学校 <span className="text-rose-400">*</span></label>
                        <div className="relative">
                            <Building2 size={18} className={iconCls} />
                            <input type="text" value={school} onChange={e => setSchool(e.target.value)}
                                placeholder="所在学校/机构" required className={inputCls} />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelCls}>邮箱地址 <span className="text-rose-400">*</span></label>
                        <div className="relative">
                            <Mail size={18} className={iconCls} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com" required className={inputCls} />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className={labelCls}>密码 <span className="text-rose-400">*</span></label>
                        <div className="relative">
                            <Lock size={18} className={iconCls} />
                            <input type={showPassword ? 'text' : 'password'} value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="至少8位字符" required minLength={8}
                                className={`${inputCls} pr-12`} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className={labelCls}>确认密码 <span className="text-rose-400">*</span></label>
                        <div className="relative">
                            <Lock size={18} className={iconCls} />
                            <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="再次输入密码" required
                                className={inputCls} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} />创建账号</>}
                    </button>
                </form>

                <p className={`mt-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    已有账号？{' '}
                    <button onClick={onSwitchToLogin} className="text-indigo-500 hover:text-indigo-400 font-medium">立即登录</button>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
