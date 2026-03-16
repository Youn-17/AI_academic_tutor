import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2, BrainCircuit, AlertCircle, Clock } from 'lucide-react';

// Standalone consent response page — no login required
// Triggered by clicking the approve/reject link in the consent email

const STATUS_CONFIG = {
    both_approved: {
        icon: <CheckCircle size={40} className="text-emerald-500" />,
        bg: 'bg-emerald-500/10',
        title: '双方已同意',
        desc: '管理员现在可以查看相关交互数据，授权将在7天后自动失效。',
    },
    teacher_rejected: {
        icon: <XCircle size={40} className="text-rose-500" />,
        bg: 'bg-rose-500/10',
        title: '已拒绝授权',
        desc: '您已拒绝此次数据访问请求，管理员将无法查看相关数据。',
    },
    student_rejected: {
        icon: <XCircle size={40} className="text-rose-500" />,
        bg: 'bg-rose-500/10',
        title: '已拒绝授权',
        desc: '您已拒绝此次数据访问请求，管理员将无法查看相关数据。',
    },
    pending: {
        icon: <Clock size={40} className="text-amber-500" />,
        bg: 'bg-amber-500/10',
        title: '等待另一方确认',
        desc: '您的回应已记录，还需等待另一方回应后方可生效。',
    },
};

const ConsentPage: React.FC = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    const role = params.get('role') || '';
    const actionParam = params.get('action') || '';

    const [action, setAction] = useState<'approve' | 'reject' | null>(
        actionParam === 'approve' ? 'approve' : actionParam === 'reject' ? 'reject' : null
    );
    const [loading, setLoading] = useState(false);
    const [resultStatus, setResultStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-submit if action is pre-filled from email link
    useEffect(() => {
        if (action && token && role) {
            submit(action);
        }
    }, []); // only on mount

    const submit = async (chosenAction: 'approve' | 'reject') => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('process-consent', {
                body: { token, role, action: chosenAction },
            });
            if (error) throw error;
            setResultStatus(data?.status || 'pending');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '请求失败';
            if (msg.includes('失效') || msg.includes('not found') || msg.includes('404')) {
                setError('链接已失效或已使用，请联系管理员重新发送。');
            } else {
                setError('操作失败，请重试。');
            }
        } finally {
            setLoading(false);
        }
    };

    const roleLabel = role === 'teacher' ? '教师' : '学生';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm">正在处理您的回应…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-500/10 rounded-full mb-6">
                        <AlertCircle size={32} className="text-rose-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">链接无效</h2>
                    <p className="text-slate-600 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (resultStatus) {
        const cfg = STATUS_CONFIG[resultStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${cfg.bg} rounded-full mb-6`}>
                        {cfg.icon}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">{cfg.title}</h2>
                    <p className="text-slate-600 text-sm mb-6">{cfg.desc}</p>
                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                        <BrainCircuit size={18} />
                        <span className="font-semibold text-sm">TechEdu 智能学术平台</span>
                    </div>
                </div>
            </div>
        );
    }

    // No action pre-filled — show approve/reject buttons
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 mb-4">
                        <BrainCircuit size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">数据访问授权</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        您（{roleLabel}）收到了一份数据访问授权请求
                    </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-600">
                    管理员希望查看您相关的 AI 对话数据，请仔细考虑后做出选择。<br />
                    <span className="text-amber-600 font-medium">只有教师和学生双方都同意，管理员才能查看数据。</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => { setAction('reject'); submit('reject'); }}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all"
                    >
                        拒绝授权
                    </button>
                    <button
                        onClick={() => { setAction('approve'); submit('approve'); }}
                        className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all"
                    >
                        同意授权
                    </button>
                </div>

                <p className="mt-6 text-xs text-slate-400 text-center">
                    授权有效期7天，到期自动失效。此操作确认后不可撤销。
                </p>
            </div>
        </div>
    );
};

export default ConsentPage;
