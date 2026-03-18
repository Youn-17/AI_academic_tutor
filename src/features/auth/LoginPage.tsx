import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit,
  AlertTriangle, Globe, ArrowLeft, BookOpen, ShieldCheck, Home
} from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

// Nature color palette
const NATURE_COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  secondary: '#10B981',
  bgLight: '#ECFDF5',
  text: '#064E3B',
  accent: '#FBBF24',
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  }
};

// Academic quotes for right panel
const ACADEMIC_QUOTES = {
  'zh-CN': [
    { quote: '学生开始把机器生成的输出当作认知权威。', topic: 'AI & 认知权威' },
    { quote: '批判性信任——既对 AI 的可能性保持开放，也对其边界保持警惕。', topic: '批判性信任' },
    { quote: '学生真实的想法与认知主体性应被强调。', topic: '认知主体性' },
    { quote: '高质量监督提供的是安全的对话空间。', topic: '对话式督导' },
  ],
  'zh-TW': [
    { quote: '學生開始把機器生成的輸出當作認知權威。', topic: 'AI & 認知權威' },
    { quote: '批判性信任——既對 AI 的可能性保持開放，也對其邊界保持警惕。', topic: '批判性信任' },
    { quote: '學生真實的想法與認知主體性應被強調。', topic: '認知主體性' },
    { quote: '高品質監督提供的是安全的對話空間。', topic: '對話式督導' },
  ],
  'en': [
    { quote: 'Students begin treating machine-generated outputs as epistemic authorities.', topic: 'AI & Epistemic Authority' },
    { quote: 'Critical trust—open to affordances, yet cautious about limits.', topic: 'Critical Trust' },
    { quote: 'Students\' authentic ideas and epistemic agency are emphasized.', topic: 'Epistemic Agency' },
    { quote: 'Good supervision provides safe dialogic spaces.', topic: 'Dialogic Supervision' },
  ],
};

// Platform values
const PLATFORM_VALUES = {
  'zh-CN': [
    { icon: 'BookOpen', title: '支持而不替代', desc: 'AI 通过苏格拉底式提问促进学生思考，而非提供捷径。' },
    { icon: 'ShieldCheck', title: '导师保持可见', desc: '所有学生—AI 交互对导师透明，支持精准介入。' },
    { icon: 'Globe', title: '研究过程导向', desc: '聚焦研究进展与方法论，而非论文代写。' },
  ],
  'zh-TW': [
    { icon: 'BookOpen', title: '支持而不替代', desc: 'AI 通過蘇格拉底式提問促進學生思考，而非提供捷徑。' },
    { icon: 'ShieldCheck', title: '導師保持可見', desc: '所有學生—AI 交互對導師透明，支持精準介入。' },
    { icon: 'Globe', title: '研究過程導向', desc: '聚焦研究進展與方法論，而非論文代寫。' },
  ],
  'en': [
    { icon: 'BookOpen', title: 'Support without substitution', desc: 'AI promotes thinking through Socratic questioning, not shortcuts.' },
    { icon: 'ShieldCheck', title: 'Supervisor remains visible', desc: 'All student–AI interactions are transparent to supervisors.' },
    { icon: 'Globe', title: 'Process-oriented', desc: 'Focus on research progress, not writing assistance.' },
  ],
};

