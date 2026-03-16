import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Loader2, BrainCircuit, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordPageProps {
    onComplete: () => void;
    theme: 'light' | 'dark';
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onComplete, theme }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    const isDark = theme === 'dark';

    // Wait for Supabase to process the recovery token from the URL hash
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSessionReady(true);
            }
        });

        // Also check if session is already established (e.g. page reload)
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setSessionReady(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('密码长度不能少于 8 位');
            return;
        }
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Sign out so user logs in fresh with new password
            await supabase.auth.signOut();
            setTimeout(() => onComplete(), 2500);
        }
    };

    if (success) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-6 font-sans ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
                <div className={`w-full max-w-md p-8 rounded-2xl border text-center ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-6">
                        <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>密码已重置</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        正在跳转到登录页面…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 font-sans transition-colors duration-500 ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-[100%] blur-[120px] opacity-30 ${isDark ? 'bg-indigo-900' : 'bg-blue-200'}`}></div>
            </div>

            <div className={`relative w-full max-w-md p-8 rounded-2xl border shadow-xl backdrop-blur-sm ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 mb-4">
                        <BrainCircuit size={28} className="text-white" />
                    </div>
                    <h1 className={`text-2xl font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        设置新密码
                    </h1>
                    <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        请输入您的新密码
                    </p>
                </div>

                {!sessionReady && (
                    <div className="mb-6 flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">正在验证重置链接…</span>
                    </div>
                )}

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <AlertCircle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-rose-500">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* New Password */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            新密码
                        </label>
                        <div className="relative">
                            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="至少 8 位字符"
                                required
                                disabled={!sessionReady}
                                className={`w-full pl-12 pr-12 py-3 rounded-xl border text-sm transition-all
                  ${isDark
                                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                                    }
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            确认新密码
                        </label>
                        <div className="relative">
                            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="再次输入新密码"
                                required
                                disabled={!sessionReady}
                                className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm transition-all
                  ${isDark
                                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                                    }
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50`}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !sessionReady}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            '确认重置密码'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
