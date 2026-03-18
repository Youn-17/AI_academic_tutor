import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit,
  AlertTriangle, ArrowLeft, ShieldCheck,
  GraduationCap, Quote, Globe, ChevronDown, Check,
} from 'lucide-react';

type Lang = 'zh-CN' | 'zh-TW' | 'en';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

const em  = '#059669';
const emL = '#10B981';

const QUOTES: Record<Lang, { text: string; author: string; source: string }[]> = {
  'zh-CN': [
    { text: '教育的目的不是注满一桶水，而是点燃一把火。', author: '叶芝', source: '哲学思考' },
    { text: '学而不思则罔，思而不学则殆。', author: '孔子', source: '论语·为政' },
    { text: 'AI 的角色是促进思考，而非替代思考。', author: 'HAKHub', source: '苏格拉底式教学法' },
    { text: '让研究过程更加透明，让学术支持更加连续，让思维发展更加可见。', author: 'HAKHub', source: '平台愿景' },
  ],
  'zh-TW': [
    { text: '教育的目的不是注滿一桶水，而是點燃一把火。', author: '葉芝', source: '哲學思考' },
    { text: '學而不思則罔，思而不學則殆。', author: '孔子', source: '論語·為政' },
    { text: 'AI 的角色是促進思考，而非替代思考。', author: 'HAKHub', source: '蘇格拉底式教學法' },
    { text: '讓研究過程更加透明，讓學術支持更加連續，讓思維發展更加可見。', author: 'HAKHub', source: '平台願景' },
  ],
  'en': [
    { text: 'Education is not the filling of a pail, but the lighting of a fire.', author: 'W.B. Yeats', source: 'Philosophy' },
    { text: 'Learning without thought is labor lost; thought without learning is perilous.', author: 'Confucius', source: 'The Analects' },
    { text: 'AI should promote thinking, not replace it.', author: 'HAKHub', source: 'Socratic Method' },
    { text: 'Make research processes transparent, academic support continuous, and thinking development visible.', author: 'HAKHub', source: 'Platform Vision' },
  ],
};

const STR: Record<Lang, Record<string, string>> = {
  'zh-CN': {
    back: '返回首页', brand_sub: '人机知识互动论坛',
    tagline: '进入以科研过程为中心的学术工作空间，让进展可见、可对话、可干预。',
    email: '邮箱', password: '密码', forgot: '忘记密码?',
    signin: '登录', no_account: '还没有账号？', register: '创建账号',
    privacy: '隐私政策', ethics: '研究伦理', about: '关于',
    right_title: '为什么选择 HAKHub？',
    right_desc: '在学生、AI 与导师的持续互动中，跟踪研究进展，识别关键问题，在恰当时机实现有依据的学术介入。',
    triadic: '三元互动模型', triadic_note: '所有交互对导师可见 · 无私密 AI 对话',
    student: '学生', ai: 'AI', supervisor: '导师',
    wisdom: '智慧与灵感',
    err_invalid: '邮箱或密码错误，请重试',
  },
  'zh-TW': {
    back: '返回首頁', brand_sub: '人機知識互動論壇',
    tagline: '進入以科研過程為中心的學術工作空間，讓進展可見、可對話、可干預。',
    email: '郵箱', password: '密碼', forgot: '忘記密碼?',
    signin: '登入', no_account: '還沒有帳號？', register: '創建帳號',
    privacy: '隱私政策', ethics: '研究倫理', about: '關於',
    right_title: '為什麼選擇 HAKHub？',
    right_desc: '在學生、AI 與導師的持續互動中，追蹤研究進展，識別關鍵問題，在恰當時機實現有依據的學術介入。',
    triadic: '三元互動模型', triadic_note: '所有交互對導師可見 · 無私密 AI 對話',
    student: '學生', ai: 'AI', supervisor: '導師',
    wisdom: '智慧與靈感',
    err_invalid: '郵箱或密碼錯誤，請重試',
  },
  'en': {
    back: 'Back to Home', brand_sub: 'Human–AI Knowledge Interaction Forum',
    tagline: 'Enter a research-centered academic workspace where progress is visible, dialogic, and actionable.',
    email: 'Email', password: 'Password', forgot: 'Forgot?',
    signin: 'Sign In', no_account: "Don't have an account?", register: 'Create Account',
    privacy: 'Privacy Policy', ethics: 'Research Ethics', about: 'About',
    right_title: 'Why HAKHub?',
    right_desc: 'In continuous interaction between students, AI, and supervisors, track research progress, identify key issues, and enable evidence-based academic intervention.',
    triadic: 'Triadic Interaction Model', triadic_note: 'All interactions visible to supervisor · No private AI chats',
    student: 'Student', ai: 'AI', supervisor: 'Supervisor',
    wisdom: 'Wisdom & Inspiration',
    err_invalid: 'Invalid email or password',
  },
};

