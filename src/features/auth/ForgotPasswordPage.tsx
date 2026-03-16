import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, ArrowLeft, Loader2, BrainCircuit, AlertCircle, CheckCircle } from 'lucide-react';

interface ForgotPasswordPageProps {
    onSwitchToLogin: () => void;
    theme: 'light' | 'dark';
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onSwitchToLogin, theme }) => {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isDark = theme === 'dark';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await resetPassword(email);

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
                    <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>邮件已发送</h2>
                    <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        如果 <span className="font-medium text-indigo-500">{email}</span> 已注册，您将收到密码重置邮件。
                    </p>
                    <button
                        onClick={onSwitchToLogin}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                    >
                        返回登录
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 font-sans transition-colors duration-500
      ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}
    `}>
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-[100%] blur-[120px] opacity-30
          ${isDark ? 'bg-indigo-900' : 'bg-blue-200'}
        `}></div>
            </div>

            <div className={`relative w-full max-w-md p-8 rounded-2xl border shadow-xl backdrop-blur-sm
        ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}
      `}>
                {/* Back Button */}
                <button
                    onClick={onSwitchToLogin}
                    className={`flex items-center gap-2 text-sm font-medium mb-6 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <ArrowLeft size={16} />
                    返回登录
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 mb-4">
                        <BrainCircuit size={28} className="text-white" />
                    </div>
                    <h1 className={`text-2xl font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        重置密码
                    </h1>
                    <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        输入您的注册邮箱，我们将发送重置链接
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <AlertCircle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-rose-500">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            邮箱地址
                        </label>
                        <div className="relative">
                            <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm transition-all
                  ${isDark
                                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                                    }
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                `}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            '发送重置链接'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
