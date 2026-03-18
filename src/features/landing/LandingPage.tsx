import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, BrainCircuit, Search, BookOpen, Users, ShieldCheck,
  Quote, Lightbulb, ChevronRight, Target, BarChart3, ArrowLeft,
  Eye, X, Menu, MessageSquare, Zap, TrendingUp, CheckCircle2,
  GraduationCap, FileText, Play, Sparkles
} from 'lucide-react';
import { Locale, Theme } from '@/types';

interface LandingPageProps {
  onEnter: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

// Google Fonts import
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Atkinson+Hyperlegible:wght@400;700&family=Inter:wght@400;500;600;700&display=swap';
if (!document.head.querySelector('[href*="Crimson+Pro"]')) document.head.appendChild(fontLink);

// Nature-inspired color palette
const NATURE_COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  secondary: '#10B981',
  cta: '#0891B2',
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

// Animated stats
const STATS = {
  'zh-CN': [
    { value: '500+', label: '活跃学生' },
    { value: '50+', label: '合作导师' },
    { value: '10K+', label: 'AI 对话' },
    { value: '98%', label: '满意度' },
  ],
  'zh-TW': [
    { value: '500+', label: '活躍學生' },
    { value: '50+', label: '合作導師' },
    { value: '10K+', label: 'AI 對話' },
    { value: '98%', label: '滿意度' },
  ],
  'en': [
    { value: '500+', label: 'Active Students' },
    { value: '50+', label: 'Supervisors' },
    { value: '10K+', label: 'AI Conversations' },
    { value: '98%', label: 'Satisfaction' },
  ],
};

// Academic quotes
const ACADEMIC_QUOTES = {
  'zh-CN': [
    { quote: '学生真实的想法与认知主体性应被强调。', source: 'Epistemic Agency' },
    { quote: '批判性信任——既对 AI 的可能性保持开放，也对其边界保持警惕。', source: 'Critical Trust' },
    { quote: '高质量监督提供的是安全的对话空间。', source: 'Dialogic Supervision' },
    { quote: '反思性的、审慎的、协作性的 AI 使用方式。', source: 'Responsible AI' },
  ],
  'zh-TW': [
    { quote: '學生真實的想法與認知主體性應被強調。', source: 'Epistemic Agency' },
    { quote: '批判性信任——既對 AI 的可能性保持開放，也對其邊界保持警惕。', source: 'Critical Trust' },
    { quote: '高品質監督提供的是安全的對話空間。', source: 'Dialogic Supervision' },
    { quote: '反思性的、審慎的、協作性的 AI 使用方式。', source: 'Responsible AI' },
  ],
  'en': [
    { quote: 'Students\' authentic ideas and epistemic agency are emphasized.', source: 'Epistemic Agency' },
    { quote: 'Critical trust—open to affordances, yet cautious about limits.', source: 'Critical Trust' },
    { quote: 'Good supervision provides safe dialogic spaces.', source: 'Dialogic Supervision' },
    { quote: 'Reflective, cautious, and collaborative AI use.', source: 'Responsible AI' },
  ],
};

const T = {
  'zh-CN': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '理念',
    locale: '简体',

    hero_badge: '学术研究新范式',
    hero_title: 'AI 辅助科研督导平台',
    hero_subtitle: '连接学生、AI 与导师，让研究过程更透明、更高效',
    hero_desc: '苏格拉底式对话引导 · 文献证据追溯 · 进展可视化分析 · 导师精准介入',

    cta_primary: '免费开始',
    cta_secondary: '观看演示',

    stats_title: '正在改变学术研究方式',

    features_title: '为什么选择 HAKHub',
    features_1_title: 'AI 苏格拉底式对话',
    features_1_desc: 'AI 不会直接给出答案，而是通过提问引导学生独立思考，培养批判性思维。',
    features_2_title: '全程可追溯',
    features_2_desc: '每一次对话、每一篇文献、每一次导师反馈，都完整记录，形成研究过程档案。',
    features_3_title: '导师实时洞察',
    features_3_desc: '导师随时查看学生研究进展，在关键节点提供指导，不错过介入时机。',
    features_4_title: '证据增强检索',
    features_4_desc: '直接接入 Semantic Scholar，检索结果与 AI 对话联动，保证学术严谨性。',

    how_title: '简单三步，开启高效科研',
    how_1_step: '01',
    how_1_title: '创建账号',
    how_1_desc: '学生或导师注册，建立督导关系',
    how_2_step: '02',
    how_2_title: '开始对话',
    how_2_desc: '学生与 AI 苏格拉底式对话，梳理研究思路',
    how_3_step: '03',
    how_3_title: '导师介入',
    how_3_desc: '导师查看进展，在关键节点提供指导',

    quotes_title: '学术研究基础',
    quotes_sub: '基于当代学术研究的设计理念',

    philosophy_title: '我们的设计原则',
    philosophy_1_title: 'AI 是辅助，不是替代',
    philosophy_1_desc: 'AI 的作用是启发思考，而非提供捷径。我们相信，真正的学术成长来自于独立思考的过程。',
    philosophy_2_title: '过程透明，信任建立',
    philosophy_2_desc: '所有交互对导师可见，不是为了监控，而是为了更好地理解学生需求，提供精准帮助。',
    philosophy_3_title: '面向过程，而非结果',
    philosophy_3_desc: '我们关注研究方法和思维训练，而不是论文产出速度。好的研究需要时间沉淀。',

    cta_section_title: '准备好提升科研质量了吗？',
    cta_section_desc: '加入数百名正在使用 HAKHub 的研究人员',
    cta_button: '立即体验',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '为学术研究而生',
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav_features: 'Features',
    nav_philosophy: 'Philosophy',
    locale: 'EN',

    hero_badge: 'A New Paradigm for Research',
    hero_title: 'AI-Assisted Research Supervision Platform',
    hero_subtitle: 'Connecting students, AI, and supervisors for transparent, efficient research',
    hero_desc: 'Socratic dialogue · Evidence retrieval · Progress analytics · Timely intervention',

    cta_primary: 'Get Started Free',
    cta_secondary: 'Watch Demo',

    stats_title: 'Transforming Academic Research',

    features_title: 'Why HAKHub',
    features_1_title: 'AI Socratic Dialogue',
    features_1_desc: 'AI guides through questioning, not answers—cultivating critical thinking and independence.',
    features_2_title: 'Full Traceability',
    features_2_desc: 'Every conversation, paper, and feedback is recorded, creating a complete research journey archive.',
    features_3_title: 'Real-time Supervision Insights',
    features_3_desc: 'Supervisors monitor progress anytime, identifying the right moments for meaningful intervention.',
    features_4_title: 'Evidence-Enhanced Search',
    features_4_desc: 'Integrated with Semantic Scholar, connecting search results with AI dialogue for academic rigor.',

    how_title: 'Three Simple Steps',
    how_1_step: '01',
    how_1_title: 'Create Account',
    how_1_desc: 'Students or supervisors register to establish supervision relationships',
    how_2_step: '02',
    how_2_title: 'Start Conversations',
    how_2_desc: 'Students engage in Socratic dialogue with AI to clarify research thinking',
    how_3_step: '03',
    how_3_title: 'Supervisor Intervention',
    how_3_desc: 'Supervisors review progress and provide guidance at key moments',

    quotes_title: 'Research Foundation',
    quotes_sub: 'Design principles based on contemporary academic research',

    philosophy_title: 'Our Design Principles',
    philosophy_1_title: 'AI assists, it doesn\'t replace',
    philosophy_1_desc: 'AI inspires thinking, not shortcuts. We believe true academic growth comes from independent reasoning.',
    philosophy_2_title: 'Transparency builds trust',
    philosophy_2_desc: 'All interactions are visible to supervisors—not for monitoring, but for understanding student needs.',
    philosophy_3_title: 'Process over results',
    philosophy_3_desc: 'We focus on research methodology and thinking training, not thesis speed. Good research takes time.',

    cta_section_title: 'Ready to Elevate Your Research?',
    cta_section_desc: 'Join hundreds of researchers already using HAKHub',
    cta_button: 'Get Started Now',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: 'Built for academic research',
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '理念',
    locale: '繁體',

    hero_badge: '學術研究新範式',
    hero_title: 'AI 輔助科研督導平台',
    hero_subtitle: '連接學生、AI 與導師，讓研究過程更透明、更高效',
    hero_desc: '蘇格拉底式對話引導 · 文獻證據追溯 · 進展可視化分析 · 導師精準介入',

    cta_primary: '免費開始',
    cta_secondary: '觀看演示',

    stats_title: '正在改變學術研究方式',

    features_title: '為什麼選擇 HAKHub',
    features_1_title: 'AI 蘇格拉底式對話',
    features_1_desc: 'AI 不會直接給出答案，而是通過提問引導學生獨立思考，培養批判性思維。',
    features_2_title: '全程可追溯',
    features_2_desc: '每一次對話、每一篇文獻、每一次導師反饋，都完整記錄，形成研究過程檔案。',
    features_3_title: '導師實時洞察',
    features_3_desc: '導師隨時查看學生研究進展，在關鍵節點提供指導，不錯過介入時機。',
    features_4_title: '證據增強檢索',
    features_4_desc: '直接接入 Semantic Scholar，檢索結果與 AI 對話聯動，保證學術嚴謹性。',

    how_title: '簡單三步，開啟高效科研',
    how_1_step: '01',
    how_1_title: '創建賬號',
    how_1_desc: '學生或導師註冊，建立督導關係',
    how_2_step: '02',
    how_2_title: '開始對話',
    how_2_desc: '學生與 AI 蘇格拉底式對話，梳理研究思路',
    how_3_step: '03',
    how_3_title: '導師介入',
    how_3_desc: '導師查看進展，在關鍵節點提供指導',

    quotes_title: '學術研究基礎',
    quotes_sub: '基於當代學術研究的設計理念',

    philosophy_title: '我們的設計原則',
    philosophy_1_title: 'AI 是輔助，不是替代',
    philosophy_1_desc: 'AI 的作用是啟發思考，而非提供捷徑。我們相信，真正的學術成長來自於獨立思考的過程。',
    philosophy_2_title: '過程透明，信任建立',
    philosophy_2_desc: '所有交互對導師可見，不是為了監控，而是為了更好地理解學生需求，提供精準幫助。',
    philosophy_3_title: '面向過程，而非結果',
    philosophy_3_desc: '我們關注研究方法和思維訓練，而不是論文產出速度。好的研究需要時間沉澱。',

    cta_section_title: '準備好提升科研質量了嗎？',
    cta_section_desc: '加入數百名正在使用 HAKHub 的研究人員',
    cta_button: '立即體驗',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '為學術研究而生',
  },
};

