import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit, AlertCircle, QrCode } from 'lucide-react';

interface LoginPageProps {
    onSwitchToRegister: () => void;
    onSwitchToForgotPassword: () => void;
    onSuccess: () => void;
    theme: 'light' | 'dark';
}

const LoginPage: React.FC<LoginPageProps> = ({
    onSwitchToRegister,
    onSwitchToForgotPassword,
    onSuccess,
    theme
}) => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isDark = theme === 'dark';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await signIn(email, password);

        if (error) {
            setError(error.message === 'Invalid login credentials'
                ? '邮箱或密码错误，请重试'
                : error.message);
            setLoading(false);
        } else {
            onSuccess();
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple' | 'wechat') => {
        setError(null);
        setOauthLoading(provider);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider === 'wechat' ? 'wechat' : provider, // Note: standard provider names
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            });
            if (error) throw error;
            // The browser will redirect, so no need to stop loading usually.
        } catch (err: any) {
            setError(err.message);
            setOauthLoading(null);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 font-sans transition-colors duration-500 overflow-hidden relative
            ${isDark ? 'bg-[#020617]' : 'bg-[#F8FAFC]'}
        `}>
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className={`absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[150px] opacity-20 mix-blend-screen animate-float
                    ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'}
                `}></div>
                <div className={`absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 mix-blend-screen animate-float-delayed
                    ${isDark ? 'bg-blue-900' : 'bg-blue-200'}
                `}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
            </div>

            <div className={`relative w-full max-w-[420px] p-8 md:p-10 rounded-3xl border shadow-2xl backdrop-blur-xl animate-fade-up
                ${isDark ? 'bg-[#0F172A]/80 border-white/10 shadow-black/40' : 'bg-white/80 border-slate-200/60 shadow-slate-200/50'}
            `}>
                {/* Brand Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/30 mb-5 relative group">
                        <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <BrainCircuit size={24} className="text-white relative z-10" />
                    </div>
                    <h1 className={`text-2xl font-bold font-heading track-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        EduTech Pro
                    </h1>
                    <p className={`mt-2 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        下一代科研与学习助理
                    </p>
                </div>

                {/* Social Login Grid */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <button
                        onClick={() => handleSocialLogin('google')}
                        disabled={!!oauthLoading}
                        className={`flex items-center justify-center h-12 rounded-xl border transition-all hover:-translate-y-0.5
                            ${isDark
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}
                        `}
                    >
                        {oauthLoading === 'google' ? <Loader2 size={20} className="animate-spin text-slate-500" /> : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={() => handleSocialLogin('apple')}
                        disabled={!!oauthLoading}
                        className={`flex items-center justify-center h-12 rounded-xl border transition-all hover:-translate-y-0.5
                            ${isDark
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}
                        `}
                    >
                        {oauthLoading === 'apple' ? <Loader2 size={20} className="animate-spin text-slate-500" /> : (
                            <svg className={`w-5 h-5 ${isDark ? 'fill-white' : 'fill-black'}`} viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.54-2.08-.52-3.21.05-1.07.57-2.14.49-3.21-.49-4.39-4.14-3.56-11.23 1.34-11.41 1.25-.05 2.19.78 2.85.79.72-.03 1.94-.88 3.36-.76 1.38.12 2.45.69 3.1 1.63-2.67 1.6-2.22 5.38.48 6.46-.57 1.62-1.32 3.23-2.38 4.31-.5.53-1 .92-1.25 1.04zM12.12 7.24c-.11-2.16 1.76-4.04 3.79-4.24.22 2.39-2.24 4.38-3.79 4.24z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={() => handleSocialLogin('wechat')}
                        disabled={!!oauthLoading}
                        className={`flex items-center justify-center h-12 rounded-xl border transition-all hover:-translate-y-0.5 group
                            ${isDark
                                ? 'bg-slate-800 border-slate-700 hover:bg-[#07C160]/10 hover:border-[#07C160]/50'
                                : 'bg-white border-slate-200 hover:bg-[#07C160]/5 hover:border-[#07C160]/50 shadow-sm'}
                        `}
                    >
                        {oauthLoading === 'wechat' ? <Loader2 size={20} className="animate-spin text-slate-500" /> : (
                            <svg className={`w-6 h-6 fill-[#07C160] transition-transform group-hover:scale-110`} viewBox="0 0 24 24">
                                <path d="M8.618 13.987c-4.485 0-8.118-3.32-8.118-7.414 0-4.086 3.633-7.406 8.118-7.406 4.492 0 8.125 3.32 8.125 7.406 0 4.094-3.633 7.414-8.125 7.414zm0-11c-.68 0-1.121.438-1.121 1.117 0 .68.441 1.117 1.121 1.117.68 0 1.125-.438 1.125-1.117 0-.68-.445-1.117-1.125-1.117zm-4.722 0c-.684 0-1.125.438-1.125 1.117 0 .68.441 1.117 1.125 1.117.68 0 1.117-.438 1.117-1.117 0-.68-.438-1.117-1.117-1.117zm11.722 5.094c0 3.824-3.621 6.93-8.082 6.93-1.031 0-2.023-.172-2.937-.477l-3.551 2.055.836-3.031c-2.309-1.391-3.711-3.625-3.711-6.07 0-4.148 3.965-7.516 8.855-7.516 4.887 0 8.59 3.367 8.59 7.516V8.08zm-4.113-1.422c-.629 0-1.137.5-1.137 1.125 0 .621.508 1.125 1.137 1.125.621 0 1.133-.504 1.133-1.125 0-.625-.512-1.125-1.133-1.125zm-5.066 0c-.629 0-1.141.5-1.141 1.125 0 .621.512 1.125 1.141 1.125.621 0 1.133-.504 1.133-1.125 0-.625-.512-1.125-1.133-1.125z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Divider */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className={`px-4 ${isDark ? 'bg-[#0F172A] text-slate-500' : 'bg-white text-slate-400'}`}>
                            Or continue with
                        </span>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-fade-in-up">
                        <AlertCircle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-rose-500 font-medium">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Email
                        </label>
                        <div className="relative group">
                            <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@university.edu"
                                required
                                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm transition-all outline-none
                                    ${isDark
                                        ? 'bg-[#0B101E] border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-slate-900 focus:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-100'
                                    }
                                `}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={onSwitchToForgotPassword}
                                className="text-xs text-indigo-500 hover:text-indigo-400 font-bold hover:underline transition-all"
                            >
                                Forgot?
                            </button>
                        </div>
                        <div className="relative group">
                            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className={`w-full pl-12 pr-12 py-3.5 rounded-xl border text-sm transition-all outline-none
                                    ${isDark
                                        ? 'bg-[#0B101E] border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-slate-900 focus:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-100'
                                    }
                                `}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-indigo-600/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-2"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className={`mt-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Done't have an account?{' '}
                    <button
                        onClick={onSwitchToRegister}
                        className={`font-bold transition-colors ${isDark ? 'text-white hover:text-indigo-400' : 'text-slate-900 hover:text-indigo-600'}`}
                    >
                        Create Account
                    </button>
                </div>
            </div>

            {/* Copyright */}
            <div className={`absolute bottom-6 text-xs font-mono opacity-30 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                © 2026 ICET Lab. Secure Login System.
            </div>
        </div>
    );
};

export default LoginPage;
