import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, BrainCircuit,
  AlertTriangle, BookOpen, Users, MessageSquare, TrendingUp,
  ChevronLeft, ChevronRight, ShieldCheck, Lightbulb
} from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

// Scholar quotes for right panel
const SCHOLAR_QUOTES = {
  'zh-CN': [
    { quote: '学生开始把机器生成的输出当作认知权威。', author: 'epistemic authorities', year: 2024 },
    { quote: '批判性信任——既对 AI 的可能性保持开放，也对其边界保持警惕。', author: 'critical trust', year: 2024 },
    { quote: '转向 AI，并依赖它的引导——这种依赖可能让学生在需要批判性思维时把判断外包给 AI。', author: 'AI reliance', year: 2024 },
    { quote: '学生真实的想法与认知主体性应被强调。', author: 'epistemic agency', year: 2024 },
    { quote: '高质量监督提供的是安全的对话空间。', author: 'dialogic supervision', year: 2024 },
    { quote: '反思性的、审慎的、协作性的 AI 使用方式。', author: 'responsible AI use', year: 2024 },
  ],
  'zh-TW': [
    { quote: '學生開始把機器生成的輸出當作認知權威。', author: 'epistemic authorities', year: 2024 },
    { quote: '批判性信任——既對 AI 的可能性保持開放，也對其邊界保持警惕。', author: 'critical trust', year: 2024 },
    { quote: '轉向 AI，並依賴它的引導——這種依賴可能讓學生在需要批判性思維時把判斷外包給 AI。', author: 'AI reliance', year: 2024 },
    { quote: '學生真實的想法與認知主體性應被強調。', author: 'epistemic agency', year: 2024 },
    { quote: '高品質監督提供的是安全的對話空間。', author: 'dialogic supervision', year: 2024 },
    { quote: '反思性的、審慎的、協作性的 AI 使用方式。', author: 'responsible AI use', year: 2024 },
  ],
  'en': [
    { quote: 'Students begin treating machine-generated outputs as epistemic authorities.', author: 'AI & Epistemic Authority', year: 2024 },
    { quote: 'Critical trust—a mindset to be open to the affordances, yet cautious about the limits.', author: 'Trust Calibration', year: 2024 },
    { quote: 'Turning to AI and relying on its guidance—outsourcing judgment when critical thinking is needed.', author: 'AI Reliance', year: 2024 },
    { quote: 'Students\' authentic ideas and epistemic agency are emphasized.', author: 'Epistemic Agency', year: 2024 },
    { quote: 'Good supervision provided safe dialogic spaces.', author: 'Dialogic Supervision', year: 2024 },
    { quote: 'Reflective, cautious and collaborative use of AI.', author: 'Responsible AI', year: 2024 },
  ],
};

// Platform value cards
const VALUE_CARDS = {
  'zh-CN': [
    { icon: BookOpen, title: '支持而不替代', desc: 'AI 通过苏格拉底式提问促进学生思考，而非提供捷径。' },
    { icon: Users, title: '导师保持可见', desc: '所有学生—AI 交互对导师透明，支持精准介入。' },
    { icon: ShieldCheck, title: '研究过程导向', desc: '聚焦研究进展与方法论，而非论文代写。' },
  ],
  'zh-TW': [
    { icon: BookOpen, title: '支持而不替代', desc: 'AI 通過蘇格拉底式提問促進學生思考，而非提供捷徑。' },
    { icon: Users, title: '導師保持可見', desc: '所有學生—AI 交互對導師透明，支持精準介入。' },
    { icon: ShieldCheck, title: '研究過程導向', desc: '聚焦研究進展與方法論，而非論文代寫。' },
  ],
  'en': [
    { icon: BookOpen, title: 'Support without substitution', desc: 'AI promotes thinking through Socratic questioning, not shortcuts.' },
    { icon: Users, title: 'Supervisor remains visible', desc: 'All student–AI interactions are transparent to supervisors.' },
    { icon: ShieldCheck, title: 'Process-oriented', desc: 'Focus on research progress, not writing assistance.' },
  ],
};

