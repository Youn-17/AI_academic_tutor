import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit,
  AlertCircle, User, CheckCircle,
  Building2, Award, ArrowLeft, Globe, ChevronDown, Check,
  GraduationCap, BookOpen,
} from 'lucide-react';

type Lang = 'zh-CN' | 'zh-TW' | 'en';
type StudentIdentity = 'undergraduate' | 'master' | 'phd' | 'other';

const em  = '#059669';
const emL = '#10B981';

// ── i18n ─────────────────────────────────────────
const STR: Record<Lang, Record<string, string | Record<string, string>>> = {
  'zh-CN': {
    back: '返回首页', title: '创建账号', subtitle: '加入 HAKHub Scholar 学术社区',
    role_student: '学生', role_supervisor: '教师 / 导师',
    role_hint: '教师账号需经管理员审核后方可使用督导功能',
    name: '姓名', name_ph: '您的真实姓名',
    title_label: '职称', title_ph: '请选择职称',
    nickname: '昵称', nickname_ph: '平台显示的昵称（无需真实姓名）',
    identity_label: '学生身份',
    school: '学校', school_ph: '所在学校 / 机构',
    email: '邮箱', email_ph: 'your@email.com',
    password: '密码', password_ph: '至少 8 位字符',
    confirm: '确认密码', confirm_ph: '再次输入密码',
    submit: '创建账号', have_account: '已有账号？', login: '立即登录',
    err_pwd: '两次输入的密码不一致',
    err_len: '密码长度至少为 8 位',
    err_school: '请填写学校名称',
    err_name: '请填写您的姓名',
    err_title: '请选择您的职称',
    err_nick: '请填写昵称',
    success_title: '注册成功！',
    success_student: '请检查您的邮箱并点击确认链接完成注册。',
    success_supervisor: '请先验证邮箱，验证后您的教师申请将等待管理员审核批准。',
    to_login: '返回登录',
    identity: { undergraduate: '本科生', master: '硕士生', phd: '博士生', other: '其他' },
    titles: ['教授', '副教授', '讲师', '助理讲师', '研究员', '其他'],
    right_title: '加入科研社区',
    right_desc: '与导师连接，与 AI 协作，让您的科研旅程可见、可追踪、有支持。',
    feat_stu_title: '面向学生',
    feat_stu_desc: 'AI 苏格拉底式引导，发展认知主体性。',
    feat_sup_title: '面向导师',
    feat_sup_desc: '监控进展，在恰当时机精准介入。',
    feat_res_title: '证据增强研究',
    feat_res_desc: '接入学术数据库，AI 回应附文献来源。',
  },
  'zh-TW': {
    back: '返回首頁', title: '創建帳號', subtitle: '加入 HAKHub Scholar 學術社區',
    role_student: '學生', role_supervisor: '教師 / 導師',
    role_hint: '教師帳號需經管理員審核後方可使用督導功能',
    name: '姓名', name_ph: '您的真實姓名',
    title_label: '職稱', title_ph: '請選擇職稱',
    nickname: '暱稱', nickname_ph: '平台顯示的暱稱（無需真實姓名）',
    identity_label: '學生身份',
    school: '學校', school_ph: '所在學校 / 機構',
    email: '郵箱', email_ph: 'your@email.com',
    password: '密碼', password_ph: '至少 8 位字符',
    confirm: '確認密碼', confirm_ph: '再次輸入密碼',
    submit: '創建帳號', have_account: '已有帳號？', login: '立即登入',
    err_pwd: '兩次輸入的密碼不一致',
    err_len: '密碼長度至少為 8 位',
    err_school: '請填寫學校名稱',
    err_name: '請填寫您的姓名',
    err_title: '請選擇您的職稱',
    err_nick: '請填寫暱稱',
    success_title: '註冊成功！',
    success_student: '請檢查您的郵箱並點擊確認連結完成註冊。',
    success_supervisor: '請先驗證郵箱，驗證後您的教師申請將等待管理員審核批准。',
    to_login: '返回登入',
    identity: { undergraduate: '本科生', master: '碩士生', phd: '博士生', other: '其他' },
    titles: ['教授', '副教授', '講師', '助理講師', '研究員', '其他'],
    right_title: '加入科研社區',
    right_desc: '與導師連接，與 AI 協作，讓您的科研旅程可見、可追蹤、有支持。',
    feat_stu_title: '面向學生',
    feat_stu_desc: 'AI 蘇格拉底式引導，發展認知主體性。',
    feat_sup_title: '面向導師',
    feat_sup_desc: '監控進展，在恰當時機精準介入。',
    feat_res_title: '證據增強研究',
    feat_res_desc: '接入學術數據庫，AI 回應附文獻來源。',
  },
  'en': {
    back: 'Back to Home', title: 'Create Account', subtitle: 'Join the HAKHub Scholar community',
    role_student: 'Student', role_supervisor: 'Teacher / Supervisor',
    role_hint: 'Supervisor accounts require admin approval before accessing supervision features.',
    name: 'Full Name', name_ph: 'Your real name',
    title_label: 'Academic Title', title_ph: 'Select your title',
    nickname: 'Nickname', nickname_ph: 'Display name (no real name required)',
    identity_label: 'Student Level',
    school: 'Institution', school_ph: 'Your university or institution',
    email: 'Email', email_ph: 'your@email.com',
    password: 'Password', password_ph: 'At least 8 characters',
    confirm: 'Confirm Password', confirm_ph: 'Re-enter your password',
    submit: 'Create Account', have_account: 'Already have an account?', login: 'Sign In',
    err_pwd: 'Passwords do not match',
    err_len: 'Password must be at least 8 characters',
    err_school: 'Please enter your institution',
    err_name: 'Please enter your full name',
    err_title: 'Please select your academic title',
    err_nick: 'Please enter a nickname',
    success_title: 'Registration Successful!',
    success_student: 'Please check your email and click the confirmation link to complete registration.',
    success_supervisor: 'Please verify your email first. Your supervisor application will then await admin approval.',
    to_login: 'Back to Login',
    identity: { undergraduate: 'Undergraduate', master: "Master's", phd: 'PhD', other: 'Other' },
    titles: ['Professor', 'Associate Professor', 'Lecturer', 'Assistant Lecturer', 'Researcher', 'Other'],
    right_title: 'Join the Research Community',
    right_desc: 'Connect with supervisors, collaborate with AI, and make your research journey visible, trackable, and supported.',
    feat_stu_title: 'For Students',
    feat_stu_desc: 'Develop epistemic agency through Socratic AI guidance.',
    feat_sup_title: 'For Supervisors',
    feat_sup_desc: 'Monitor progress and intervene at the right moment.',
    feat_res_title: 'Evidence-Based Research',
    feat_res_desc: 'Semantic Scholar integration for cited AI responses.',
  },
};

