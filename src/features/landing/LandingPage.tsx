import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, BrainCircuit, Search, BookOpen, Users, ShieldCheck,
  Quote, Lightbulb, ChevronRight, BarChart3, X, Menu, MessageSquare,
  Zap, CheckCircle2, GraduationCap, FileText, Play, Sparkles,
  Eye, Network
} from 'lucide-react';
import { Locale, Theme } from '@/types';

interface LandingPageProps {
  onEnter: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
};

// Google Fonts import
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Atkinson+Hyperlegible:wght@400;700&family=Inter:wght@400;500;600;700&display=swap';
if (!document.head.querySelector('[href*="Crimson+Pro"]')) document.head.appendChild(fontLink);

// Color palette
const COLORS = {
  primary: '#059669',
  primaryLight: '#10B981',
  primaryDark: '#047857',
  secondary: '#0EA5E9',
  accent: '#F59E0B',

  bgLight: '#F0FDFA',
  bgSubtle: '#F8FAFC',

  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
  },

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

// Academic quotes
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
    locale: '简体',

    hero_badge: '学术科研支持平台',
    hero_title: 'AI 辅助科研督导平台',
    hero_subtitle: '连接学生、AI 与导师，让研究过程更透明、更高效',
    hero_desc: '苏格拉底式对话引导 · 文献证据追溯 · 进展可视化分析 · 导师精准介入',

    cta_primary: '开始使用',
    cta_secondary: '了解更多',

    features_title: '核心功能',
    features_subtitle: '为学术科研设计的工作流程',

    features_1_title: 'AI 苏格拉底式对话',
    features_1_desc: 'AI 通过提问引导学生独立思考，而非直接给出答案。培养批判性思维，记录思维发展轨迹。',

    features_2_title: '全程可追溯',
    features_2_desc: '每一次对话、每一篇文献、每一次导师反馈，都完整记录，形成研究过程档案。',

    features_3_title: '导师实时洞察',
    features_3_desc: '导师随时查看学生研究进展，在关键节点提供指导。AI 辅助识别卡点与瓶颈。',

    features_4_title: '证据增强检索',
    features_4_desc: '接入 Semantic Scholar，检索结果与 AI 对话联动，保证学术严谨性。',

    features_5_title: '研究进展可视化',
    features_5_desc: '自动生成研究进展时间线，可视化展示从选题到完成的全过程。',

    features_6_title: '多导师协作',
    features_6_desc: '支持导师团队共同指导学生，分配不同阶段的督导责任。',

    how_title: '工作流程',
    how_subtitle: '简单三步，开启高效科研',

    how_1_step: '01',
    how_1_title: '建立督导关系',
    how_1_desc: '学生注册后加入导师班级，建立正式的学术督导关系',

    how_2_step: '02',
    how_2_title: '开始 AI 对话',
    how_2_desc: '学生与 AI 进行苏格拉底式对话，梳理研究思路与方法',

    how_3_step: '03',
    how_3_title: '导师介入指导',
    how_3_desc: '导师查看对话记录和进展，提供针对性的学术指导',

    quotes_title: '设计理念',
    quotes_sub: '基于当代学术研究',

    philosophy_title: '核心原则',
    philosophy_1_title: 'AI 是辅助工具',
    philosophy_1_desc: 'AI 启发思考，而非提供捷径。真正的学术成长来自于独立思考的过程。',

    philosophy_2_title: '过程透明可见',
    philosophy_2_desc: '所有交互对导师可见，更好地理解学生需求，提供精准帮助。',

    philosophy_3_title: '面向研究过程',
    philosophy_3_desc: '关注研究方法和思维训练，而非论文产出速度。',

    cta_section_title: '开始使用 HAKHub',
    cta_section_desc: '专为学术科研设计，助力研究生培养',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '为学术研究而生',
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav_features: 'Features',
    nav_philosophy: 'Philosophy',
    locale: 'EN',

    hero_badge: 'Academic Research Platform',
    hero_title: 'AI-Assisted Research Supervision',
    hero_subtitle: 'Connecting students, AI, and supervisors for transparent research',
    hero_desc: 'Socratic dialogue · Evidence retrieval · Progress analytics · Timely intervention',

    cta_primary: 'Get Started',
    cta_secondary: 'Learn More',

    features_title: 'Core Features',
    features_subtitle: 'Designed for academic research workflows',

    features_1_title: 'AI Socratic Dialogue',
    features_1_desc: 'AI guides through questioning, not answers. Cultivates critical thinking and records thinking progression.',

    features_2_title: 'Full Traceability',
    features_2_desc: 'Every conversation, paper, and feedback is recorded, creating a complete research journey archive.',

    features_3_title: 'Real-time Insights',
    features_3_desc: 'Supervisors monitor progress anytime, providing guidance at key moments. AI helps identify bottlenecks.',

    features_4_title: 'Evidence-Enhanced Search',
    features_4_desc: 'Integrated with Semantic Scholar, connecting search results with AI dialogue for academic rigor.',

    features_5_title: 'Progress Visualization',
    features_5_desc: 'Auto-generate research timeline showing the complete journey from topic to completion.',

    features_6_title: 'Team Collaboration',
    features_6_desc: 'Support supervisor teams with distributed oversight responsibilities.',

    how_title: 'Workflow',
    how_subtitle: 'Three simple steps',

    how_1_step: '01',
    how_1_title: 'Establish Supervision',
    how_1_desc: 'Students register and join supervisor class to establish formal supervision relationship',

    how_2_step: '02',
    how_2_title: 'Start AI Dialogue',
    how_2_desc: 'Students engage in Socratic dialogue with AI to clarify research thinking',

    how_3_step: '03',
    how_3_title: 'Supervisor Guidance',
    how_3_desc: 'Supervisors review conversation history and provide targeted academic guidance',

    quotes_title: 'Design Philosophy',
    quotes_sub: 'Based on contemporary academic research',

    philosophy_title: 'Core Principles',
    philosophy_1_title: 'AI as a Tool',
    philosophy_1_desc: 'AI inspires thinking, not shortcuts. True academic growth comes from independent reasoning.',

    philosophy_2_title: 'Transparent Process',
    philosophy_2_desc: 'All interactions visible to supervisors for better understanding and targeted help.',

    philosophy_3_title: 'Process-Oriented',
    philosophy_3_desc: 'Focus on research methodology and thinking training, not output speed.',

    cta_section_title: 'Start Using HAKHub',
    cta_section_desc: 'Designed for academic research, supporting graduate education',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: 'Built for academic research',
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '理念',
    locale: '繁體',

    hero_badge: '學術科研支持平台',
    hero_title: 'AI 輔助科研督導平台',
    hero_subtitle: '連接學生、AI 與導師，讓研究過程更透明、更高效',
    hero_desc: '蘇格拉底式對話引導 · 文獻證據追溯 · 進展可視化分析 · 導師精準介入',

    cta_primary: '開始使用',
    cta_secondary: '了解更多',

    features_title: '核心功能',
    features_subtitle: '為學術科研設計的工作流程',

    features_1_title: 'AI 蘇格拉底式對話',
    features_1_desc: 'AI 通過提問引導學生獨立思考，而非直接給出答案。培養批判性思維，記錄思維發展軌跡。',

    features_2_title: '全程可追溯',
    features_2_desc: '每一次對話、每一篇文獻、每一次導師反饋，都完整記錄，形成研究過程檔案。',

    features_3_title: '導師實時洞察',
    features_3_desc: '導師隨時查看學生研究進展，在關鍵節點提供指導。AI 輔助識別卡點與瓶頸。',

    features_4_title: '證據增強檢索',
    features_4_desc: '接入 Semantic Scholar，檢索結果與 AI 對話聯動，保證學術嚴謹性。',

    features_5_title: '研究進展可視化',
    features_5_desc: '自動生成研究進展時間線，可視化展示從選題到完成的過程。',

    features_6_title: '多導師協作',
    features_6_desc: '支持導師團隊共同指導學生，分配不同階段的督導責任。',

    how_title: '工作流程',
    how_subtitle: '簡單三步，開啟高效科研',

    how_1_step: '01',
    how_1_title: '建立督導關係',
    how_1_desc: '學生註冊後加入導師班級，建立正式的學術督導關係',

    how_2_step: '02',
    how_2_title: '開始 AI 對話',
    how_2_desc: '學生與 AI 進行蘇格拉底式對話，梳理研究思路與方法',

    how_3_step: '03',
    how_3_title: '導師介入指導',
    how_3_desc: '導師查看對話記錄和進展，提供針對性的學術指導',

    quotes_title: '設計理念',
    quotes_sub: '基於當代學術研究',

    philosophy_title: '核心原則',
    philosophy_1_title: 'AI 是輔助工具',
    philosophy_1_desc: 'AI 啟發思考，而非提供捷徑。真正的學術成長來自於獨立思考的過程。',

    philosophy_2_title: '過程透明可見',
    philosophy_2_desc: '所有交互對導師可見，更好地理解學生需求，提供精準幫助。',

    philosophy_3_title: '面向研究過程',
    philosophy_3_desc: '關注研究方法和思維訓練，而非論文產出速度。',

    cta_section_title: '開始使用 HAKHub',
    cta_section_desc: '專為學術科研設計，助力研究生培養',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '為學術研究而生',
  },
};

