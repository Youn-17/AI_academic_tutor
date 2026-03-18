import React, { useState, useEffect, useCallback } from 'react';
import { Locale } from '@/types';
import {
    Users, CheckCircle, XCircle, Clock, LogOut, ShieldCheck,
    RefreshCw, AlertTriangle, Search, Building2, BookOpen,
    Send, Download, ChevronRight, Eye, UserCheck, GraduationCap,
    FileText, LayoutGrid, Key, Trash2, PlusCircle, EyeOff
} from 'lucide-react';
import * as AdminService from '@/services/AdminService';
import type { PendingTeacher, UserProfile, ClassOverview, ConsentRequest } from '@/services/AdminService';
import { supabase } from '@/lib/supabase';

interface AdminViewProps {
    onLogout: () => void;
    locale: Locale;
    setLocale: (l: Locale) => void;
}

type AdminTab = 'applications' | 'classes' | 'consent' | 'users' | 'api';

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
    student:            { label: '学生',     cls: 'bg-blue-100 text-blue-700' },
    supervisor:         { label: '教师',     cls: 'bg-emerald-100 text-emerald-700' },
    pending_supervisor: { label: '待审核',   cls: 'bg-amber-100 text-amber-700' },
    admin:              { label: '管理员',   cls: 'bg-violet-100 text-violet-700' },
};

const CONSENT_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    pending:          { label: '等待回应', cls: 'bg-amber-100 text-amber-700' },
    both_approved:    { label: '已获授权', cls: 'bg-emerald-100 text-emerald-700' },
    teacher_rejected: { label: '教师已拒绝', cls: 'bg-rose-100 text-rose-700' },
    student_rejected: { label: '学生已拒绝', cls: 'bg-rose-100 text-rose-700' },
    expired:          { label: '已过期',   cls: 'bg-slate-100 text-slate-500' },
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
    const cfg = ROLE_CONFIG[role] || { label: role, cls: 'bg-slate-100 text-slate-600' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
};

const NAV_ITEMS: { id: AdminTab; icon: React.ReactNode; label: string }[] = [
    { id: 'applications', icon: <UserCheck size={20} />, label: '教师审核' },
    { id: 'classes',      icon: <LayoutGrid size={20} />, label: '班级概览' },
    { id: 'consent',      icon: <Eye size={20} />, label: '数据授权' },
    { id: 'users',        icon: <Users size={20} />, label: '用户管理' },
    { id: 'api',          icon: <Key size={20} />, label: 'AI API 配置' },
];