// Detect browser language for quotes
const getBrowserLocale = (): 'zh-CN' | 'zh-TW' | 'en' => {
  const lang = navigator.language;
  if (lang.startsWith('zh')) {
    return lang === 'zh-TW' || lang === 'zh-HK' ? 'zh-TW' : 'zh-CN';
  }
  return 'en';
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
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Right panel state
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const quoteLocale = getBrowserLocale();
  const quotes = SCHOLAR_QUOTES[quoteLocale];
  const valueCards = VALUE_CARDS[quoteLocale];
  const isEN = quoteLocale === 'en';

  // Auto-rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  // Auto-rotate value cards
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % valueCards.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [valueCards.length]);

  const isDark = theme === 'dark';

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

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'wechat') => {
    setError(null);
    setOauthLoading(provider);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'wechat' ? 'wechat' : provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setOauthLoading(null);
    }
  };

  // Triadic interaction diagram for login page
  const TriadicMini: React.FC = () => (
    <div className="flex items-center justify-center gap-6 py-6">
      {/* Student */}
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-100 border-blue-300'} border`}>
          <Users size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <span className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isEN ? 'Student' : '学生'}
        </span>
      </div>

      {/* Connection */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-emerald-100 border-emerald-300'} border`}>
          <BrainCircuit size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        </div>
        <div className={`w-8 h-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      </div>

      {/* Supervisor */}
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20 border-amber-500/40' : 'bg-amber-100 border-amber-300'} border`}>
          <ShieldCheck size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
        </div>
        <span className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isEN ? 'Supervisor' : '导师'}
        </span>
      </div>
    </div>
  );

  // Quote carousel component
  const QuoteCarousel: React.FC = () => {
    const currentQuote = quotes[currentQuoteIndex];

    return (
      <div className="relative">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <BookOpen size={16} className={`mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <p className={`text-sm leading-relaxed italic mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            "{currentQuote.quote}"
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            — {currentQuote.author} ({currentQuote.year})
          </p>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {quotes.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuoteIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentQuoteIndex
                  ? 'bg-indigo-500 w-4'
                  : isDark ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Value card carousel
  const ValueCardCarousel: React.FC = () => {
    const card = valueCards[currentCardIndex];
    const Icon = card.icon;

    return (
      <div className="space-y-3">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} transition-all`}>
          <Icon size={18} className={`mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <h4 className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {card.title}
          </h4>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {card.desc}
          </p>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-1.5">
          {valueCards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentCardIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentCardIndex
                  ? 'bg-indigo-500 w-4'
                  : isDark ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#020617]' : 'bg-[#F8FAFC]'}`}>
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BrainCircuit size={20} className="text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  HAKHub Scholar
                </h1>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isEN ? 'Human–AI Knowledge Interaction Forum' : '人机知识互动论坛'}
                </p>
              </div>
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} ml-1`}>
              {isEN
                ? 'Enter a research-oriented academic workspace, not an answer engine.'
                : '进入一个面向科研过程而非仅面向答案的学术工作空间。'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-rose-500 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isEN ? 'Email' : '邮箱'}
              </label>
              <div className="relative group">
                <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm transition-all outline-none
                    ${isDark
                      ? 'bg-[#0B101E] border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-slate-900'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-slate-50'
                    }
                  `}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isEN ? 'Password' : '密码'}
                </label>
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-xs text-indigo-500 hover:text-indigo-400 font-medium transition-colors"
                >
                  {isEN ? 'Forgot?' : '忘记密码?'}
                </button>
              </div>
              <div className="relative group">
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl border text-sm transition-all outline-none
                    ${isDark
                      ? 'bg-[#0B101E] border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/50 focus:bg-slate-900'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-slate-50'
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-indigo-600/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isEN ? 'Sign In' : '登录'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className={`px-4 ${isDark ? 'bg-[#020617] text-slate-500' : 'bg-[#F8FAFC] text-slate-400'}`}>
                {isEN ? 'Or continue with' : '或使用以下方式'}
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={!!oauthLoading}
              className={`flex items-center justify-center h-12 rounded-xl border transition-all hover:-translate-y-0.5
                ${isDark
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}
              `}
            >
              {oauthLoading === 'google' ? <Loader2 size={20} className="animate-spin text-slate-500" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
            </button>

            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={!!oauthLoading}
              className={`flex items-center justify-center h-12 rounded-xl border transition-all hover:-translate-y-0.5
                ${isDark
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}
              `}
            >
              {oauthLoading === 'apple' ? <Loader2 size={20} className="animate-spin text-slate-500" /> : (
                <svg className={`w-5 h-5 ${isDark ? 'fill-white' : 'fill-black'}`} viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.54-2.08-.52-3.21.05-1.07.57-2.14.49-3.21-.49-4.39-4.14-3.56-11.23 1.34-11.41 1.25-.05 2.19.78 2.85.79.72-.03 1.94-.88 3.36-.76 1.38.12 2.45.69 3.1 1.63-2.67 1.6-2.22 5.38.48 6.46-.57 1.62-1.32 3.23-2.38 4.31-.5.53-1 .92-1.25 1.04zM12.12 7.24c-.11-2.16 1.76-4.04 3.79-4.24.22 2.39-2.24 4.38-3.79 4.24z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => handleSocialLogin('wechat')}
              disabled={!!oauthLoading}
              className={`flex items-center justify-center h-12 rounded-xl border transition-all hover:-translate-y-0.5
                ${isDark
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}
              `}
            >
              {oauthLoading === 'wechat' ? <Loader2 size={20} className="animate-spin text-slate-500" /> : (
                <svg className="w-6 h-6 fill-[#07C160]" viewBox="0 0 24 24">
                  <path d="M8.618 13.987c-4.485 0-8.118-3.32-8.118-7.414 0-4.086 3.633-7.406 8.118-7.406 4.492 0 8.125 3.32 8.125 7.406 0 4.094-3.633 7.414-8.125 7.414zm0-11c-.68 0-1.121.438-1.121 1.117 0 .68.441 1.117 1.121 1.117.68 0 1.125-.438 1.125-1.117 0-.68-.445-1.117-1.125-1.117zm-4.722 0c-.684 0-1.125.438-1.125 1.117 0 .68.441 1.117 1.125 1.117.68 0 1.117-.438 1.117-1.117 0-.68-.438-1.117-1.117-1.117zm11.722 5.094c0 3.824-3.621 6.93-8.082 6.93-1.031 0-2.023-.172-2.937-.477l-3.551 2.055.836-3.031c-2.309-1.391-3.711-3.625-3.711-6.07 0-4.148 3.965-7.516 8.855-7.516 4.887 0 8.59 3.367 8.59 7.516V8.08zm-4.113-1.422c-.629 0-1.137.5-1.137 1.125 0 .621.508 1.125 1.137 1.125.621 0 1.133-.504 1.133-1.125 0-.625-.512-1.125-1.133-1.125zm-5.066 0c-.629 0-1.141.5-1.141 1.125 0 .621.512 1.125 1.141 1.125.621 0 1.133-.504 1.133-1.125 0-.625-.512-1.125-1.133-1.125z" />
                </svg>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className={`mt-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {isEN ? "Don't have an account?" : '还没有账号？'}{' '}
            <button
              onClick={onSwitchToRegister}
              className={`font-semibold transition-colors ${isDark ? 'text-white hover:text-indigo-400' : 'text-slate-900 hover:text-indigo-600'}`}
            >
              {isEN ? 'Create Account' : '创建账号'}
            </button>
          </div>

          {/* Links */}
          <div className={`mt-6 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <a href="#" className="hover:text-indigo-500 transition-colors">
              {isEN ? 'Privacy Policy' : '隐私政策'}
            </a>
            <span>·</span>
            <a href="#" className="hover:text-indigo-500 transition-colors">
              {isEN ? 'Research Ethics' : '研究伦理'}
            </a>
            <span>·</span>
            <a href="#" className="hover:text-indigo-500 transition-colors">
              {isEN ? 'About' : '关于'}
            </a>
          </div>
        </div>
      </div>

      {/* Right Panel - Dynamic Value Content */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative ${isDark ? 'bg-[#0B101E]' : 'bg-white'}`}>
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 ${isDark ? 'bg-indigo-600' : 'bg-indigo-200'}`} />
          <div className={`absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 ${isDark ? 'bg-blue-600' : 'bg-blue-200'}`} />
        </div>

        <div className="relative max-w-md mx-auto w-full space-y-8">
          {/* Title */}
          <div>
            <Lightbulb size={24} className={`mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
            <h2 className={`text-2xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEN
                ? 'Why This Platform Matters'
                : '为什么这个平台很重要'}
            </h2>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isEN
                ? 'In the continuous interaction between students, AI, and supervisors, we track research progress, identify key issues, and enable evidence-based academic intervention at the right moment.'
                : '在学生、AI 与导师的持续互动中，跟踪研究进展，识别关键问题，并在恰当时机实现有依据的学术介入。'}
            </p>
          </div>

          {/* Triadic Interaction Mini Diagram */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {isEN ? 'Triadic Interaction Model' : '三元互动模型'}
            </h3>
            <TriadicMini />
            <p className={`text-xs text-center mt-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {isEN
                ? 'All interactions visible to supervisor · No private AI conversations'
                : '所有交互对导师可见 · 无私密AI对话'}
            </p>
          </div>

          {/* Scholar Quotes Carousel */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <BookOpen size={14} />
              {isEN ? 'Research Foundation' : '研究基础'}
            </h3>
            <QuoteCarousel />
          </div>

          {/* Value Cards Carousel */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <TrendingUp size={14} />
              {isEN ? 'Platform Values' : '平台价值'}
            </h3>
            <ValueCardCarousel />
          </div>
        </div>

        {/* Bottom note */}
        <div className={`absolute bottom-8 left-12 right-12 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          {isEN
            ? '© 2026 HAKHub Team · HAKHub Scholar Research Platform'
            : '© 2026 HAKHub Team · HAKHub Scholar 研究平台'}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