// Fade-in animation component
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string; direction?: 'up' | 'left' | 'right' }> =
  ({ children, delay = 0, className = '', direction = 'up' }) => {
    const [visible, setVisible] = useState(false);
    const transformClass = direction === 'left' ? 'translate-x-4' : direction === 'right' ? '-translate-x-4' : 'translate-y-4';

    useEffect(() => {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }, [delay]);

    return (
      <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${transformClass}`} ${className}`}>
        {children}
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
  const [visibleSection, setVisibleSection] = useState<string>('');
  const quotes = ACADEMIC_QUOTES[localeProp];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = ['hero', 'features', 'how', 'quotes', 'philosophy'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.75) {
            setVisibleSection(section);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  const textMuted = isDark ? 'text-slate-400' : COLORS.text.secondary;
  const borderClass = isDark ? 'border-emerald-900/30' : 'border-slate-200';
  const cardBg = isDark ? 'bg-[#0F2937]' : 'bg-white';

  return (
    <div className={`min-h-screen font-sans ${bg} ${textPrimary}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-blue-500/5 to-cyan-500/5 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? `border-b ${borderClass} shadow-sm ${isDark ? 'bg-[#0B1416]/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'}` : ''}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
                 style={{ background: COLORS.primary }}>
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span className="font-semibold text-base">{t.brand}</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'features', label: t.nav_features },
              { id: 'how', label: t.nav_philosophy },
            ].map(link => (
              <a key={link.id} href={`#${link.id}`}
                 className={`text-sm font-medium transition-colors relative group ${visibleSection === link.id ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`}>
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 transition-all group-hover:w-full" />
              </a>
            ))}
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
              style={{ background: COLORS.primary }}
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
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1416] py-4 px-5 animate-in slide-in-from-top duration-300">
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
              style={{ background: COLORS.primary }}
            >
              {t.cta_primary}
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-16 px-5 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeIn delay={100}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
                   style={{ background: COLORS.bgLight, borderColor: COLORS.primaryLight, color: COLORS.text.primary }}>
                <Sparkles size={14} />
                {t.hero_badge}
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                  style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.hero_title}
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">
                {t.hero_subtitle}
              </p>
            </FadeIn>

            <FadeIn delay={400}>
              <div className="flex flex-wrap gap-2 mb-8">
                {t.hero_desc.split('·').map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: isDark ? 'rgba(16, 185, 129, 0.1)' : COLORS.bgLight, color: COLORS.primary }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {item.trim()}
                  </span>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={500}>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onEnter}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
                  style={{ background: COLORS.primary }}
                >
                  {t.cta_primary} <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium border-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95"
                  style={{ borderColor: isDark ? COLORS.slate[700] : COLORS.slate[200], color: isDark ? COLORS.slate[300] : COLORS.slate[700] }}
                >
                  {t.cta_secondary} <ChevronRight size={16} />
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Hero Image */}
          <FadeIn delay={300} direction="right">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/images/hero_bg.png"
                  alt="Research platform"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Floating SVG Badge */}
              <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl shadow-xl backdrop-blur-sm"
                   style={{ background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}>
                <img src="/SVG/人工智能 2.svg" alt="AI" className="w-16 h-16" />
                <p className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-400">
                  {isEN ? 'AI-Powered' : 'AI 驱动'}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4`} style={{ background: COLORS.bgLight, color: COLORS.primary }}>
                FEATURES
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.features_title}
              </h2>
              <p className={`text-base max-w-2xl mx-auto ${textMuted}`}>{t.features_subtitle}</p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: t.features_1_title, desc: t.features_1_desc, svg: '/SVG/人工智能 1.svg' },
              { icon: FileText, title: t.features_2_title, desc: t.features_2_desc, svg: '/SVG/学生档案.svg' },
              { icon: Eye, title: t.features_3_title, desc: t.features_3_desc, svg: '/SVG/教师工作台.svg' },
              { icon: Search, title: t.features_4_title, desc: t.features_4_desc, svg: '/SVG/资源协作.svg' },
              { icon: BarChart3, title: t.features_5_title, desc: t.features_5_desc, svg: '/SVG/流转,协作,循环,环形,协同.svg' },
              { icon: Users, title: t.features_6_title, desc: t.features_6_desc, svg: '/SVG/团队.svg' },
            ].map((feature, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${cardBg}`}
                  style={{
                    borderColor: hoveredFeature === i ? COLORS.primary : (isDark ? 'rgba(5, 150, 105, 0.15)' : COLORS.slate[200]),
                    transform: hoveredFeature === i ? 'translateY(-4px)' : 'translateY(0)',
                    boxShadow: hoveredFeature === i ? '0 20px 40px -12px rgba(5, 150, 105, 0.2)' : 'none'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                         style={{ background: hoveredFeature === i ? COLORS.primary : COLORS.bgLight }}>
                      <img src={feature.svg} alt={feature.title} className="w-10 h-10" style={{ filter: hoveredFeature === i ? 'brightness(0) invert(1)' : 'none' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                      <p className={`text-sm leading-relaxed ${textMuted}`}>{feature.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration Image Section */}
      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="relative rounded-3xl overflow-hidden shadow-xl group">
              <img
                src="/images/collaboration.png"
                alt="Supervisor and students collaboration"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ maxHeight: '400px', objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <img src="/SVG/协作性.svg" alt="Collaboration" className="w-10 h-10" />
                    <p className="text-white/90 text-sm font-medium">{isEN ? 'Connected Research Ecosystem' : '互联的研究生态'}</p>
                  </div>
                  <p className="text-white text-lg font-semibold">
                    {isEN ? 'Student-AI-Supervisor triadic collaboration' : '学生-AI-导师三元协同'}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-5" style={{ background: isDark ? 'rgba(16, 185, 129, 0.03)' : COLORS.bgLight }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <img src="/SVG/流转,协作,循环,环形,协同.svg" alt="Workflow" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.how_title}
              </h2>
              <p className={`text-base ${textMuted}`}>{t.how_subtitle}</p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-20 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-30" />

            {[
              { step: t.how_1_step, title: t.how_1_title, desc: t.how_1_desc, svg: '/SVG/学生管理-01.svg' },
              { step: t.how_2_step, title: t.how_2_title, desc: t.how_2_desc, svg: '/SVG/人工智能 2.svg' },
              { step: t.how_3_step, title: t.how_3_title, desc: t.how_3_desc, svg: '/SVG/教师反馈.svg' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="relative text-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md bg-white dark:bg-slate-800">
                    <img src={item.svg} alt={item.title} className="w-12 h-12" />
                  </div>
                  <div className={`text-5xl font-bold mb-4 ${isDark ? 'text-slate-800' : 'text-slate-100'}`}
                       style={{ fontFamily: 'Crimson Pro, serif' }}>
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Quotes */}
      <section id="quotes" className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <Quote size={28} className="inline-block mb-4" style={{ color: COLORS.primary }} />
              <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.quotes_title}
              </h2>
              <p className={`text-sm ${textMuted}`}>{t.quotes_sub}</p>
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <div className={`p-8 md:p-10 rounded-3xl border-2 shadow-lg mx-auto max-w-3xl transition-all duration-500 ${cardBg}`}
                 style={{ borderColor: COLORS.bgLight }}>
              <div className="flex justify-center gap-2 mb-8">
                {quotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuoteIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentQuoteIndex ? 'w-10' : 'w-2 opacity-40 hover:opacity-60'
                    }`}
                    style={{ background: i === currentQuoteIndex ? COLORS.primary : COLORS.slate[400] }}
                  />
                ))}
              </div>

              <Quote size={40} className="mx-auto mb-6 opacity-30" style={{ color: COLORS.accent }} />

              <p className="text-lg md:text-xl leading-relaxed text-center mb-8 italic" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: isDark ? '#E0F2FE' : COLORS.text.primary }}>
                "{quotes[currentQuoteIndex].quote}"
              </p>

              <div className="flex items-center justify-center gap-3">
                <span className="px-4 py-2 rounded-lg font-medium text-sm" style={{ background: COLORS.bgLight, color: COLORS.text.primary }}>
                  {quotes[currentQuoteIndex].source}
                </span>
                <span className={`text-sm ${textMuted}`}>— {quotes[currentQuoteIndex].author}</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Philosophy */}
      <section id="philosophy" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <Lightbulb size={32} className="inline-block mb-4" style={{ color: COLORS.accent }} />
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.philosophy_title}
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: t.philosophy_1_title, desc: t.philosophy_1_desc, svg: '/SVG/人工智能 1.svg' },
              { title: t.philosophy_2_title, desc: t.philosophy_2_desc, svg: '/SVG/增加学生-01.svg' },
              { title: t.philosophy_3_title, desc: t.philosophy_3_desc, svg: '/SVG/Student2.svg' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className={`p-8 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${cardBg}`}
                     style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.2)' : COLORS.bgLight }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: COLORS.bgLight }}>
                    <img src={item.svg} alt={item.title} className="w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-lg mb-4">{item.title}</h3>
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className={`p-12 md:p-16 rounded-3xl border-2 text-center relative overflow-hidden ${cardBg}`}
               style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : COLORS.bgLight }}>
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg" style={{ background: COLORS.primary }}>
                <BrainCircuit size={40} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.cta_section_title}
              </h2>
              <p className={`text-base mb-8 max-w-xl mx-auto ${textMuted}`}>{t.cta_section_desc}</p>
              <button
                onClick={onEnter}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
                style={{ background: COLORS.primary }}
              >
                {t.cta_primary} <ArrowRight size={22} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-5 border-t ${borderClass}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: COLORS.primary }}>
                <BrainCircuit size={20} className="text-white" />
              </div>
              <span className="font-semibold text-lg">{t.brand}</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className={`text-sm ${textMuted}`}>{t.footer_copy}</p>
            <p className={`text-xs ${textMuted} opacity-70`}>{t.footer_note}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