const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('applications');
    const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [classOverview, setClassOverview] = useState<ClassOverview[]>([]);
    const [consentRequests, setConsentRequests] = useState<ConsentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [confirmReject, setConfirmReject] = useState<string | null>(null);

    // AI API config state (admin — platform-wide)
    const [apiConfigs, setApiConfigs] = useState<{ id: string; provider: string; model: string; label: string; masked_key: string; scope: string }[]>([]);
    const [apiForm, setApiForm] = useState({ provider: 'deepseek', model: 'deepseek-chat', api_key: '', label: '' });
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiSaving, setApiSaving] = useState(false);
    const [apiMsg, setApiMsg] = useState<string | null>(null);

    const loadApiConfigs = useCallback(async () => {
        const { data } = await supabase
            .from('ai_api_configs')
            .select('id, provider, model, label, scope, api_key')
            .eq('scope', 'platform')
            .eq('is_active', true);
        if (data) setApiConfigs(data.map(d => ({ ...d, masked_key: '••••••' + d.api_key.slice(-6) })));
    }, []);

    useEffect(() => { loadApiConfigs(); }, [loadApiConfigs]);

    const handleSaveApiKey = async () => {
        if (!apiForm.api_key.trim()) { setApiMsg('请输入 API Key'); return; }
        setApiSaving(true);
        setApiMsg(null);
        try {
            const { data, error } = await supabase.rpc('save_api_config', {
                p_provider: apiForm.provider,
                p_model:    apiForm.model,
                p_api_key:  apiForm.api_key,
                p_label:    apiForm.label || null,
            });
            if (error) throw new Error(error.message);
            if (!data?.ok) throw new Error(data?.error || '保存失败');
            setApiMsg(`已保存（${data.masked_key}）`);
            setApiForm(f => ({ ...f, api_key: '' }));
            loadApiConfigs();
        } catch (e: unknown) {
            setApiMsg((e as Error).message || '保存失败');
        } finally {
            setApiSaving(false);
        }
    };

    const handleDeleteApiConfig = async (id: string) => {
        await supabase.from('ai_api_configs').delete().eq('id', id);
        setApiConfigs(prev => prev.filter(c => c.id !== id));
    };

    // Consent form state
    const [consentForm, setConsentForm] = useState({
        teacher_id: '',
        class_id: '',
        student_id: '',
        reason: '',
    });
    const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
    const [classesForTeacher, setClassesForTeacher] = useState<ClassOverview[]>([]);
    const [studentsForClass, setStudentsForClass] = useState<{ id: string; nickname: string | null; email: string }[]>([]);

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [teachers, users, overview, requests] = await Promise.all([
                AdminService.getPendingTeachers(),
                AdminService.getAllUsers(),
                AdminService.getClassOverview(),
                AdminService.getMyConsentRequests(),
            ]);
            setPendingTeachers(teachers);
            setAllUsers(users);
            setClassOverview(overview);
            setConsentRequests(requests);
            setSupervisors(users.filter(u => u.role === 'supervisor'));
        } catch (e) {
            setError('数据加载失败，请刷新重试');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Consent form: load classes when teacher changes
    useEffect(() => {
        if (!consentForm.teacher_id) {
            setClassesForTeacher([]);
            setStudentsForClass([]);
            setConsentForm(f => ({ ...f, class_id: '', student_id: '' }));
            return;
        }
        const classes = classOverview.filter(c => c.teacher_id === consentForm.teacher_id);
        setClassesForTeacher(classes);
        setConsentForm(f => ({ ...f, class_id: '', student_id: '' }));
    }, [consentForm.teacher_id, classOverview]);

    // Consent form: load students when class changes
    useEffect(() => {
        if (!consentForm.class_id) {
            setStudentsForClass([]);
            setConsentForm(f => ({ ...f, student_id: '' }));
            return;
        }
        supabase
            .from('class_members')
            .select('student_id, profiles!student_id(nickname, email)')
            .eq('class_id', consentForm.class_id)
            .then(({ data }) => {
                const students = (data || []).map((m: { student_id: string; profiles: { nickname: string | null; email: string } | { nickname: string | null; email: string }[] | null }) => {
                    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    return {
                        id: m.student_id,
                        nickname: p?.nickname || null,
                        email: p?.email || '',
                    };
                });
                setStudentsForClass(students);
            });
    }, [consentForm.class_id]);

    // ── Teacher approval ──────────────────────────────────────

    const handleApprove = async (teacher: PendingTeacher) => {
        setActionLoading(teacher.id);
        try {
            await AdminService.approveTeacher(teacher.id);
            setPendingTeachers(prev => prev.filter(t => t.id !== teacher.id));
            showSuccess(`已批准 ${teacher.full_name || teacher.email} 的教师申请`);
            fetchAll();
        } catch { setError('操作失败'); }
        finally { setActionLoading(null); }
    };

    const handleReject = async (teacher: PendingTeacher) => {
        if (confirmReject !== teacher.id) { setConfirmReject(teacher.id); return; }
        setActionLoading(teacher.id);
        setConfirmReject(null);
        try {
            await AdminService.rejectTeacher(teacher.id);
            setPendingTeachers(prev => prev.filter(t => t.id !== teacher.id));
            showSuccess(`已拒绝 ${teacher.full_name || teacher.email} 的申请`);
        } catch { setError('操作失败'); }
        finally { setActionLoading(null); }
    };

    // ── Consent request ───────────────────────────────────────

    const handleSendConsent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consentForm.teacher_id || !consentForm.class_id || !consentForm.student_id || !consentForm.reason.trim()) {
            setError('请填写所有必填项'); return;
        }
        setActionLoading('consent-send');
        try {
            await AdminService.sendConsentRequest(consentForm);
            setConsentForm({ teacher_id: '', class_id: '', student_id: '', reason: '' });
            showSuccess('授权请求已发送，邮件已发送给教师和学生');
            const requests = await AdminService.getMyConsentRequests();
            setConsentRequests(requests);
        } catch (e: unknown) {
            const msg = (e as { message?: string })?.message || '';
            setError(msg.includes('409') || msg.includes('进行中') ? '该组合已有进行中的授权请求' : '发送失败，请重试');
        } finally { setActionLoading(null); }
    };

    const handleDownload = async (req: ConsentRequest) => {
        setActionLoading(`dl-${req.id}`);
        try {
            const display = req.student?.nickname || req.student?.email || req.student_id;
            await AdminService.downloadConsentedData(req.student_id, display);
        } catch { setError('下载失败'); }
        finally { setActionLoading(null); }
    };

    // ── Filters ───────────────────────────────────────────────

    const filteredUsers = allUsers.filter(u => {
        const q = userSearch.toLowerCase();
        return (u.email?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q) ||
            u.nickname?.toLowerCase().includes(q) ||
            u.school?.toLowerCase().includes(q));
    });

    const stats = {
        total: allUsers.length,
        students: allUsers.filter(u => u.role === 'student').length,
        supervisors: allUsers.filter(u => u.role === 'supervisor').length,
        pending: pendingTeachers.length,
    };

    // ── Shared styling ────────────────────────────────────────

    const selectCls = `w-full px-3 py-2.5 rounded-lg border text-sm bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`;

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-16 md:w-56 bg-white border-r border-slate-200 flex flex-col py-4 shrink-0">
                <div className="px-4 mb-6 hidden md:flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <ShieldCheck size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">管理控制台</span>
                </div>
                <div className="flex md:hidden items-center justify-center mb-6">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <ShieldCheck size={16} className="text-white" />
                    </div>
                </div>
                <nav className="flex-1 space-y-1 px-2">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                                ${activeTab === item.id
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            {item.icon}
                            <span className="hidden md:inline">{item.label}</span>
                            {item.id === 'applications' && pendingTeachers.length > 0 && (
                                <span className="hidden md:inline ml-auto text-xs bg-rose-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                    {pendingTeachers.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="px-2 mt-4">
                    <button onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
                        <LogOut size={20} />
                        <span className="hidden md:inline">退出登录</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: '总用户', value: stats.total, icon: <Users size={18} />, color: 'text-indigo-600 bg-indigo-50' },
                            { label: '学生', value: stats.students, icon: <GraduationCap size={18} />, color: 'text-blue-600 bg-blue-50' },
                            { label: '教师', value: stats.supervisors, icon: <BookOpen size={18} />, color: 'text-emerald-600 bg-emerald-50' },
                            { label: '待审核', value: stats.pending, icon: <Clock size={18} />, color: 'text-amber-600 bg-amber-50' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                                    <p className="text-xs text-slate-500">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                            <AlertTriangle size={18} className="text-rose-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-rose-700">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">×</button>
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                            <p className="text-sm text-emerald-700">{successMsg}</p>
                        </div>
                    )}

                    {/* ── Tab: Teacher Applications ── */}
                    {activeTab === 'applications' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-900">教师申请审核</h2>
                                <button onClick={fetchAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                            {loading ? (
                                <div className="text-center py-16 text-slate-400">加载中…</div>
                            ) : pendingTeachers.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                                    <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                                    <p className="text-slate-500">暂无待审核的教师申请</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {pendingTeachers.map(t => (
                                        <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <BookOpen size={18} className="text-emerald-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 truncate">{t.full_name || '未填写姓名'}</p>
                                                    <p className="text-xs text-slate-500 truncate">{t.email}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 mb-4 text-sm">
                                                {t.title && (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <FileText size={14} className="shrink-0 text-slate-400" />
                                                        <span>职称：{t.title}</span>
                                                    </div>
                                                )}
                                                {t.school && (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Building2 size={14} className="shrink-0 text-slate-400" />
                                                        <span>学校：{t.school}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                    <Clock size={12} />
                                                    <span>申请时间：{new Date(t.created_at).toLocaleDateString('zh-CN')}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(t)}
                                                    disabled={actionLoading === t.id}
                                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <CheckCircle size={14} /> 批准
                                                </button>
                                                <button
                                                    onClick={() => handleReject(t)}
                                                    disabled={actionLoading === t.id}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors
                                                        ${confirmReject === t.id
                                                            ? 'bg-rose-600 text-white hover:bg-rose-500'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    <XCircle size={14} />
                                                    {confirmReject === t.id ? '确认拒绝' : '拒绝'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: Class Overview ── */}
                    {activeTab === 'classes' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-900">班级概览</h2>
                                <span className="text-xs text-slate-400">仅显示班级结构，查看交互数据需发起授权请求</span>
                            </div>
                            {loading ? (
                                <div className="text-center py-16 text-slate-400">加载中…</div>
                            ) : classOverview.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                                    <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">暂无班级数据</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                <th className="text-left px-4 py-3 text-slate-600 font-medium">班级名称</th>
                                                <th className="text-left px-4 py-3 text-slate-600 font-medium">教师</th>
                                                <th className="text-left px-4 py-3 text-slate-600 font-medium">学校</th>
                                                <th className="text-right px-4 py-3 text-slate-600 font-medium">学生人数</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {classOverview.map(c => (
                                                <tr key={c.class_id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{c.class_name}</td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {c.teacher_name || '未知'}
                                                        {c.teacher_title && <span className="ml-1.5 text-xs text-slate-400">({c.teacher_title})</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">{c.teacher_school || '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                                            <GraduationCap size={14} className="text-slate-400" />
                                                            {c.student_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => {
                                                                setConsentForm(f => ({ ...f, teacher_id: c.teacher_id }));
                                                                setActiveTab('consent');
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                                        >
                                                            <Eye size={12} /> 申请查看
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: Consent Management ── */}
                    {activeTab === 'consent' && (
                        <div className="space-y-6">
                            {/* Send request form */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Send size={16} className="text-indigo-600" /> 发起数据访问授权请求
                                </h3>
                                <p className="text-sm text-slate-500 mb-5">
                                    选择教师和学生后，系统将同时向双方发送授权确认邮件。<strong>只有双方都同意</strong>，您才能查看该学生与 AI 的交互数据。
                                </p>
                                <form onSubmit={handleSendConsent} className="space-y-4">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">选择教师 *</label>
                                            <select
                                                value={consentForm.teacher_id}
                                                onChange={e => setConsentForm(f => ({ ...f, teacher_id: e.target.value }))}
                                                className={selectCls} required
                                            >
                                                <option value="">请选择教师</option>
                                                {supervisors.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.full_name || s.email} {s.school ? `(${s.school})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">选择班级 *</label>
                                            <select
                                                value={consentForm.class_id}
                                                onChange={e => setConsentForm(f => ({ ...f, class_id: e.target.value }))}
                                                className={selectCls} required
                                                disabled={!consentForm.teacher_id}
                                            >
                                                <option value="">请先选择教师</option>
                                                {classesForTeacher.map(c => (
                                                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">选择学生 *</label>
                                            <select
                                                value={consentForm.student_id}
                                                onChange={e => setConsentForm(f => ({ ...f, student_id: e.target.value }))}
                                                className={selectCls} required
                                                disabled={!consentForm.class_id}
                                            >
                                                <option value="">请先选择班级</option>
                                                {studentsForClass.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.nickname || s.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">访问原因 *</label>
                                        <textarea
                                            value={consentForm.reason}
                                            onChange={e => setConsentForm(f => ({ ...f, reason: e.target.value }))}
                                            placeholder="请说明申请查看数据的研究目的和用途…"
                                            required rows={3}
                                            className={`${selectCls} resize-none`}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={actionLoading === 'consent-send'}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Send size={14} />
                                        {actionLoading === 'consent-send' ? '发送中…' : '发送授权请求邮件'}
                                    </button>
                                </form>
                            </div>

                            {/* Consent request list */}
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3">授权请求记录</h3>
                                {consentRequests.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                                        <Eye size={36} className="text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">暂无授权请求记录</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {consentRequests.map(req => {
                                            const sCfg = CONSENT_STATUS_CONFIG[req.status] || CONSENT_STATUS_CONFIG.expired;
                                            return (
                                                <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sCfg.cls}`}>{sCfg.label}</span>
                                                                <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString('zh-CN')}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-700">
                                                                教师：<strong>{req.teacher?.full_name || '未知'}</strong>
                                                                {' · '}
                                                                学生：<strong>{req.student?.nickname || req.student?.email || '未知'}</strong>
                                                                {' · '}
                                                                班级：<strong>{req.class?.name || '未知'}</strong>
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">原因：{req.reason}</p>
                                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                                <span className={`flex items-center gap-1 ${req.teacher_consent === true ? 'text-emerald-600' : req.teacher_consent === false ? 'text-rose-500' : ''}`}>
                                                                    {req.teacher_consent === true ? <CheckCircle size={12} /> : req.teacher_consent === false ? <XCircle size={12} /> : <Clock size={12} />}
                                                                    教师{req.teacher_consent === true ? '已同意' : req.teacher_consent === false ? '已拒绝' : '待确认'}
                                                                </span>
                                                                <ChevronRight size={12} />
                                                                <span className={`flex items-center gap-1 ${req.student_consent === true ? 'text-emerald-600' : req.student_consent === false ? 'text-rose-500' : ''}`}>
                                                                    {req.student_consent === true ? <CheckCircle size={12} /> : req.student_consent === false ? <XCircle size={12} /> : <Clock size={12} />}
                                                                    学生{req.student_consent === true ? '已同意' : req.student_consent === false ? '已拒绝' : '待确认'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {req.status === 'both_approved' && (
                                                            <button
                                                                onClick={() => handleDownload(req)}
                                                                disabled={actionLoading === `dl-${req.id}`}
                                                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                                            >
                                                                <Download size={13} />
                                                                {actionLoading === `dl-${req.id}` ? '下载中…' : '下载数据'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Tab: AI API Configuration ── */}
                    {activeTab === 'api' && (
                        <div className="max-w-2xl">
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-slate-900">平台 AI API 配置</h2>
                                <p className="text-sm text-slate-500 mt-1">管理员配置的 API Key 将作为平台默认，所有用户均可使用。密钥仅在服务端使用，永不暴露给前端。</p>
                            </div>

                            {/* Existing configs */}
                            {apiConfigs.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-2">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">已配置的 API Key</h3>
                                    {apiConfigs.map(cfg => (
                                        <div key={cfg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                            <div>
                                                <span className="font-medium text-slate-800">{cfg.label || `${cfg.provider} / ${cfg.model}`}</span>
                                                <span className="ml-2 text-slate-400 font-mono text-xs">{cfg.masked_key}</span>
                                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">平台</span>
                                            </div>
                                            <button onClick={() => handleDeleteApiConfig(cfg.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add new config */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PlusCircle size={16} className="text-indigo-600" /> 添加 API Key</h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">服务商</label>
                                            <select value={apiForm.provider}
                                                onChange={e => setApiForm(f => ({ ...f, provider: e.target.value, model: e.target.value === 'deepseek' ? 'deepseek-chat' : 'glm-4-flash' }))}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="deepseek">DeepSeek</option>
                                                <option value="zhipu">智谱 AI</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">模型</label>
                                            <select value={apiForm.model} onChange={e => setApiForm(f => ({ ...f, model: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                {apiForm.provider === 'deepseek'
                                                    ? <><option value="deepseek-chat">deepseek-chat</option><option value="deepseek-reasoner">deepseek-reasoner</option></>
                                                    : <><option value="glm-4-flash">glm-4-flash</option><option value="glm-4">glm-4</option></>}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                                        <div className="relative">
                                            <input type={showApiKey ? 'text' : 'password'} value={apiForm.api_key}
                                                onChange={e => setApiForm(f => ({ ...f, api_key: e.target.value }))}
                                                placeholder="sk-xxxx"
                                                className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                            <button type="button" onClick={() => setShowApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">备注名称（可选）</label>
                                        <input value={apiForm.label} onChange={e => setApiForm(f => ({ ...f, label: e.target.value }))}
                                            placeholder="如：DeepSeek 平台默认"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    </div>
                                    {apiMsg && <p className={`text-sm ${apiMsg.includes('已保存') ? 'text-emerald-600' : 'text-rose-500'}`}>{apiMsg}</p>}
                                    <button onClick={handleSaveApiKey} disabled={apiSaving}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                        <Key size={15} /> {apiSaving ? '保存中…' : '保存 API Key'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: User Management ── */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="flex items-center justify-between mb-4 gap-4">
                                <h2 className="text-lg font-bold text-slate-900">用户管理</h2>
                                <div className="relative flex-1 max-w-xs">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        placeholder="搜索姓名、昵称、邮箱、学校…"
                                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="text-left px-4 py-3 text-slate-600 font-medium">用户</th>
                                            <th className="text-left px-4 py-3 text-slate-600 font-medium">角色</th>
                                            <th className="text-left px-4 py-3 text-slate-600 font-medium">学校</th>
                                            <th className="text-left px-4 py-3 text-slate-600 font-medium hidden md:table-cell">注册时间</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-900">
                                                        {u.role === 'student' ? (u.nickname || u.email) : (u.full_name || u.email)}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </td>
                                                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                                                <td className="px-4 py-3 text-slate-500">{u.school || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                                                    {new Date(u.created_at).toLocaleDateString('zh-CN')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">没有匹配的用户</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminView;