const LANGS: { code: Lang; label: string; sub: string }[] = [
  { code: 'zh-CN', label: '简体中文', sub: 'Simplified Chinese' },
  { code: 'zh-TW', label: '繁體中文', sub: 'Traditional Chinese' },
  { code: 'en',    label: 'English',  sub: 'English' },
];

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

// ── CSS Keyframes ─────────────────────────────────
const AnimStyles = () => (
  <style>{`
    @keyframes heroFloat {
      0%, 100% { transform: translateY(0px) scale(1); }
      50%       { transform: translateY(-10px) scale(1.01); }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spinSlow {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to   { transform: translate(-50%, -50%) rotate(360deg); }
    }
    @keyframes collaFloat {
      0%, 100% { transform: translateX(0px) translateY(0px); }
      33%       { transform: translateX(6px) translateY(-8px); }
      66%       { transform: translateX(-4px) translateY(4px); }
    }
  `}</style>
);

// ── Globe Dropdown ────────────────────────────────
const LangDropdown: React.FC<{
  lang: Lang; onChange: (l: Lang) => void; isDark: boolean;
  surface: string; border: string; textBase: string; textMuted: string;
}> = ({ lang, onChange, isDark, surface, border, textBase, textMuted }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer"
        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textMuted }}>
        <Globe size={13} />
        <span>{LANGS.find(l => l.code === lang)?.label}</span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{ background: surface, border: `1px solid ${border}` }}>
          {LANGS.map(({ code, label, sub }, i) => (
            <button key={code} onClick={() => { onChange(code); setOpen(false); }}
              className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 cursor-pointer"
              style={{ background: lang === code ? `${em}12` : 'transparent', borderTop: i > 0 ? `1px solid ${border}` : 'none' }}
              onMouseEnter={e => { if (lang !== code) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (lang !== code) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              <div>
                <p className="text-sm font-medium" style={{ color: lang === code ? emL : textBase }}>{label}</p>
                <p className="text-xs" style={{ color: textMuted }}>{sub}</p>
              </div>
              {lang === code && <Check size={12} style={{ color: emL, flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Reusable form field wrapper ───────────────────
const Field: React.FC<{
  label: string; required?: boolean;
  textMuted: string; children: React.ReactNode;
}> = ({ label, required, textMuted, children }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
      {label} {required && <span style={{ color: '#F87171' }}>*</span>}
    </label>
    <div className="relative">{children}</div>
  </div>
);

// ── Right panel feature item ──────────────────────
const FeatureRow: React.FC<{
  svgSrc: string; color: string; title: string; desc: string;
  surface: string; border: string; textBase: string; textMuted: string;
  delay?: string;
}> = ({ svgSrc, color, title, desc, surface, border, textBase, textMuted, delay = '0s' }) => (
  <div
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px', borderRadius: 14,
      background: surface, border: `1px solid ${border}`,
      animation: `fadeSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
    }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: 'rgba(255,255,255,0.92)',
      border: `1.5px solid ${color}40`,
      boxShadow: `0 2px 10px ${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img src={svgSrc} style={{ width: 32, height: 32, objectFit: 'contain' }} alt={title} />
    </div>
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: textBase, marginBottom: 2 }}>{title}</p>
      <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>{desc}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────
const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin, onSuccess, theme }) => {
  const { signUp } = useAuth();
  const isDark = theme === 'dark';

  const [lang, setLang]               = useState<Lang>('zh-CN');
  const [role, setRole]               = useState<'student' | 'supervisor'>('student');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [school, setSchool]           = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [fullName, setFullName]       = useState('');
  const [titleVal, setTitleVal]       = useState('');
  const [nickname, setNickname]       = useState('');
  const [identity, setIdentity]       = useState<StudentIdentity>('undergraduate');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  // Design tokens
  const bg       = isDark ? '#07111A' : '#F8FAFC';
  const surface  = isDark ? '#0D1E2C' : '#FFFFFF';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const textBase = isDark ? '#E8F1F8' : '#0F172A';
  const textMuted= isDark ? '#7A9BB0' : '#64748B';
  const inputBg  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

  const s              = STR[lang] as Record<string, string>;
  const identityLabels = (STR[lang].identity as Record<string, string>);
  const titleOptions   = (STR[lang].titles as unknown as string[]);

  const inputCls = { background: inputBg, border: `1px solid ${border}`, color: textBase, outline: 'none' };
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.border = `1px solid ${emL}80`);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.border = `1px solid ${border}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError(s.err_pwd); return; }
    if (password.length < 8)          { setError(s.err_len); return; }
    if (!school.trim())                { setError(s.err_school); return; }
    if (role === 'supervisor') {
      if (!fullName.trim())  { setError(s.err_name); return; }
      if (!titleVal.trim())  { setError(s.err_title); return; }
    } else {
      if (!nickname.trim())  { setError(s.err_nick); return; }
    }
    setLoading(true);
    const metadata = role === 'supervisor'
      ? { full_name: fullName, title: titleVal, school, requested_role: 'supervisor' }
      : { nickname, student_identity: identity, school, requested_role: 'student' };
    const { error } = await signUp(email, password, metadata);
    if (error) { setError(error.message); setLoading(false); }
    else       { setSuccess(true); setLoading(false); }
  };

  const handleBackToLanding = () => {
    sessionStorage.removeItem('hasViewedLanding');
    window.location.reload();
  };

  // ── Success state ──────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="w-full max-w-md p-10 rounded-3xl text-center"
          style={{ background: surface, border: `1px solid ${border}`, boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.4)' : '0 24px 60px rgba(0,0,0,0.08)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${em}15` }}>
            <CheckCircle size={30} style={{ color: emL }} />
          </div>
          <h2 className="font-bold mb-3"
            style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '1.8rem', color: textBase }}>
            {s.success_title}
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: textMuted }}>
            {role === 'supervisor' ? s.success_supervisor : s.success_student}{' '}
            <span className="font-semibold" style={{ color: emL }}>{email}</span>
          </p>
          <button onClick={onSwitchToLogin}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-200"
            style={{ background: `linear-gradient(135deg, ${em}, ${emL})`, boxShadow: `0 6px 20px ${em}40` }}>
            {s.to_login}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AnimStyles />

      {/* ── LEFT — Form ── */}
      <div className="w-full lg:w-[48%] flex flex-col justify-center px-8 md:px-12 lg:px-14 py-10 relative">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={handleBackToLanding}
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{ color: textMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = emL)}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
            <ArrowLeft size={15} /> {s.back}
          </button>
          <LangDropdown lang={lang} onChange={setLang} isDark={isDark}
            surface={surface} border={border} textBase={textBase} textMuted={textMuted} />
        </div>

        <div className="w-full max-w-[360px] mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${em}, ${emL})`, boxShadow: `0 6px 20px ${em}40` }}>
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: textBase }}>HAKHub Scholar</span>
          </div>

          <h2 className="font-bold mb-1 leading-tight"
            style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '2rem', color: textBase }}>
            {s.title}
          </h2>
          <p className="text-sm mb-6" style={{ color: textMuted }}>{s.subtitle}</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {(['student', 'supervisor'] as const).map(r => {
              const Icon = r === 'student' ? GraduationCap : BookOpen;
              const label = r === 'student' ? s.role_student : s.role_supervisor;
              const active = role === r;
              return (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className="py-3 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: active ? `${em}70` : border,
                    background: active ? `${em}10` : 'transparent',
                    color: active ? emL : textMuted,
                  }}>
                  <Icon size={15} /> {label}
                </button>
              );
            })}
          </div>

          {role === 'supervisor' && (
            <div className="mb-4 px-4 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
              ⚠ {s.role_hint}
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {role === 'supervisor' && (
              <>
                <Field label={s.name} required textMuted={textMuted}>
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder={s.name_ph} required
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200"
                    style={inputCls} onFocus={handleFocus} onBlur={handleBlur} />
                </Field>
                <Field label={s.title_label} required textMuted={textMuted}>
                  <Award size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: textMuted }} />
                  <select value={titleVal} onChange={e => setTitleVal(e.target.value)} required
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200 appearance-none cursor-pointer"
                    style={inputCls} onFocus={handleFocus} onBlur={handleBlur}>
                    <option value="">{s.title_ph}</option>
                    {titleOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </>
            )}

            {role === 'student' && (
              <>
                <Field label={s.nickname} required textMuted={textMuted}>
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                  <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                    placeholder={s.nickname_ph} required
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200"
                    style={inputCls} onFocus={handleFocus} onBlur={handleBlur} />
                </Field>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
                    {s.identity_label} <span style={{ color: '#F87171' }}>*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.keys(identityLabels) as StudentIdentity[]).map(k => (
                      <button key={k} type="button" onClick={() => setIdentity(k)}
                        className="py-2 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer"
                        style={{
                          borderColor: identity === k ? `${em}70` : border,
                          background: identity === k ? `${em}10` : 'transparent',
                          color: identity === k ? emL : textMuted,
                        }}>
                        {identityLabels[k]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Field label={s.school} required textMuted={textMuted}>
              <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
              <input type="text" value={school} onChange={e => setSchool(e.target.value)}
                placeholder={s.school_ph} required
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200"
                style={inputCls} onFocus={handleFocus} onBlur={handleBlur} />
            </Field>

            <Field label={s.email} required textMuted={textMuted}>
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={s.email_ph} required
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200"
                style={inputCls} onFocus={handleFocus} onBlur={handleBlur} />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label={s.password} required textMuted={textMuted}>
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={s.password_ph} required minLength={8}
                  className="w-full pl-11 pr-10 py-3 rounded-xl text-sm transition-all duration-200"
                  style={inputCls} onFocus={handleFocus} onBlur={handleBlur} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: textMuted }}>
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </Field>
              <Field label={s.confirm} required textMuted={textMuted}>
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                <input type={showPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirm(e.target.value)}
                  placeholder={s.confirm_ph} required
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200"
                  style={inputCls} onFocus={handleFocus} onBlur={handleBlur} />
              </Field>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${em}, ${emL})`, boxShadow: `0 6px 20px ${em}40` }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <><ArrowRight size={15} /> {s.submit}</>}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: textMuted }}>
            {s.have_account}{' '}
            <button onClick={onSwitchToLogin} className="font-semibold cursor-pointer" style={{ color: emL }}>
              {s.login}
            </button>
          </p>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="hidden lg:block w-px flex-shrink-0" style={{ background: border }} />

      {/* ── RIGHT — Community panel ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-10 xl:px-14 py-10 relative overflow-hidden"
        style={{ background: isDark ? '#0A1825' : '#F0FDF4' }}>

        {/* Ambient orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${em}16 0%, transparent 70%)` }} />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, #3B82F614 0%, transparent 70%)` }} />

        {/* Background: collaboration.svg drifting */}
        <img src="/SVG/collaboration.svg" alt="" style={{
          position: 'absolute', right: -30, bottom: 50, width: 220, opacity: 0.04,
          animation: 'collaFloat 14s ease-in-out infinite', pointerEvents: 'none',
        }} />

        {/* Background: workflow-cycle.svg spinning */}
        <img src="/SVG/workflow-cycle.svg" alt="" style={{
          position: 'absolute', left: '50%', top: '44%',
          width: 320, height: 320, opacity: 0.025,
          animation: 'spinSlow 40s linear infinite', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 360, width: '100%', marginLeft: 'auto', marginRight: 'auto' }}>

          {/* Hero SVG */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.06)',
              border: `1px solid ${isDark ? 'rgba(59,130,246,0.18)' : '#BFDBFE'}`,
              borderRadius: 28, padding: 20,
              animation: 'heroFloat 5.5s ease-in-out infinite',
              boxShadow: `0 8px 32px rgba(59,130,246,0.12)`,
            }}>
              <img src="/SVG/team.svg" style={{ width: 130, height: 130, objectFit: 'contain' }} alt="Research Team" />
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '1.85rem',
            fontWeight: 700, lineHeight: 1.3, color: textBase, marginBottom: 8,
          }}>
            {s.right_title}
          </h2>
          <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.65, marginBottom: 20 }}>
            {s.right_desc}
          </p>

          {/* Feature rows with staggered entrance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FeatureRow
              svgSrc="/SVG/Student.svg" color="#3B82F6"
              title={s.feat_stu_title} desc={s.feat_stu_desc}
              surface={surface} border={border} textBase={textBase} textMuted={textMuted}
              delay="0.05s"
            />
            <FeatureRow
              svgSrc="/SVG/teacher.svg" color="#F59E0B"
              title={s.feat_sup_title} desc={s.feat_sup_desc}
              surface={surface} border={border} textBase={textBase} textMuted={textMuted}
              delay="0.15s"
            />
            <FeatureRow
              svgSrc="/SVG/resource-collaboration.svg" color={em}
              title={s.feat_res_title} desc={s.feat_res_desc}
              surface={surface} border={border} textBase={textBase} textMuted={textMuted}
              delay="0.25s"
            />
          </div>

          {/* Add student SVG accent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${border}` }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isDark ? 'rgba(255,255,255,0.88)' : '#FFFFFF',
              border: `1.5px solid ${em}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/SVG/add-student.svg" style={{ width: 26, height: 26, objectFit: 'contain' }} alt="" />
            </div>
            <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
              {lang === 'en'
                ? 'Join a growing community of researchers and educators.'
                : lang === 'zh-TW'
                  ? '加入不斷成長的研究者與教育者社群。'
                  : '加入不断成长的研究者与教育者社群。'}
            </p>
          </div>
        </div>

        <p style={{ position: 'absolute', bottom: 24, left: 40, fontSize: 12, color: textMuted, opacity: 0.5 }}>
          © 2026 HAKHub Team · HAKHub Scholar
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
