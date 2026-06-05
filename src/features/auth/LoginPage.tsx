import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import {
  RiMailLine, RiLock2Line, RiEyeLine, RiEyeOffLine, RiArrowRightLine, RiLoader4Line,
  RiBrainLine, RiErrorWarningLine, RiArrowLeftLine, RiGlobalLine, RiArrowDownSLine, RiCheckLine,
  RiChatQuoteLine, RiSearchEyeLine, RiDoubleQuotesL, RiHistoryLine, RiUserVoiceLine, RiShieldCheckLine,
} from '@remixicon/react';
import Aurora from '@/features/landing/Aurora';
import GlassIcons from '@/features/landing/GlassIcons';
import InfiniteScroll from '@/features/landing/InfiniteScroll';

type Lang = 'zh-CN' | 'zh-TW' | 'en';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

// ── Blue palette (matches the landing page) ──
const NAVY = '#0B2447';
const PRIMARY = '#2563EB';
const SKY = '#38BDF8';

const QUOTES: Record<Lang, { text: string; author: string; source: string }[]> = {
  'zh-CN': [
    { text: '教育的目的不是注满一桶水，而是点燃一把火。', author: '叶芝', source: '哲学思考' },
    { text: '学而不思则罔，思而不学则殆。', author: '孔子', source: '论语·为政' },
    { text: '学习的主权属于学生。', author: 'Scardamalia', source: '认知主体性' },
    { text: '适度的困难是学习的条件，不是障碍。', author: 'Bjork & Bjork', source: '合意困难' },
    { text: '好的反馈让你学会自我调节，而不只是给你答案。', author: 'Hattie & Timperley', source: 'The Power of Feedback' },
    { text: 'AI 的角色是促进思考，而非替代思考。', author: 'HAKHub', source: '苏格拉底式教学法' },
  ],
  'zh-TW': [
    { text: '教育的目的不是注滿一桶水，而是點燃一把火。', author: '葉芝', source: '哲學思考' },
    { text: '學而不思則罔，思而不學則殆。', author: '孔子', source: '論語·為政' },
    { text: '學習的主權屬於學生。', author: 'Scardamalia', source: '認知主體性' },
    { text: '適度的困難是學習的條件，不是障礙。', author: 'Bjork & Bjork', source: '合意困難' },
    { text: '好的反饋讓你學會自我調節，而不只是給你答案。', author: 'Hattie & Timperley', source: 'The Power of Feedback' },
    { text: 'AI 的角色是促進思考，而非替代思考。', author: 'HAKHub', source: '蘇格拉底式教學法' },
  ],
  'en': [
    { text: 'Education is not the filling of a pail, but the lighting of a fire.', author: 'W.B. Yeats', source: 'Philosophy' },
    { text: 'Learning without thought is labor lost.', author: 'Confucius', source: 'The Analects' },
    { text: 'The student owns the learning.', author: 'Scardamalia', source: 'Epistemic agency' },
    { text: 'Difficulty is a condition for learning, not an obstacle.', author: 'Bjork & Bjork', source: 'Desirable difficulties' },
    { text: 'Good feedback teaches self-regulation, not just answers.', author: 'Hattie & Timperley', source: 'The Power of Feedback' },
    { text: 'AI should promote thinking, not replace it.', author: 'HAKHub', source: 'Socratic Method' },
  ],
};