const LANGS: { code: Lang; label: string; sub: string }[] = [
  { code: 'zh-CN', label: '简体中文', sub: 'Simplified Chinese' },
  { code: 'zh-TW', label: '繁體中文', sub: 'Traditional Chinese' },
  { code: 'en',    label: 'English',  sub: 'English' },
];

// ── CSS Keyframes ────────────────────────────────
const AnimStyles = () => (
  <style>{`
    @keyframes quoteIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes quoteOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-12px); }
    }
    @keyframes quoteProgress {
      from { width: 0%; }
      to   { width: 100%; }
    }
    @keyframes spinSlow {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to   { transform: translate(-50%, -50%) rotate(360deg); }
    }
    @keyframes floatAI {
      0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
      50%       { transform: translate(-50%, -50%) translateY(-8px); }
    }
    @keyframes floatStu {
      0%, 100% { transform: translate(-50%, -50%) translateY(-4px); }
      50%       { transform: translate(-50%, -50%) translateY(5px); }
    }
    @keyframes floatSup {
      0%, 100% { transform: translate(-50%, -50%) translateY(3px); }
      50%       { transform: translate(-50%, -50%) translateY(-6px); }
    }
  `}</style>
);

// ── Globe Dropdown ────────────────────────────────
const LangDropdown: React.FC<{ lang: Lang; onChange: (l: Lang) => void; isDark: boolean }> = ({ lang, onChange, isDark }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bg       = isDark ? '#0D1E2C' : '#FFFFFF';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const textBase = isDark ? '#E8F1F8' : '#0F172A';
  const textMuted= isDark ? '#7A9BB0' : '#64748B';

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
          style={{ background: bg, border: `1px solid ${border}` }}>
          {LANGS.map(({ code, label, sub }, i) => (
            <button key={code} onClick={() => { onChange(code); setOpen(false); }}
              className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
              style={{
                background: lang === code ? `${em}12` : 'transparent',
                borderTop: i > 0 ? `1px solid ${border}` : 'none',
              }}
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

// ── Triadic Animated Scene ────────────────────────
const TriadicScene: React.FC<{
  isDark: boolean;
  s: Record<string, string>;
  surface: string;
  border: string;
  textMuted: string;
}> = ({ isDark, s, surface, border, textMuted }) => {
  // ViewBox 380×310, node centers:
  // AI: (190, 52), Student: (68, 255), Supervisor: (312, 255)
  const colAI  = em;
  const colSTU = '#3B82F6';
  const colSUP = '#F59E0B';

  const nodeBg = isDark ? 'rgba(255,255,255,0.92)' : '#FFFFFF';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${border}` }}>
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: textMuted, letterSpacing: '0.1em' }}>
          {s.triadic}
        </p>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: emL }} />
          <span className="text-xs" style={{ color: textMuted, opacity: 0.6 }}>live</span>
        </div>
      </div>

      {/* Scene container — fixed height, full width */}
      <div style={{ position: 'relative', height: 270, overflow: 'hidden', margin: '0 16px 8px' }}>

        {/* Background: workflow-cycle.svg slowly spinning */}
        <img
          src="/SVG/workflow-cycle.svg"
          alt=""
          style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 260, height: 260, opacity: 0.04,
            animation: 'spinSlow 32s linear infinite',
            pointerEvents: 'none',
          }}
        />

        {/* SVG layer — connections + flowing dots */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 380 270"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Paths used by animateMotion — node centers: AI(190,46) Stu(68,218) Sup(312,218) */}
            <path id="lp-ai-stu"  d="M 168 74 C 112 138 78 178 86 198" />
            <path id="lp-stu-sup" d="M 104 218 C 158 240 222 240 276 218" />
            <path id="lp-sup-ai"  d="M 294 198 C 308 152 258 106 212 74" />
          </defs>

          {/* Static dashed lines */}
          <use href="#lp-ai-stu"  fill="none" stroke={`${colAI}28`}  strokeWidth="1.5" strokeDasharray="5 4" />
          <use href="#lp-stu-sup" fill="none" stroke={`${colSTU}28`} strokeWidth="1.5" strokeDasharray="5 4" />
          <use href="#lp-sup-ai"  fill="none" stroke={`${colSUP}28`} strokeWidth="1.5" strokeDasharray="5 4" />

          {/* Pulse rings */}
          <circle cx="190" cy="46" r="38" fill="none" stroke={colAI} strokeWidth="1.2">
            <animate attributeName="r"       values="34;42;34" dur="3s"   repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.28;0.07;0.28" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="68" cy="218" r="38" fill="none" stroke={colSTU} strokeWidth="1.2">
            <animate attributeName="r"       values="34;42;34" dur="3.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.28;0.07;0.28" dur="3.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="312" cy="218" r="38" fill="none" stroke={colSUP} strokeWidth="1.2">
            <animate attributeName="r"       values="34;42;34" dur="4.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.28;0.07;0.28" dur="4.2s" repeatCount="indefinite" />
          </circle>

          {/* AI → Student (emerald dots) */}
          <circle r="4.5" fill={emL}>
            <animateMotion dur="2.9s" repeatCount="indefinite" begin="0s"><mpath href="#lp-ai-stu" /></animateMotion>
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.88;1" dur="2.9s" repeatCount="indefinite" begin="0s" />
          </circle>
          <circle r="4.5" fill={emL}>
            <animateMotion dur="2.9s" repeatCount="indefinite" begin="1.45s"><mpath href="#lp-ai-stu" /></animateMotion>
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.88;1" dur="2.9s" repeatCount="indefinite" begin="1.45s" />
          </circle>
          {/* Student → AI (reverse, small) */}
          <circle r="3" fill={emL} opacity="0.5">
            <animateMotion dur="3.8s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" begin="0.9s"><mpath href="#lp-ai-stu" /></animateMotion>
            <animate attributeName="opacity" values="0;0.45;0.45;0" keyTimes="0;0.1;0.9;1" dur="3.8s" repeatCount="indefinite" begin="0.9s" />
          </circle>

          {/* Student → Supervisor (blue dots) */}
          <circle r="4.5" fill={colSTU}>
            <animateMotion dur="3.1s" repeatCount="indefinite" begin="0.5s"><mpath href="#lp-stu-sup" /></animateMotion>
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.88;1" dur="3.1s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          <circle r="4.5" fill={colSTU}>
            <animateMotion dur="3.1s" repeatCount="indefinite" begin="2.05s"><mpath href="#lp-stu-sup" /></animateMotion>
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.88;1" dur="3.1s" repeatCount="indefinite" begin="2.05s" />
          </circle>

          {/* Supervisor → AI (amber dots) */}
          <circle r="4.5" fill={colSUP}>
            <animateMotion dur="2.7s" repeatCount="indefinite" begin="0.2s"><mpath href="#lp-sup-ai" /></animateMotion>
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.88;1" dur="2.7s" repeatCount="indefinite" begin="0.2s" />
          </circle>
          <circle r="4.5" fill={colSUP}>
            <animateMotion dur="2.7s" repeatCount="indefinite" begin="1.55s"><mpath href="#lp-sup-ai" /></animateMotion>
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.88;1" dur="2.7s" repeatCount="indefinite" begin="1.55s" />
          </circle>
        </svg>

        {/* AI node — top center */}
        <div style={{
          position: 'absolute', left: `${190/380*100}%`, top: `${46/270*100}%`,
          transform: 'translate(-50%, -50%)',
          animation: 'floatAI 4.2s ease-in-out infinite',
          textAlign: 'center',
          zIndex: 2,
        }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20,
            background: nodeBg,
            border: `2px solid ${colAI}55`,
            boxShadow: `0 4px 22px ${colAI}28, 0 0 0 4px ${colAI}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/SVG/ai-1.svg" style={{ width: 52, height: 52, objectFit: 'contain' }} alt="AI" />
          </div>
          <div style={{ marginTop: 7 }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 8,
              background: `${colAI}18`, color: emL,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            }}>{s.ai}</span>
          </div>
        </div>

        {/* Student node — bottom left */}
        <div style={{
          position: 'absolute', left: `${68/380*100}%`, top: `${218/270*100}%`,
          transform: 'translate(-50%, -50%)',
          animation: 'floatStu 5s ease-in-out infinite',
          textAlign: 'center',
          zIndex: 2,
        }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20,
            background: nodeBg,
            border: `2px solid ${colSTU}55`,
            boxShadow: `0 4px 22px ${colSTU}28, 0 0 0 4px ${colSTU}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/SVG/Student.svg" style={{ width: 50, height: 50, objectFit: 'contain' }} alt="Student" />
          </div>
          <div style={{ marginTop: 7 }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 8,
              background: `${colSTU}18`, color: colSTU,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            }}>{s.student}</span>
          </div>
        </div>

        {/* Supervisor node — bottom right */}
        <div style={{
          position: 'absolute', left: `${312/380*100}%`, top: `${218/270*100}%`,
          transform: 'translate(-50%, -50%)',
          animation: 'floatSup 4.7s ease-in-out infinite',
          textAlign: 'center',
          zIndex: 2,
        }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20,
            background: nodeBg,
            border: `2px solid ${colSUP}55`,
            boxShadow: `0 4px 22px ${colSUP}28, 0 0 0 4px ${colSUP}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/SVG/teacher-dashboard.svg" style={{ width: 50, height: 50, objectFit: 'contain' }} alt="Supervisor" />
          </div>
          <div style={{ marginTop: 7 }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 8,
              background: `${colSUP}18`, color: colSUP,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            }}>{s.supervisor}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-center pb-4 px-5" style={{ color: textMuted, opacity: 0.65 }}>
        {s.triadic_note}
      </p>
    </div>
  );
};

// ── Main Component ────────────────────────────────
const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister, onSwitchToForgotPassword, onSuccess, theme }) => {
  const { signIn } = useAuth();
  const isDark = theme === 'dark';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [lang, setLang]         = useState<Lang>('zh-CN');

  // Quote state
  const [quoteIdx, setQuoteIdx]     = useState(0);
  const [quoteAnim, setQuoteAnim]   = useState<'in' | 'out'>('in');
  const quoteIdxRef = useRef(0);

  const s      = STR[lang];
  const quotes = QUOTES[lang];

  // Design tokens
  const bg       = isDark ? '#07111A' : '#F8FAFC';
  const surface  = isDark ? '#0D1E2C' : '#FFFFFF';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const textBase = isDark ? '#E8F1F8' : '#0F172A';
  const textMuted= isDark ? '#7A9BB0' : '#64748B';
  const inputBg  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

  // Quote auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      setQuoteAnim('out');
      setTimeout(() => {
        const next = (quoteIdxRef.current + 1) % quotes.length;
        quoteIdxRef.current = next;
        setQuoteIdx(next);
        setQuoteAnim('in');
      }, 370);
    }, 6800);
    return () => clearInterval(id);
  }, [quotes.length]);

  const handleDotClick = (i: number) => {
    if (i === quoteIdx) return;
    setQuoteAnim('out');
    setTimeout(() => {
      quoteIdxRef.current = i;
      setQuoteIdx(i);
      setQuoteAnim('in');
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message === 'Invalid login credentials' ? s.err_invalid : error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleBackToLanding = () => {
    sessionStorage.removeItem('hasViewedLanding');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex" style={{ background: bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AnimStyles />

      {/* ── LEFT — Form panel ── */}
      <div className="w-full lg:w-[48%] flex flex-col justify-center px-8 md:px-12 lg:px-14 py-10 relative">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={handleBackToLanding}
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{ color: textMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = emL)}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
            <ArrowLeft size={15} /> {s.back}
          </button>
          <LangDropdown lang={lang} onChange={setLang} isDark={isDark} />
        </div>

        <div className="w-full max-w-[360px] mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${em}, ${emL})`, boxShadow: `0 6px 20px ${em}40` }}>
              <BrainCircuit size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: textBase }}>HAKHub Scholar</h1>
              <p className="text-xs" style={{ color: textMuted }}>{s.brand_sub}</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="font-bold mb-2 leading-tight"
            style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '2rem', color: textBase }}>
            {lang === 'en' ? 'Welcome back' : '欢迎回来'}
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: textMuted }}>{s.tagline}</p>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
                {s.email}
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@university.edu" required autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: inputBg, border: `1px solid ${border}`, color: textBase }}
                  onFocus={e => (e.currentTarget.style.border = `1px solid ${emL}80`)}
                  onBlur={e => (e.currentTarget.style.border = `1px solid ${border}`)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>
                  {s.password}
                </label>
                <button type="button" onClick={onSwitchToForgotPassword}
                  className="text-xs font-medium transition-colors duration-200 cursor-pointer"
                  style={{ color: emL }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  {s.forgot}
                </button>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: inputBg, border: `1px solid ${border}`, color: textBase }}
                  onFocus={e => (e.currentTarget.style.border = `1px solid ${emL}80`)}
                  onBlur={e => (e.currentTarget.style.border = `1px solid ${border}`)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: textMuted }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: `linear-gradient(135deg, ${em}, ${emL})`, boxShadow: `0 6px 20px ${em}40` }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <>{s.signin} <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: textMuted }}>
            {s.no_account}{' '}
            <button onClick={onSwitchToRegister}
              className="font-semibold cursor-pointer transition-colors duration-200"
              style={{ color: emL }}>
              {s.register}
            </button>
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center text-xs" style={{ color: textMuted, opacity: 0.6 }}>
            {[s.privacy, s.ethics, s.about].map((l, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>·</span>}
                <a href="#" className="transition-opacity hover:opacity-100 cursor-pointer">{l}</a>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="hidden lg:block w-px flex-shrink-0" style={{ background: border }} />

      {/* ── RIGHT — Brand showcase panel ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-10 xl:px-14 py-10 relative overflow-hidden"
        style={{ background: isDark ? '#0A1825' : '#F0FDF4' }}>

        {/* Ambient orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${em}16 0%, transparent 70%)` }} />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, #0EA5E914 0%, transparent 70%)` }} />

        <div className="relative max-w-[360px] w-full mx-auto">
          {/* Title */}
          <div className="mb-6">
            <ShieldCheck size={20} className="mb-3" style={{ color: emL }} />
            <h2 className="font-bold mb-2 leading-tight"
              style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '1.75rem', color: textBase }}>
              {s.right_title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{s.right_desc}</p>
          </div>

          {/* Animated triadic scene */}
          <TriadicScene isDark={isDark} s={s} surface={surface} border={border} textMuted={textMuted} />

          {/* Quote carousel */}
          <div className="mt-5 rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${em}, transparent)` }} />
            <div className="p-5" style={{ background: surface }}>
              <div className="flex items-center gap-2 mb-3">
                <Quote size={13} style={{ color: emL }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: textMuted, letterSpacing: '0.1em' }}>
                  {s.wisdom}
                </span>
              </div>

              {/* Animated quote body */}
              <div
                key={`${quoteIdx}-${quoteAnim}`}
                style={{
                  animation: quoteAnim === 'in'
                    ? 'quoteIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    : 'quoteOut 0.32s ease-in forwards',
                }}
              >
                <p className="leading-relaxed mb-3 italic"
                  style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '1.05rem', color: textBase }}>
                  "{quotes[quoteIdx].text}"
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg font-medium"
                    style={{ background: `${em}15`, color: emL }}>
                    {quotes[quoteIdx].author}
                  </span>
                  <span style={{ color: textMuted }}>· {quotes[quoteIdx].source}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 1, marginTop: 14, overflow: 'hidden' }}>
                <div
                  key={quoteIdx}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${em}, ${emL})`,
                    borderRadius: 1,
                    animation: 'quoteProgress 6.8s linear forwards',
                  }}
                />
              </div>

              {/* Dots */}
              <div className="flex gap-1.5 mt-3">
                {quotes.map((_, i) => (
                  <button key={i} onClick={() => handleDotClick(i)}
                    className="rounded-full transition-all duration-300 cursor-pointer border-0 p-0"
                    style={{
                      width: i === quoteIdx ? '22px' : '6px',
                      height: '6px',
                      background: i === quoteIdx ? emL : `${textMuted}40`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="absolute bottom-6 left-10 text-xs" style={{ color: textMuted, opacity: 0.5 }}>
          © 2026 HAKHub Team · HAKHub Scholar
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
