import React from 'react';
import { Clock, LogOut, Mail } from 'lucide-react';

interface PendingApprovalPageProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
}

const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onLogout, theme }) => {
    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 font-sans
            ${isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-[100%] blur-[100px] opacity-20
                    ${isDark ? 'bg-amber-800' : 'bg-amber-200'}`} />
            </div>

            <div className={`relative w-full max-w-md p-10 rounded-2xl border shadow-xl backdrop-blur-sm text-center
                ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/10 rounded-full mb-6 ring-1 ring-amber-500/20">
                    <Clock size={36} className="text-amber-500" />
                </div>

                <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    等待审核中
                </h2>

                <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    您的教师账号申请已提交，正在等待管理员审核。
                </p>
                <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    审核通过后，您将收到通知并能够使用完整的督导功能。
                </p>

                {/* Status badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8
                    ${isDark ? 'bg-amber-900/30 text-amber-400 border border-amber-700/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    待管理员审批
                </div>

                {/* Info box */}
                <div className={`flex items-start gap-3 p-4 rounded-xl text-left mb-8
                    ${isDark ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
                    <Mail size={16} className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        如有疑问，请联系系统管理员获取审核进度。审核通过后请重新登录以激活督导功能。
                    </p>
                </div>

                <button
                    onClick={onLogout}
                    className={`flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${isDark
                            ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                    <LogOut size={15} />
                    退出登录
                </button>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