const STR: Record<Lang, Record<string, any>> = {
  'zh-CN': {
    back: '返回首页', brand_sub: '学生·AI·导师 三元科研协同',
    welcome: '欢迎回来',
    tagline: '进入以科研过程为中心的学术工作空间，让进展可见、可对话、可干预。',
    email: '邮箱', password: '密码', forgot: '忘记密码?',
    signin: '登录', no_account: '还没有账号？', register: '创建账号',
    privacy: '隐私政策', ethics: '研究伦理', about: '关于',
    show_title: '一个会"逼你思考"的学术研究导师',
    show_desc: '不是把答案递给你，而是用引导式追问守护你的认知主体性。',
    pillars: ['苏格拉底', '循证检索', '真实引用', '思考可见', '过程记忆', '导师在环'],
    wisdom: '智慧与依据',
    err_invalid: '邮箱或密码错误，请重试',
  },
  'zh-TW': {
    back: '返回首頁', brand_sub: '學生·AI·導師 三元科研協同',
    welcome: '歡迎回來',
    tagline: '進入以科研過程為中心的學術工作空間，讓進展可見、可對話、可干預。',
    email: '郵箱', password: '密碼', forgot: '忘記密碼?',
    signin: '登入', no_account: '還沒有帳號？', register: '創建帳號',
    privacy: '隱私政策', ethics: '研究倫理', about: '關於',
    show_title: '一個會「逼你思考」的學術研究導師',
    show_desc: '不是把答案遞給你，而是用引導式追問守護你的認知主體性。',
    pillars: ['蘇格拉底', '循證檢索', '真實引用', '思考可見', '過程記憶', '導師在環'],
    wisdom: '智慧與依據',
    err_invalid: '郵箱或密碼錯誤，請重試',
  },
  'en': {
    back: 'Back to Home', brand_sub: 'Student · AI · Mentor Triad',
    welcome: 'Welcome back',
    tagline: 'Enter a research-centered workspace where progress is visible, dialogic, and actionable.',
    email: 'Email', password: 'Password', forgot: 'Forgot?',
    signin: 'Sign In', no_account: "Don't have an account?", register: 'Create Account',
    privacy: 'Privacy', ethics: 'Ethics', about: 'About',
    show_title: 'An AI research tutor that makes you think',
    show_desc: 'It does not hand you answers—it guards your epistemic agency through questioning.',
    pillars: ['Socratic', 'Evidence', 'Citations', 'Reasoning', 'Memory', 'Mentor'],
    wisdom: 'Wisdom & evidence',
    err_invalid: 'Invalid email or password',
  },
};

const LANGS: { code: Lang; label: string; sub: string }[] = [
  { code: 'zh-CN', label: '简体中文', sub: 'Simplified Chinese' },
  { code: 'zh-TW', label: '繁體中文', sub: 'Traditional Chinese' },
  { code: 'en', label: 'English', sub: 'English' },
];

const PILLAR_ICONS = [RiChatQuoteLine, RiSearchEyeLine, RiDoubleQuotesL, RiEyeLine, RiHistoryLine, RiUserVoiceLine];
const PILLAR_COLORS = ['#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#38BDF8'];