const ICON_MAP: Record<string, typeof BookOpen> = {
  BookOpen,
  ShieldCheck,
  Globe,
};

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
  const [error, setError] = useState<string | null>(null);

  // Right panel state
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [currentValueIndex, setCurrentValueIndex] = useState(0);
  const [loginLocale, setLoginLocale] = useState<'zh-CN' | 'zh-TW' | 'en'>('zh-CN');

  const quotes = ACADEMIC_QUOTES[loginLocale];
  const values = PLATFORM_VALUES[loginLocale];
  const isEN = loginLocale === 'en';
  const isDark = theme === 'dark';

  // Auto-rotate quotes and values
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
    const valueInterval = setInterval(() => {
      setCurrentValueIndex((prev) => (prev + 1) % values.length);
    }, 5000);
    return () => {
      clearInterval(quoteInterval);
      clearInterval(valueInterval);
    };
  }, [quotes.length, values.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? (isEN ? 'Invalid email or password' : '邮箱或密码错误，请重试')
        : error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  // Go back to landing page
  const handleBackToLanding = () => {
    sessionStorage.removeItem('hasViewedLanding');
    window.location.reload();
  };

  // Style helpers
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const textSubtle = isDark ? 'text-slate-500' : 'text-slate-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBg = isDark ? 'bg-[#0B1416] border-slate-700 focus:border-emerald-500/50 focus:bg-slate-800' : 'bg-white border-slate-200 focus:border-emerald-500 focus:bg-slate-50';
  const cardBg = isDark ? 'bg-[#0F2937]' : 'bg-white';

  // Quote Carousel Component
  const QuoteCarousel: React.FC = () => {
    const quote = quotes[currentQuoteIndex];

    return (
      <div className="relative">
        <div className={`p-5 rounded-xl border-2 ${cardBg} transition-all duration-200`}
             style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : NATURE_COLORS.bgLight }}>
          <BookOpen size={18} className="mb-3" style={{ color: NATURE_COLORS.primary }} />
          <p className="text-sm leading-relaxed italic mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: isDark ? '#E0F2FE' : NATURE_COLORS.text }}>
            "{quote.quote}"
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md font-medium" style={{ background: NATURE_COLORS.bgLight, color: NATURE_COLORS.text }}>
              {quote.topic}
            </span>
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-3">
          {quotes.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuoteIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === currentQuoteIndex ? 'scale-150' : 'opacity-40 hover:opacity-60'
              }`}
              style={{ background: i === currentQuoteIndex ? NATURE_COLORS.primary : NATURE_COLORS.slate[400] }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Value Card Carousel
  const ValueCarousel: React.FC = () => {
    const value = values[currentValueIndex];
    const Icon = ICON_MAP[value.icon];

    return (
      <div className="space-y-3">
        <div className={`p-5 rounded-xl border-2 ${cardBg} transition-all duration-200`}
             style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : NATURE_COLORS.bgLight }}>
          <Icon size={18} className="mb-2" style={{ color: NATURE_COLORS.primary }} />
          <h4 className="font-semibold text-sm mb-1">{value.title}</h4>
          <p className={`text-xs leading-relaxed ${textMuted}`}>{value.desc}</p>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2">
          {values.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentValueIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === currentValueIndex ? 'scale-150' : 'opacity-40 hover:opacity-60'
              }`}
              style={{ background: i === currentValueIndex ? NATURE_COLORS.primary : NATURE_COLORS.slate[400] }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Triadic Mini Diagram
  const TriadicMini: React.FC = () => (
    <div className="flex items-center justify-center gap-4 py-6">
      {/* Student */}
      <div className="flex flex-col items-center">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-100 border-blue-300'} border`}>
          <Globe size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <span className={`text-xs mt-2 ${textSubtle}`}>
          {isEN ? 'Student' : '学生'}
        </span>
      </div>

      {/* Connection */}
      <div className="flex items-center gap-1">
        <div className={`w-5 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-emerald-100 border-emerald-300'} border`}>
          <BrainCircuit size={12} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        </div>
        <div className={`w-5 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      </div>

      {/* Supervisor */}
      <div className="flex flex-col items-center">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20 border-amber-500/40' : 'bg-amber-100 border-amber-300'} border`}>
          <ShieldCheck size={16} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
        </div>
        <span className={`text-xs mt-2 ${textSubtle}`}>
          {isEN ? 'Supervisor' : '导师'}
        </span>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0B1416]' : 'bg-slate-50'}`}>
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-10 relative">
        {/* Top-right back button - mobile */}
        <button
          onClick={handleBackToLanding}
          className="lg:hidden absolute top-5 right-5 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Home size={20} />
        </button>

        <div className="w-full max-w-md">
          {/* Back to Landing Button - Desktop */}
          <button
            onClick={handleBackToLanding}
            className="hidden lg:flex items-center gap-2 text-sm mb-8 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            style={{ color: isDark ? NATURE_COLORS.slate[400] : NATURE_COLORS.slate[600] }}
          >
            <ArrowLeft size={16} />
            {isEN ? 'Back to Home' : '返回首页'}
          </button>

          {/* Brand Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md" style={{ background: NATURE_COLORS.primary }}>
                <BrainCircuit size={22} className="text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  HAKHub Scholar
                </h1>
                <p className={`text-xs ${textSubtle}`}>
                  {isEN ? 'Human–AI Knowledge Interaction Forum' : '人机知识互动论坛'}
                </p>
              </div>
            </div>
            <p className={`text-sm ${textMuted} leading-relaxed`}>
              {isEN
                ? 'Enter a research-oriented academic workspace where progress is visible, dialogic, and actionable.'
                : '进入一个面向科研过程的学术工作空间，让进展可见、可对话、可干预。'
              }
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-500 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold uppercase tracking-wide ${textSubtle}`}>
                {isEN ? 'Email' : '邮箱'}
              </label>
              <div className="relative group">
                <Mail size={17} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isDark ? 'text-slate-500 group-focus-within:text-emerald-400' : 'text-slate-400 group-focus-within:text-emerald-500'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isEN ? 'name@university.edu' : 'name@university.edu'}
                  required
                  autoComplete="email"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm transition-all duration-200 outline-none ${inputBg} ${isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-bold uppercase tracking-wide ${textSubtle}`}>
                  {isEN ? 'Password' : '密码'}
                </label>
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium transition-colors"
                >
                  {isEN ? 'Forgot?' : '忘记密码?'}
                </button>
              </div>
              <div className="relative group">
                <Lock size={17} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isDark ? 'text-slate-500 group-focus-within:text-emerald-400' : 'text-slate-400 group-focus-within:text-emerald-500'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  required
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-11 py-3 rounded-lg border text-sm transition-all duration-200 outline-none ${inputBg} ${isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer text-slate-500 hover:text-slate-300 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: NATURE_COLORS.primary }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = NATURE_COLORS.primaryDark)}
              onMouseLeave={(e) => e.currentTarget.style.background = NATURE_COLORS.primary}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  {isEN ? 'Sign In' : '登录'}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className={`mt-8 text-center text-sm ${textMuted}`}>
            {isEN ? "Don't have an account?" : '还没有账号？'}{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-semibold transition-colors text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              {isEN ? 'Create Account' : '创建账号'}
            </button>
          </div>

          {/* Links */}
          <div className={`mt-6 flex flex-wrap gap-4 justify-center text-xs ${textSubtle}`}>
            <a href="#" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              {isEN ? 'Privacy Policy' : '隐私政策'}
            </a>
            <span>·</span>
            <a href="#" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              {isEN ? 'Research Ethics' : '研究伦理'}
            </a>
            <span>·</span>
            <a href="#" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              {isEN ? 'About' : '关于'}
            </a>
          </div>
        </div>
      </div>

      {/* Right Panel - Dynamic Content */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative ${isDark ? 'bg-[#0B1416]' : 'bg-white'}`}>
        {/* Top-right back button */}
        <button
          onClick={handleBackToLanding}
          className="absolute top-8 right-12 p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isEN ? 'Back to Home' : '返回首页'}
        >
          <Home size={20} />
        </button>

        {/* Background gradient - subtle */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-8%] right-[-8%] w-[350px] h-[350px] rounded-full blur-[100px] opacity-[0.06]" style={{ background: NATURE_COLORS.secondary }} />
          <div className="absolute bottom-[-5%] left-[-5%] w-[280px] h-[280px] rounded-full blur-[80px] opacity-[0.04]" style={{ background: NATURE_COLORS.accent }} />
        </div>

        <div className="relative max-w-md mx-auto w-full space-y-7">
          {/* Language Selector */}
          <div className="flex items-center justify-end">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5">
              {(['zh-CN' as const, 'zh-TW' as const, 'en'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLoginLocale(loc)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                    loginLocale === loc
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {loc === 'zh-CN' ? '简体' : loc === 'zh-TW' ? '繁體' : 'EN'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <ShieldCheck size={22} className="mb-3" style={{ color: NATURE_COLORS.primary }} />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEN ? 'Why This Platform Matters' : '为什么这个平台很重要'}
            </h2>
            <p className={`text-sm leading-relaxed ${textMuted}`}>
              {isEN
                ? 'In the continuous interaction between students, AI, and supervisors, we track research progress, identify key issues, and enable evidence-based academic intervention at the right moment.'
                : '在学生、AI 与导师的持续互动中，跟踪研究进展，识别关键问题，并在恰当时机实现有依据的学术介入。'
              }
            </p>
          </div>

          {/* Triadic Model */}
          <div className={`p-5 rounded-xl border-2 ${cardBg}`}
               style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.15)' : NATURE_COLORS.slate[200] }}>
            <h3 className={`text-xs font-bold uppercase tracking-wide mb-4 ${textSubtle}`}>
              {isEN ? 'Triadic Interaction Model' : '三元互动模型'}
            </h3>
            <TriadicMini />
            <p className={`text-xs text-center mt-2 ${textSubtle}`}>
              {isEN
                ? 'All interactions visible to supervisor · No private AI conversations'
                : '所有交互对导师可见 · 无私密AI对话'
              }
            </p>
          </div>

          {/* Academic Quotes */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2 ${textSubtle}`}>
              <BookOpen size={13} />
              {isEN ? 'Research Foundation' : '研究基础'}
            </h3>
            <QuoteCarousel />
          </div>

          {/* Platform Values */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2 ${textSubtle}`}>
              <Globe size={13} />
              {isEN ? 'Platform Values' : '平台价值'}
            </h3>
            <ValueCarousel />
          </div>
        </div>

        {/* Bottom note */}
        <div className={`absolute bottom-8 left-12 right-12 text-xs ${textSubtle}`}>
          {isEN
            ? '© 2026 HAKHub Team · HAKHub Scholar'
            : '© 2026 HAKHub 团队 · HAKHub Scholar'
          }
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
