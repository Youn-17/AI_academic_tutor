import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit,
  AlertTriangle, Globe, ArrowLeft, BookOpen, ShieldCheck, Home,
  GraduationCap, Sparkles, Quote
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

// Academic quotes for right panel - cinematic style
const ACADEMIC_QUOTES = {
  'zh-CN': [
    { quote: '教育的目的不是注满一桶水，而是点燃一把火。', author: '叶芝', source: '哲学思考' },
    { quote: '学而不思则罔，思而不学则殆。', author: '孔子', source: '论语·为政' },
    { quote: 'AI 的角色是促进思考，而非替代思考。', author: 'HAKHub', source: '苏格拉底式教学法' },
    { quote: '有效的学术成长依赖于监控、反馈与调整的不间断运行。', author: 'Zimmerman', source: '自我调节学习' },
    { quote: '导师必须保持在环可见与可干预。', author: 'Mosqueira-Rey', source: '人在环治理' },
    { quote: '让研究过程更加透明，让学术支持更加连续，让思维发展更加可见。', author: 'HAKHub', source: '平台愿景' },
  ],
  'zh-TW': [
    { quote: '教育的目的不是注滿一桶水，而是點燃一把火。', author: '葉芝', source: '哲學思考' },
    { quote: '學而不思則罔，思而不學則殆。', author: '孔子', source: '論語·為政' },
    { quote: 'AI 的角色是促進思考，而非替代思考。', author: 'HAKHub', source: '蘇格拉底式教學法' },
    { quote: '有效的學術成長依賴於監控、反饋與調整的不間斷運行。', author: 'Zimmerman', source: '自我調節學習' },
    { quote: '導師必須保持在環可見與可干預。', author: 'Mosqueira-Rey', source: '人在環治理' },
    { quote: '讓研究過程更加透明，讓學術支持更加連續，讓思維發展更加可見。', author: 'HAKHub', source: '平台願景' },
  ],
  'en': [
    { quote: 'Education is not the filling of a pail, but the lighting of a fire.', author: 'William Butler Yeats', source: 'Philosophy' },
    { quote: 'Learning without thought is labor lost; thought without learning is perilous.', author: 'Confucius', source: 'The Analects' },
    { quote: 'AI should promote thinking, not replace it.', author: 'HAKHub', source: 'Socratic Method' },
    { quote: 'Effective academic growth depends on uninterrupted cycles of monitoring, feedback, and adjustment.', author: 'Zimmerman', source: 'Self-Regulated Learning' },
    { quote: 'Supervisors must remain visible and intervenable.', author: 'Mosqueira-Rey', source: 'Human-in-the-Loop' },
    { quote: 'Make research processes more transparent, academic support more continuous, and thinking development more visible.', author: 'HAKHub', source: 'Platform Vision' },
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

  // Auto-rotate quotes and values - cinematic timing
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 7000); // Slower for cinematic feel
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

  // Cinematic Quote Carousel - movie credits style
  const CinematicQuoteCarousel: React.FC = () => {
    const [isAnimating, setIsAnimating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 800);
      return () => clearTimeout(timer);
    }, [currentQuoteIndex]);

    const currentQuote = quotes[currentQuoteIndex];
    const prevQuoteIndex = currentQuoteIndex === 0 ? quotes.length - 1 : currentQuoteIndex - 1;
    const nextQuoteIndex = (currentQuoteIndex + 1) % quotes.length;

    return (
      <div className="relative overflow-hidden rounded-2xl" style={{ background: isDark ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)' : 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)' }}>
        {/* Top decorative line */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${NATURE_COLORS.primary}, transparent)` }} />

        {/* Main quote display */}
        <div className="p-6 text-center" ref={containerRef}>
          {/* Quote icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}>
              <Quote size={18} style={{ color: NATURE_COLORS.primary }} />
            </div>
          </div>

          {/* Quote text with animation */}
          <div className={`transition-all duration-700 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <p className="text-base leading-relaxed mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: isDark ? '#E0F2FE' : NATURE_COLORS.text, fontStyle: 'italic' }}>
              "{currentQuote.quote}"
            </p>

            {/* Author and source */}
            <div className="flex items-center justify-center gap-3 text-xs">
              <span className={`px-3 py-1 rounded-full font-medium ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                {currentQuote.author}
              </span>
              <span className={textMuted}>·</span>
              <span className={textMuted}>{currentQuote.source}</span>
            </div>
          </div>

          {/* Cinematic progress bar */}
          <div className="mt-5 flex justify-center gap-1.5">
            {quotes.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === currentQuoteIndex ? 'w-8' : i === prevQuoteIndex || i === nextQuoteIndex ? 'w-3' : 'w-1.5'
                }`}
                style={{
                  background: i === currentQuoteIndex ? NATURE_COLORS.primary : (i === prevQuoteIndex || i === nextQuoteIndex) ? `${NATURE_COLORS.primary}60` : `${NATURE_COLORS.primary}25`,
                }}
              />
            ))}
          </div>

          {/* Position indicator */}
          <div className={`mt-3 text-xs font-mono ${textMuted}`}>
            {String(currentQuoteIndex + 1).padStart(2, '0')} / {String(quotes.length).padStart(2, '0')}
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${NATURE_COLORS.primary}, transparent)` }} />
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

  // Triadic Mini Diagram - with better icons
  const TriadicMini: React.FC = () => (
    <div className="flex items-center justify-center gap-3 py-8">
      {/* Student */}
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${isDark ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'} border-2`}>
          <GraduationCap size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <span className={`text-xs mt-2.5 font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
          {isEN ? 'Student' : '学生'}
        </span>
      </div>

      {/* Connection - Student to AI */}
      <div className="flex items-center gap-0.5">
        <div className={`w-6 h-0.5 ${isDark ? 'bg-gradient-to-r from-blue-500/50 to-emerald-500/50' : 'bg-gradient-to-r from-blue-300 to-emerald-300'}`} />
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: NATURE_COLORS.primary }} />
      </div>

      {/* AI - Center */}
      <div className="flex flex-col items-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${isDark ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/40' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'} border-2 relative`}>
          <BrainCircuit size={24} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 animate-pulse" />
        </div>
        <span className={`text-xs mt-2.5 font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          {isEN ? 'AI' : 'AI'}
        </span>
      </div>

      {/* Connection - AI to Supervisor */}
      <div className="flex items-center gap-0.5">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: NATURE_COLORS.accent }} />
        <div className={`w-6 h-0.5 ${isDark ? 'bg-gradient-to-r from-emerald-500/50 to-amber-500/50' : 'bg-gradient-to-r from-emerald-300 to-amber-300'}`} />
      </div>

      {/* Supervisor */}
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${isDark ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'} border-2`}>
          <ShieldCheck size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
        </div>
        <span className={`text-xs mt-2.5 font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
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

          {/* Academic Quotes - Cinematic Style */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2 ${textSubtle}`}>
              <Sparkles size={13} style={{ color: NATURE_COLORS.accent }} />
              {isEN ? 'Wisdom & Inspiration' : '智慧与灵感'}
            </h3>
            <CinematicQuoteCarousel />
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