const LangDropdown: React.FC<{ lang: Lang; onChange: (l: Lang) => void; surface: string; border: string; textBase: string; textMuted: string; isDark: boolean }> = ({ lang, onChange, surface, border, textBase, textMuted, isDark }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
        style={{ background: isDark ? 'rgba(120,170,255,0.08)' : 'rgba(37,99,235,0.06)', color: textMuted }}>
        <RiGlobalLine size={13} /><span>{LANGS.find(l => l.code === lang)?.label}</span>
        <RiArrowDownSLine size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden shadow-2xl z-50" style={{ background: surface, border: `1px solid ${border}` }}>
          {LANGS.map(({ code, label, sub }, i) => (
            <button key={code} onClick={() => { onChange(code); setOpen(false); }} className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
              style={{ background: lang === code ? `${PRIMARY}12` : 'transparent', borderTop: i > 0 ? `1px solid ${border}` : 'none' }}>
              <div><p className="text-sm font-medium" style={{ color: lang === code ? SKY : textBase }}>{label}</p><p className="text-xs" style={{ color: textMuted }}>{sub}</p></div>
              {lang === code && <RiCheckLine size={12} style={{ color: SKY }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister, onSwitchToForgotPassword, onSuccess, theme }) => {
  const { signIn } = useAuth();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('zh-CN');

  const s = STR[lang];
  const quotes = QUOTES[lang];

  // Blue tokens (match landing)
  const bg = isDark ? '#06122A' : '#F4F8FF';
  const surface = isDark ? '#0C1E3E' : '#FFFFFF';
  const border = isDark ? 'rgba(120,170,255,0.14)' : '#DCE6F6';
  const textBase = isDark ? '#E9F1FF' : '#0A1A33';
  const textMuted = isDark ? '#8AA4CC' : '#56688A';
  const inputBg = isDark ? 'rgba(120,170,255,0.05)' : 'rgba(37,99,235,0.03)';
  const cardBg = isDark ? 'rgba(12,30,62,0.55)' : 'rgba(255,255,255,0.72)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      const m = error.message || '';
      const friendly =
        m === 'Invalid login credentials' ? s.err_invalid
        : /email not confirmed/i.test(m) ? (lang === 'en' ? 'Your email is not verified yet — please check your inbox.' : '邮箱尚未验证，请先查收验证邮件后再登录。')
        : /network|failed to fetch|load failed/i.test(m) ? (lang === 'en' ? 'Network error. Check your connection and try again.' : '网络异常，请检查网络后重试。')
        : (lang === 'en' ? 'Sign-in failed. Please try again.' : '登录失败，请稍后重试。');
      setError(friendly);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleBackToLanding = () => {
    sessionStorage.removeItem('hasViewedLanding');
    window.location.reload();
  };

  const quoteCards = quotes.map((q, i) => (
    <div key={i} className="rounded-2xl p-4 border" style={{ background: cardBg, borderColor: border, backdropFilter: 'blur(8px)' }}>
      <RiDoubleQuotesL size={18} style={{ color: SKY, opacity: 0.7 }} />
      <p className="mt-1.5 leading-relaxed italic" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '0.98rem', color: textBase }}>“{q.text}”</p>
      <p className="mt-2 text-xs"><span className="font-semibold" style={{ color: SKY }}>{q.author}</span><span style={{ color: textMuted }}> · {q.source}</span></p>
    </div>
  ));

  const inputFocus = (on: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = `1px solid ${on ? SKY : border}`;
    e.currentTarget.style.boxShadow = on ? `0 0 0 3px ${PRIMARY}22` : 'none';
  };

  return (
    <div className="min-h-screen relative" style={{ background: bg, color: textBase, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      <style>{`
        @keyframes lg-up { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        .lg-up { animation: lg-up .8s cubic-bezier(.16,.84,.3,1) both; }
        @media (prefers-reduced-motion: reduce){ .lg-up { animation:none; opacity:1; transform:none; } }
      `}</style>

      {/* Aurora background (navy → sky) */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, opacity: isDark ? 0.8 : 0.5 }}>
        <Aurora colorStops={[NAVY, PRIMARY, SKY]} amplitude={1.0} blend={0.5} speed={0.5} />
      </div>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: `linear-gradient(to bottom, transparent, transparent 18%, ${bg} 82%)` }} />

      <div className="relative min-h-screen flex flex-col lg:flex-row" style={{ zIndex: 1 }}>

        {/* ── LEFT showcase (desktop) ── */}
        <div className="hidden lg:flex lg:w-[52%] flex-col justify-center px-12 xl:px-20 py-12">
          <div className="lg-up flex items-center gap-3 mb-9" style={{ animationDelay: '0ms' }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${PRIMARY} 60%, ${SKY})`, boxShadow: `0 6px 20px ${PRIMARY}44` }}>
              <RiBrainLine size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: textBase }}>HAKHub Scholar</h1>
              <p className="text-xs" style={{ color: textMuted }}>{s.brand_sub}</p>
            </div>
          </div>

          <h2 className="lg-up font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(1.7rem, 2.6vw, 2.5rem)', color: textBase, lineHeight: 1.15, animationDelay: '80ms' }}>{s.show_title}</h2>
          <p className="lg-up text-[15px] leading-relaxed mb-9 max-w-md" style={{ color: textMuted, animationDelay: '150ms' }}>{s.show_desc}</p>

          <div className="lg-up mb-9 max-w-md" style={{ color: textMuted, animationDelay: '230ms' }}>
            <GlassIcons items={s.pillars.map((label: string, i: number) => ({ icon: React.createElement(PILLAR_ICONS[i], { size: 24 }), label, color: PILLAR_COLORS[i] }))} />
          </div>

          <div className="lg-up max-w-md" style={{ animationDelay: '310ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <RiShieldCheckLine size={14} style={{ color: SKY }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: textMuted }}>{s.wisdom}</span>
            </div>
            <InfiniteScroll items={quoteCards} speed={34} className="h-[230px]" />
          </div>

          <p className="absolute bottom-6 left-12 xl:left-20 text-xs" style={{ color: textMuted, opacity: 0.5 }}>© 2026 HAKHub Team · HAKHub Scholar</p>
        </div>

        {/* ── RIGHT form ── */}
        <div className="flex-1 flex flex-col px-6 sm:px-10 py-7">
          <div className="flex items-center justify-between mb-8">
            <button onClick={handleBackToLanding} className="flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer" style={{ color: textMuted }}
              onMouseEnter={e => (e.currentTarget.style.color = SKY)} onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
              <RiArrowLeftLine size={15} /> {s.back}
            </button>
            <LangDropdown lang={lang} onChange={setLang} surface={surface} border={border} textBase={textBase} textMuted={textMuted} isDark={isDark} />
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="lg-up w-full max-w-[400px] rounded-3xl border p-7 sm:p-9" style={{ background: cardBg, borderColor: border, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: '0 24px 60px rgba(4,14,40,0.22)' }}>
              {/* Brand (mobile shows here) */}
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${PRIMARY} 60%, ${SKY})` }}><RiBrainLine size={20} className="text-white" /></div>
                <h1 className="text-lg font-bold" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: textBase }}>HAKHub Scholar</h1>
              </div>

              <h2 className="font-bold mb-2" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: '2rem', color: textBase }}>{s.welcome}</h2>
              <p className="text-sm leading-relaxed mb-7" style={{ color: textMuted }}>{s.tagline}</p>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <RiErrorWarningLine size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: textMuted }}>{s.email}</label>
                  <div className="relative">
                    <RiMailLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@university.edu" required autoComplete="email"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background: inputBg, border: `1px solid ${border}`, color: textBase }} onFocus={inputFocus(true)} onBlur={inputFocus(false)} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>{s.password}</label>
                    <button type="button" onClick={onSwitchToForgotPassword} className="text-xs font-medium cursor-pointer transition-opacity hover:opacity-75" style={{ color: SKY }}>{s.forgot}</button>
                  </div>
                  <div className="relative">
                    <RiLock2Line size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background: inputBg, border: `1px solid ${border}`, color: textBase }} onFocus={inputFocus(true)} onBlur={inputFocus(false)} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: textMuted }}>
                      {showPwd ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SKY})`, boxShadow: `0 8px 24px ${PRIMARY}45` }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
                  {loading ? <RiLoader4Line size={18} className="animate-spin" /> : <>{s.signin} <RiArrowRightLine size={15} /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: textMuted }}>
                {s.no_account}{' '}
                <button onClick={onSwitchToRegister} className="font-semibold cursor-pointer" style={{ color: SKY }}>{s.register}</button>
              </p>

              <div className="mt-7 flex flex-wrap gap-4 justify-center text-xs" style={{ color: textMuted, opacity: 0.6 }}>
                {[s.privacy, s.ethics, s.about].map((l: string, i: number) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span>·</span>}
                    <a href="#" className="transition-opacity hover:opacity-100 cursor-pointer">{l}</a>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
