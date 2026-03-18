import React, { useState, useEffect } from 'react';
import {
  ArrowRight, BrainCircuit, Search, BookOpen, Users, ShieldCheck,
  Quote, Lightbulb, ChevronRight, Target, BarChart3, ArrowLeft,
  Eye, X, Menu
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
fontLink.href = 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap';
if (!document.head.querySelector('[href*="Crimson+Pro"]')) document.head.appendChild(fontLink);

// Nature-inspired color palette
const NATURE_COLORS = {
  primary: '#059669',      // Deep emerald
  primaryDark: '#047857',  // Darker emerald for hover
  secondary: '#10B981',    // Emerald
  cta: '#0891B2',          // Ocean blue
  bgLight: '#ECFDF5',      // Mint cream
  text: '#064E3B',         // Forest green
  accent: '#FBBF24',       // Solar gold
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

// Academic quotes - prominent placement
const ACADEMIC_QUOTES = {
  'zh-CN': [
    { quote: '学生真实的想法与认知主体性应被强调。', source: 'Epistemic Agency', author: '学术研究' },
    { quote: '批判性信任——既对 AI 的可能性保持开放，也对其边界保持警惕。', source: 'Critical Trust', author: 'AI 交互研究' },
    { quote: '高质量监督提供的是安全的对话空间。', source: 'Dialogic Supervision', author: '导师督导' },
    { quote: '反思性的、审慎的、协作性的 AI 使用方式。', source: 'Responsible AI', author: '学术伦理' },
  ],
  'zh-TW': [
    { quote: '學生真實的想法與認知主體性應被強調。', source: 'Epistemic Agency', author: '學術研究' },
    { quote: '批判性信任——既對 AI 的可能性保持開放，也對其邊界保持警惕。', source: 'Critical Trust', author: 'AI 互動研究' },
    { quote: '高品質監督提供的是安全的對話空間。', source: 'Dialogic Supervision', author: '導師督導' },
    { quote: '反思性的、審慎的、協作性的 AI 使用方式。', source: 'Responsible AI', author: '學術倫理' },
  ],
  'en': [
    { quote: 'Students\' authentic ideas and epistemic agency are emphasized.', source: 'Epistemic Agency', author: 'Academic Research' },
    { quote: 'Critical trust—open to affordances, yet cautious about limits.', source: 'Critical Trust', author: 'AI Interaction Research' },
    { quote: 'Good supervision provides safe dialogic spaces.', source: 'Dialogic Supervision', author: 'Supervision Research' },
    { quote: 'Reflective, cautious, and collaborative AI use.', source: 'Responsible AI', author: 'Academic Ethics' },
  ],
};

const T = {
  'zh-CN': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '理念',
    nav_contact: '联系',
    locale: '简体',

    hero_eyebrow: '面向研究型高校的学术督导平台',
    hero_title: '让科研进展可见、可对话、可干预',
    hero_sub: '学生、AI 与导师三元协同的科研支持平台。苏格拉底式引导、证据增强检索、研究进展分析与导师介入，支持持续性的学术监督与思维发展。',
    cta_primary: '进入平台',
    cta_secondary: '了解更多',

    quotes_title: '研究基础',
    quotes_sub: '基于当代学术研究的设计理念',

    features_title: '核心功能',
    features_1_title: '三元互动模型',
    features_1_desc: '学生、AI 与导师协同工作，AI 通过苏格拉底式提问促进思考，导师实时监控并精准介入。',
    features_2_title: '证据增强检索',
    features_2_desc: '基于 Semantic Scholar 的学术文献检索，所有检索结果与证据来源对导师透明可见。',
    features_3_title: '研究过程追踪',
    features_3_desc: '完整记录研究进展、卡点识别与导师反馈，支持持续的学术监督。',

    philosophy_title: '设计理念',
    philosophy_1_title: 'AI 支持思考，不是替代思考',
    philosophy_1_desc: 'AI 通过追问假设、引发对比、推动反思帮助学生形成更严谨的思维，而非直接给出结论性答案。',
    philosophy_2_title: '导师保持可见，而非被替代',
    philosophy_2_desc: '平台增强督导关系质量，所有学生与 AI 的交互对导师默认可见，支持精准介入。',
    philosophy_3_title: '面向研究过程，而非论文代写',
    philosophy_3_desc: 'AI 专注于研究方法、理论框架与学术写作规范，不会为学生起草论文段落或生成结论。',

    cta_section_title: '让科研督导工作更加高效',
    cta_section_desc: '适用于研究生院、导师团队与学术研究机构',
    cta_demo: '预约演示',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '本平台为学术研究工具，不适用于 K-12 或职业培训场景',
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav_features: 'Features',
    nav_philosophy: 'Philosophy',
    nav_contact: 'Contact',
    locale: 'EN',

    hero_eyebrow: 'Academic supervision infrastructure for research institutions',
    hero_title: 'Make Research Progress Visible, Dialogic, and Actionable',
    hero_sub: 'A triadic collaboration platform for students, AI, and supervisors. Socratic guidance, evidence-enhanced retrieval, progress analysis, and supervisor intervention enable continuous academic supervision.',
    cta_primary: 'Enter Platform',
    cta_secondary: 'Learn More',

    quotes_title: 'Research Foundation',
    quotes_sub: 'Design principles based on contemporary academic research',

    features_title: 'Core Features',
    features_1_title: 'Triadic Interaction Model',
    features_1_desc: 'Students, AI, and supervisors work together. AI promotes thinking through Socratic questioning; supervisors monitor and intervene precisely.',
    features_2_title: 'Evidence-Enhanced Retrieval',
    features_2_desc: 'Academic search powered by Semantic Scholar. All results and evidence sources are transparently visible to supervisors.',
    features_3_title: 'Research Process Tracking',
    features_3_desc: 'Track research progress, identify bottlenecks, and document supervisor feedback for continuous academic supervision.',

    philosophy_title: 'Design Philosophy',
    philosophy_1_title: 'AI supports thinking, it does not replace it',
    philosophy_1_desc: 'AI surfaces assumptions, prompts comparison, and pushes reflection to develop rigorous reasoning—not providing conclusive answers.',
    philosophy_2_title: 'Supervisors remain visible, not replaced',
    philosophy_2_desc: 'The platform enhances supervisory relationships. All student–AI interactions are transparently visible to supervisors by default.',
    philosophy_3_title: 'Process-oriented, not writing assistance',
    philosophy_3_desc: 'AI focuses on research methodology, theoretical frameworks, and academic writing standards—never drafting thesis paragraphs or generating conclusions.',

    cta_section_title: 'Bring Continuous Visibility to Research Supervision',
    cta_section_desc: 'Built for graduate schools, supervisory teams, and academic research units',
    cta_demo: 'Book a Demo',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: 'Designed for academic research supervision. Not intended for K–12 or vocational training contexts.',
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '理念',
    nav_contact: '聯絡',
    locale: '繁體',

    hero_eyebrow: '面向研究型高校的學術督導平台',
    hero_title: '讓科研進展可見、可對話、可幹預',
    hero_sub: '學生、AI 與導師三元協同的科研支持平台。蘇格拉底式引導、證據增強檢索、研究進展分析與導師介入，支持持續性的學術監督與思維發展。',
    cta_primary: '進入平台',
    cta_secondary: '了解更多',

    quotes_title: '研究基礎',
    quotes_sub: '基於當代學術研究的設計理念',

    features_title: '核心功能',
    features_1_title: '三元互動模型',
    features_1_desc: '學生、AI 與導師協同工作，AI 通過蘇格拉底式提問促進思考，導師實時監控並精準介入。',
    features_2_title: '證據增強檢索',
    features_2_desc: '基於 Semantic Scholar 的學術文獻檢索，所有檢索結果與證據來源對導師透明可見。',
    features_3_title: '研究過程追蹤',
    features_3_desc: '完整記錄研究進展、卡點識別與導師反饋，支持持續的學術監督。',

    philosophy_title: '設計理念',
    philosophy_1_title: 'AI 支持思考，不是替代思考',
    philosophy_1_desc: 'AI 通過追問假設、引發對比、推動反思幫助學生形成更嚴謹的思維，而非直接給出結論性答案。',
    philosophy_2_title: '導師保持可見，而非被替代',
    philosophy_2_desc: '平台增強督導關係質量，所有學生與 AI 的交互對導師默認可見，支持精準介入。',
    philosophy_3_title: '面向研究過程，而非論文代寫',
    philosophy_3_desc: 'AI 專注於研究方法、理論框架與學術寫作規範，不會為學生起草論文段落或生成結論。',

    cta_section_title: '讓科研督導工作更加高效',
    cta_section_desc: '適用於研究生院、導師團隊與學術研究機構',
    cta_demo: '預約演示',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '本平台為學術研究工具，不適用於 K-12 或職業培訓場景',
  },
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, locale: localeProp, setLocale, theme, setTheme }) => {
  const t = T[localeProp] as typeof T['en'];
  const isDark = theme === 'dark';
  const isEN = localeProp === 'en';
  const [scrolled, setScrolled] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const quotes = ACADEMIC_QUOTES[localeProp];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('preferred-locale', newLocale);
  };

  // Style helpers with proper contrast
  const bg = isDark ? 'bg-[#0B1416]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-emerald-900/30' : 'border-slate-200';
  const cardBg = isDark ? 'bg-[#0F2937]' : 'bg-white';
  const glassBg = isDark ? 'bg-[#0B1416]/80 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md';

  return (
    <div className={`min-h-screen font-sans ${bg} ${textPrimary}`} style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
      {/* Nature gradient background - subtle */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.08] bg-emerald-500" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full blur-[120px] opacity-[0.06] bg-teal-500" />
        <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full blur-[100px] opacity-[0.04] bg-amber-400" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? `border-b ${borderClass} shadow-sm ${glassBg}` : ''}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm" style={{ background: NATURE_COLORS.primary }}>
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span className="font-semibold text-base">{t.brand}</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {t.nav_features}
            </a>
            <a href="#philosophy" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {t.nav_philosophy}
            </a>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
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
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: NATURE_COLORS.primary }}
              onMouseEnter={(e) => e.currentTarget.style.background = NATURE_COLORS.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.background = NATURE_COLORS.primary}
            >
              {t.cta_primary} <ArrowRight size={16} />
            </button>

            {/* Mobile menu button */}
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
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1416] py-4 px-5">
            <div className="flex flex-col gap-3 mb-4">
              <a href="#features" className="text-sm font-medium py-2 text-slate-600 dark:text-slate-400" onClick={() => setMobileMenuOpen(false)}>
                {t.nav_features}
              </a>
              <a href="#philosophy" className="text-sm font-medium py-2 text-slate-600 dark:text-slate-400" onClick={() => setMobileMenuOpen(false)}>
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

      {/* Hero Section - Compact */}
      <section className="relative pt-28 pb-16 px-5 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide mb-5 border"
                 style={{ background: NATURE_COLORS.bgLight, borderColor: NATURE_COLORS.secondary, color: NATURE_COLORS.text }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: NATURE_COLORS.primary }} />
              {t.hero_eyebrow}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
              {t.hero_title}
            </h1>
            <p className={`text-base leading-relaxed mb-7 max-w-lg ${textMuted}`}>
              {t.hero_sub}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onEnter}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: NATURE_COLORS.primary }}
                onMouseEnter={(e) => e.currentTarget.style.background = NATURE_COLORS.primaryDark}
                onMouseLeave={(e) => e.currentTarget.style.background = NATURE_COLORS.primary}
              >
                {t.cta_primary} <ArrowRight size={16} />
              </button>
              <button
                onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium border-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                style={{ borderColor: isDark ? NATURE_COLORS.slate[700] : NATURE_COLORS.slate[200], color: isDark ? NATURE_COLORS.slate[300] : NATURE_COLORS.slate[700] }}
              >
                {t.cta_secondary} <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative hidden lg:flex justify-center">
            <div className="absolute inset-0 rounded-2xl opacity-20 blur-3xl" style={{ background: NATURE_COLORS.secondary }} />
            <div className="relative">
              <img
                src="/images/hero_bg.png"
                alt="Research supervision illustration"
                className="w-full max-w-md rounded-xl shadow-xl"
              />
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3"
                   style={{ background: isDark ? NATURE_COLORS.slate[800] : 'white' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: NATURE_COLORS.bgLight }}>
                  <ShieldCheck size={18} style={{ color: NATURE_COLORS.primary }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{isEN ? 'Trusted by' : '受信赖于'}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{isEN ? 'Research Institutions' : '科研机构'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Quotes - Prominent */}
      <section className="py-14 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Quote size={22} className="inline-block mb-2" style={{ color: NATURE_COLORS.primary }} />
            <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
              {t.quotes_title}
            </h2>
            <p className={`text-sm ${textMuted}`}>{t.quotes_sub}</p>
          </div>

          <div className="relative">
            {/* Quote Card */}
            <div className={`p-8 rounded-2xl border-2 shadow-sm mx-auto max-w-2xl transition-all duration-300 ${cardBg}`}
                 style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : NATURE_COLORS.bgLight }}>
              <div className="flex justify-center gap-2 mb-5">
                {quotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuoteIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      i === currentQuoteIndex ? 'scale-150' : 'opacity-40 hover:opacity-60'
                    }`}
                    style={{ background: i === currentQuoteIndex ? NATURE_COLORS.primary : NATURE_COLORS.slate[400] }}
                  />
                ))}
              </div>

              <Quote size={32} className="mx-auto mb-4 opacity-60" style={{ color: NATURE_COLORS.accent }} />

              <p className="text-lg leading-relaxed text-center mb-5 italic" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: isDark ? '#E0F2FE' : NATURE_COLORS.text }}>
                "{quotes[currentQuoteIndex].quote}"
              </p>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-md font-medium" style={{ background: NATURE_COLORS.bgLight, color: NATURE_COLORS.text }}>
                  {quotes[currentQuoteIndex].source}
                </span>
                <span className={textMuted}>— {quotes[currentQuoteIndex].author}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features - Compact */}
      <section id="features" className="py-14 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
            {t.features_title}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: t.features_1_title, desc: t.features_1_desc },
              { icon: Search, title: t.features_2_title, desc: t.features_2_desc },
              { icon: BarChart3, title: t.features_3_title, desc: t.features_3_desc },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className={`p-6 rounded-xl border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-1 ${cardBg}`}
                   style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.2)' : NATURE_COLORS.bgLight }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: NATURE_COLORS.bgLight }}>
                    <Icon size={24} style={{ color: NATURE_COLORS.primary }} />
                  </div>
                  <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Collaboration Image */}
      <section className="py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-lg relative">
            <img
              src="/images/collaboration.png"
              alt="Supervisor and students collaboration"
              className="w-full object-cover"
              style={{ maxHeight: '340px', objectPosition: 'center 20%' }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-sm font-medium text-white">
                {isEN ? 'Real-time research visibility: what supervisors currently lack' : '研究过程的实时可见性——这正是导师目前缺少的'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Design Philosophy - Compact */}
      <section id="philosophy" className="py-14 px-5 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Lightbulb size={26} className="inline-block mb-3" style={{ color: NATURE_COLORS.primary }} />
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
              {t.philosophy_title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: t.philosophy_1_title, desc: t.philosophy_1_desc },
              { title: t.philosophy_2_title, desc: t.philosophy_2_desc },
              { title: t.philosophy_3_title, desc: t.philosophy_3_desc },
            ].map((item, i) => (
              <div key={i} className={`p-6 rounded-xl border-l-4 shadow-sm transition-all duration-200 hover:shadow-md ${cardBg}`}
                   style={{ borderLeftColor: NATURE_COLORS.primary }}>
                <h3 className="font-semibold text-base mb-3">{item.title}</h3>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Compact */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto text-center p-10 rounded-2xl border-2 shadow-lg"
             style={{ background: cardBg, borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : NATURE_COLORS.bgLight }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: NATURE_COLORS.primary }}>
            {t.cta_section_title}
          </h2>
          <p className={`text-base mb-8 ${textMuted}`}>{t.cta_section_desc}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: NATURE_COLORS.primary }}
              onMouseEnter={(e) => e.currentTarget.style.background = NATURE_COLORS.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.background = NATURE_COLORS.primary}
            >
              {t.cta_primary} <ArrowRight size={16} />
            </button>
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium border-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: isDark ? NATURE_COLORS.slate[700] : NATURE_COLORS.slate[200], color: isDark ? NATURE_COLORS.slate[300] : NATURE_COLORS.slate[700] }}
            >
              {t.cta_demo}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-5 border-t ${borderClass}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: NATURE_COLORS.primary }}>
              <BrainCircuit size={14} className="text-white" />
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