// Fade-in animation component
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}>
      {children}
    </div>
  );
};

// Triadic Model SVG Component
const TriadicModel: React.FC<{ isDark: boolean; isEN: boolean }> = ({ isDark, isEN }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="relative w-full h-48">
      <svg viewBox="0 0 400 180" className="w-full h-full">
        {/* Connection lines */}
        <line x1="80" y1="140" x2="200" y2="50" stroke="currentColor" strokeWidth="2"
              className={`transition-all duration-300 ${hoveredNode === 'student' || hoveredNode === 'ai' ? 'text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
        <line x1="320" y1="140" x2="200" y2="50" stroke="currentColor" strokeWidth="2"
              className={`transition-all duration-300 ${hoveredNode === 'supervisor' || hoveredNode === 'ai' ? 'text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
        <line x1="80" y1="140" x2="320" y2="140" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5"
              className={`transition-all duration-300 ${hoveredNode === 'student' || hoveredNode === 'supervisor' ? 'text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />

        {/* Student Node */}
        <g onMouseEnter={() => setHoveredNode('student')} onMouseLeave={() => setHoveredNode(null)}
           className="cursor-pointer" style={{ transformOrigin: '80px 140px' }}>
          <circle cx="80" cy="140" r="35" fill={isDark ? '#1E3A5F' : '#DBEAFE'}
                  className={`transition-all duration-300 ${hoveredNode === 'student' ? 'r-40' : ''}`} />
          <GraduationCap size={24} x="56" y="126" className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <text x="80" y="195" textAnchor="middle" className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEN ? 'Student' : '学生'}
          </text>
        </g>

        {/* AI Node */}
        <g onMouseEnter={() => setHoveredNode('ai')} onMouseLeave={() => setHoveredNode(null)}
           className="cursor-pointer">
          <circle cx="200" cy="50" r="38" fill={isDark ? '#064E3B' : '#ECFDF5'}
                  className={`transition-all duration-300 ${hoveredNode === 'ai' ? 'r-42' : ''}`} />
          <BrainCircuit size={28} x="172" y="34" className="text-emerald-600" />
          <text x="200" y="105" textAnchor="middle" className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            AI
          </text>
        </g>

        {/* Supervisor Node */}
        <g onMouseEnter={() => setHoveredNode('supervisor')} onMouseLeave={() => setHoveredNode(null)}
           className="cursor-pointer">
          <circle cx="320" cy="140" r="35" fill={isDark ? '#78350F' : '#FEF3C7'}
                  className={`transition-all duration-300 ${hoveredNode === 'supervisor' ? 'r-40' : ''}`} />
          <ShieldCheck size={24} x="296" y="126" className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <text x="320" y="195" textAnchor="middle" className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEN ? 'Supervisor' : '导师'}
          </text>
        </g>
      </svg>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, locale: localeProp, setLocale, theme, setTheme }) => {
  const t = T[localeProp] as typeof T['en'];
  const isDark = theme === 'dark';
  const isEN = localeProp === 'en';
  const [scrolled, setScrolled] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const quotes = ACADEMIC_QUOTES[localeProp];
  const stats = STATS[localeProp];

  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setHeroVisible(true);
  }, []);

  // Auto-rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('preferred-locale', newLocale);
  };

  const bg = isDark ? 'bg-[#0B1416]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-emerald-900/30' : 'border-slate-200';
  const cardBg = isDark ? 'bg-[#0F2937]' : 'bg-white';

  return (
    <div className={`min-h-screen font-sans ${bg} ${textPrimary}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-amber-500/3 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? `border-b ${borderClass} shadow-sm ${isDark ? 'bg-[#0B1416]/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'}` : ''}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: NATURE_COLORS.primary }}>
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span className="font-semibold text-base">{t.brand}</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {t.nav_features}
            </a>
            <a href="#how" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {t.nav_philosophy}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5">
              {(['zh-CN' as Locale, 'zh-TW', 'en'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLanguageChange(loc)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    localeProp === loc
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {loc === 'zh-CN' ? '简' : loc === 'zh-TW' ? '繁' : 'EN'}
                </button>
              ))}
            </div>

            <button
              onClick={onEnter}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              style={{ background: NATURE_COLORS.primary }}
            >
              {t.cta_primary} <ArrowRight size={16} />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1416] py-4 px-5 animate-in slide-in-from-top">
            <div className="flex flex-col gap-3 mb-4">
              <a href="#features" className="text-sm font-medium py-2 text-slate-600 dark:text-slate-400" onClick={() => setMobileMenuOpen(false)}>
                {t.nav_features}
              </a>
              <a href="#how" className="text-sm font-medium py-2 text-slate-600 dark:text-slate-400" onClick={() => setMobileMenuOpen(false)}>
                {t.nav_philosophy}
              </a>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5">
              {(['zh-CN' as Locale, 'zh-TW', 'en'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => { handleLanguageChange(loc); setMobileMenuOpen(false); }}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    localeProp === loc
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {loc === 'zh-CN' ? '简体' : loc === 'zh-TW' ? '繁體' : 'EN'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { onEnter(); setMobileMenuOpen(false); }}
              className="w-full mt-4 py-3 rounded-lg text-white font-medium transition-all"
              style={{ background: NATURE_COLORS.primary }}
            >
              {t.cta_primary}
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-5 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeIn delay={100}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
                   style={{ background: NATURE_COLORS.bgLight, borderColor: NATURE_COLORS.secondary, color: NATURE_COLORS.text }}>
                <Sparkles size={14} />
                {t.hero_badge}
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                  style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
                {t.hero_title}
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-xl font-medium mb-4 text-slate-700 dark:text-slate-300">
                {t.hero_subtitle}
              </p>
            </FadeIn>

            <FadeIn delay={400}>
              <p className={`text-sm leading-relaxed mb-8 ${textMuted}`}>
                {t.hero_desc}
              </p>
            </FadeIn>

            <FadeIn delay={500}>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onEnter}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
                  style={{ background: NATURE_COLORS.primary }}
                >
                  {t.cta_primary} <ArrowRight size={18} />
                </button>
                <button
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium border-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95"
                  style={{ borderColor: isDark ? NATURE_COLORS.slate[700] : NATURE_COLORS.slate[200], color: isDark ? NATURE_COLORS.slate[300] : NATURE_COLORS.slate[700] }}
                >
                  <Play size={16} />
                  {t.cta_secondary}
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Interactive Triadic Model */}
          <FadeIn delay={300} className="hidden lg:block">
            <div className={`p-8 rounded-3xl border-2 ${cardBg}`}
                 style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : NATURE_COLORS.bgLight }}>
              <div className="text-center mb-6">
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                  {isEN ? 'Triadic Collaboration Model' : '三元协同模型'}
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  {isEN ? 'Hover to explore connections' : '悬停查看连接关系'}
                </p>
              </div>
              <TriadicModel isDark={isDark} isEN={isEN} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-5 border-y" style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.1)' : NATURE_COLORS.bgLight }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2 className="text-center text-lg font-semibold mb-8" style={{ color: NATURE_COLORS.primary }}>
              {t.stats_title}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="text-center p-4 rounded-xl transition-all duration-300 hover:scale-105"
                     style={{ background: isDark ? 'rgba(16, 185, 129, 0.05)' : NATURE_COLORS.bgLight }}>
                  <p className="text-3xl font-bold mb-1" style={{ color: NATURE_COLORS.primary }}>{stat.value}</p>
                  <p className={`text-xs ${textMuted}`}>{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
              {t.features_title}
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {[
              { icon: MessageSquare, title: t.features_1_title, desc: t.features_1_desc },
              { icon: FileText, title: t.features_2_title, desc: t.features_2_desc },
              { icon: Eye, title: t.features_3_title, desc: t.features_3_desc },
              { icon: Search, title: t.features_4_title, desc: t.features_4_desc },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div
                    onMouseEnter={() => setHoveredFeature(i)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${cardBg}`}
                    style={{
                      borderColor: hoveredFeature === i ? NATURE_COLORS.primary : (isDark ? 'rgba(5, 150, 105, 0.2)' : NATURE_COLORS.bgLight),
                      transform: hoveredFeature === i ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: hoveredFeature === i ? '0 20px 40px -12px rgba(5, 150, 105, 0.2)' : 'none'
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300"
                         style={{ background: hoveredFeature === i ? NATURE_COLORS.primary : NATURE_COLORS.bgLight }}>
                      <Icon size={26} style={{ color: hoveredFeature === i ? 'white' : NATURE_COLORS.primary }} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className={`text-sm leading-relaxed ${textMuted}`}>{feature.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-5" style={{ background: isDark ? 'rgba(16, 185, 129, 0.03)' : NATURE_COLORS.bgLight }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <Zap size={32} className="inline-block mb-4" style={{ color: NATURE_COLORS.accent }} />
              <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
                {t.how_title}
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: t.how_1_step, title: t.how_1_title, desc: t.how_1_desc },
              { step: t.how_2_step, title: t.how_2_title, desc: t.how_2_desc },
              { step: t.how_3_step, title: t.how_3_title, desc: t.how_3_desc },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="relative">
                  <div className={`text-6xl font-bold mb-4 ${isDark ? 'text-slate-800' : 'text-slate-100'}`} style={{ fontFamily: 'Crimson Pro, serif' }}>
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5" style={{ background: NATURE_COLORS.slate[300] }} />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Quotes */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <Quote size={24} className="inline-block mb-3" style={{ color: NATURE_COLORS.primary }} />
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
                {t.quotes_title}
              </h2>
              <p className={`text-sm ${textMuted}`}>{t.quotes_sub}</p>
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <div className={`p-8 rounded-2xl border-2 shadow-lg mx-auto max-w-2xl transition-all duration-500 ${cardBg}`}
                 style={{ borderColor: NATURE_COLORS.bgLight }}>
              <div className="flex justify-center gap-2 mb-6">
                {quotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuoteIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === currentQuoteIndex ? 'w-8' : 'opacity-40 hover:opacity-60'
                    }`}
                    style={{ background: i === currentQuoteIndex ? NATURE_COLORS.primary : NATURE_COLORS.slate[400] }}
                  />
                ))}
              </div>

              <Quote size={36} className="mx-auto mb-4 opacity-40" style={{ color: NATURE_COLORS.accent }} />

              <p className="text-lg leading-relaxed text-center mb-6 italic" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: isDark ? '#E0F2FE' : NATURE_COLORS.text }}>
                "{quotes[currentQuoteIndex].quote}"
              </p>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-md font-medium" style={{ background: NATURE_COLORS.bgLight, color: NATURE_COLORS.text }}>
                  {quotes[currentQuoteIndex].source}
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <Lightbulb size={28} className="inline-block mb-4" style={{ color: NATURE_COLORS.primary }} />
              <h2 className="text-3xl font-bold" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
                {t.philosophy_title}
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: t.philosophy_1_title, desc: t.philosophy_1_desc, icon: CheckCircle2 },
              { title: t.philosophy_2_title, desc: t.philosophy_2_desc, icon: ShieldCheck },
              { title: t.philosophy_3_title, desc: t.philosophy_3_desc, icon: TrendingUp },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div className={`p-6 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg ${cardBg}`}
                       style={{ borderLeftColor: NATURE_COLORS.primary }}>
                    <Icon size={24} className="mb-4" style={{ color: NATURE_COLORS.primary }} />
                    <h3 className="font-semibold text-base mb-3">{item.title}</h3>
                    <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className={`p-12 rounded-3xl border-2 text-center relative overflow-hidden ${cardBg}`}
               style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : NATURE_COLORS.bgLight }}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: NATURE_COLORS.primary, transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5" style={{ background: NATURE_COLORS.accent, transform: 'translate(-30%, 30%)' }} />

            <div className="relative">
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
                {t.cta_section_title}
              </h2>
              <p className={`text-base mb-8 ${textMuted}`}>{t.cta_section_desc}</p>
              <button
                onClick={onEnter}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-medium text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
                style={{ background: NATURE_COLORS.primary }}
              >
                {t.cta_button} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-10 px-5 border-t ${borderClass}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: NATURE_COLORS.primary }}>
              <BrainCircuit size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold">{t.brand}</span>
          </div>
          <div className="flex flex-col md:items-end gap-1">
            <p className={`text-xs ${textMuted}`}>{t.footer_copy}</p>
            <p className={`text-xs ${textMuted} opacity-70`}>{t.footer_note}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
