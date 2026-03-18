import React, { useState, useEffect } from 'react';
import {
  ArrowRight, BrainCircuit, Search, ShieldCheck,
  Quote, Lightbulb, ChevronRight, BarChart3, X, Menu, MessageSquare,
  CheckCircle2, FileText, Sparkles, Eye, Users, Network, GraduationCap
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
  text: { primary: '#0F172A', secondary: '#475569', muted: '#64748B' },
  slate: {
    50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
    400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155',
    800: '#1E293B', 900: '#0F172A',
  }
};

// Academic quotes - based on V2 document
const ACADEMIC_QUOTES = {
  'zh-CN': [
    { quote: 'AI 的角色是促进思考，而非替代思考。', source: '苏格拉底式教学法', author: 'Paul & Elder, 2006' },
    { quote: '有效的学术成长依赖于监控、反馈与调整的不间断运行。', source: '持续反馈循环', author: 'Zimmerman, 2000' },
    { quote: '导师必须保持在环可见与可干预。', source: '人在环治理', author: 'Mosqueira-Rey et al., 2023' },
    { quote: '让研究过程更加透明，让学术支持更加连续，让思维发展更加可见。', source: '平台愿景', author: 'HAKHub' },
  ],
  'zh-TW': [
    { quote: 'AI 的角色是促進思考，而非替代思考。', source: '蘇格拉底式教學法', author: 'Paul & Elder, 2006' },
    { quote: '有效的學術成長依賴於監控、反饋與調整的不間斷運行。', source: '持續反饋循環', author: 'Zimmerman, 2000' },
    { quote: '導師必須保持在環可見與可干預。', source: '人在環治理', author: 'Mosqueira-Rey et al., 2023' },
    { quote: '讓研究過程更加透明，讓學術支持更加連續，讓思維發展更加可見。', source: '平台願景', author: 'HAKHub' },
  ],
  'en': [
    { quote: 'AI should promote thinking, not replace it.', source: 'Socratic Method', author: 'Paul & Elder, 2006' },
    { quote: 'Effective academic growth depends on uninterrupted cycles of monitoring, feedback, and adjustment.', source: 'Continuous Feedback Loop', author: 'Zimmerman, 2000' },
    { quote: 'Supervisors must remain visible and intervenable.', source: 'Human-in-the-Loop', author: 'Mosqueira-Rey et al., 2023' },
    { quote: 'Make research processes more transparent, academic support more continuous, and thinking development more visible.', source: 'Platform Vision', author: 'HAKHub' },
  ],
};

const T = {
  'zh-CN': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '设计理念',
    locale: '简体',

    hero_badge: '面向学生—AI—导师三元互动',
    hero_title: '科研支持与监督平台',
    hero_subtitle: '让科研进展可见、可追踪、可干预',
    hero_desc: '使 AI 成为激发深度思考的工具，而非绕过思考的捷径',

    cta_primary: '开始使用',
    cta_secondary: '了解理念',

    mission: '我们并非试图用 AI 替代导师，也并非鼓励学生把思考外包给模型。',

    features_title: '围绕研究过程组织功能',
    features_subtitle: '基于自我调节学习理论的设计',

    features_1_title: '研究项目中心化',
    features_1_desc: '所有对话、文献、任务与导师反馈都归属于研究项目，而非散落在独立会话中。支持从选题到完成的全过程追踪。',

    features_2_title: '进展与障碍并重',
    features_2_desc: '不仅记录完成了什么，也显式记录尚未解决的困惑、方法难点、理论分歧与写作瓶颈。',

    features_3_title: '导师及时介入',
    features_3_desc: '导师能够识别谁长期停滞、谁问题失焦、谁过度依赖 AI，在更合适的时机精准介入。',

    features_4_title: '证据增强检索',
    features_4_desc: '接入 Semantic Scholar 等学术搜索，AI 回应附带可追溯的文献来源，减少模型幻觉风险。',

    features_5_title: '苏格拉底式引导',
    features_5_desc: 'AI 通过追问与澄清帮助学生识别问题边界、显化隐含假设、比较不同研究路径，而非直接给出答案。',

    features_6_title: '三元协同治理',
    features_6_desc: '学生、AI 与导师在同一系统中协同，导师保持最终判断权，AI 以证据为基础提供学术支持。',

    how_title: '三元互动机制',
    how_1_title: '学生端',
    how_1_desc: '围绕研究主题、文献综述、方法设计、数据分析等环节持续对话，发展认知主体性与研究判断力。',
    how_2_title: 'AI 端',
    how_2_desc: '苏格拉底式引导 + 证据增强检索 + 可治理的学术支持，不替代导师的最终裁量权。',
    how_3_title: '导师端',
    how_3_desc: '从"事后查看"转向"及时介入"，通过结构化面板识别需要帮助的学生，精准投入指导时间。',

    quotes_title: '核心理念',
    quotes_sub: '基于学习科学与人—AI协同研究',

    philosophy_title: '四项核心原则',
    philosophy_1_title: '科研支持应是持续性的',
    philosophy_1_desc: '并非仅发生在汇报时刻，而是嵌入整个研究过程的连续性支持，呼应自我调节学习理论。',

    philosophy_2_title: 'AI 促进而非替代思考',
    philosophy_2_desc: '通过追问、澄清、比较与反思引导学生形成更高质量的学术判断，而非提供捷径。',

    philosophy_3_title: '导师保持在环可见',
    philosophy_3_desc: '导师不是被绕开的对象，而是被重新嵌入到可见、可追踪、可及时介入的指导流程中。',

    philosophy_4_title: '证据与治理并重',
    philosophy_4_desc: '强调文献依据、边界与责任，符合循证实践原则与 AI 伦理要求。',

    cta_section_title: '加入 HAKHub',
    cta_section_desc: '重新设计科研指导的关系结构',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '让研究过程可见、可追踪、可干预',
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav_features: 'Features',
    nav_philosophy: 'Philosophy',
    locale: 'EN',

    hero_badge: 'Student—AI—Supervisor Triadic Interaction',
    hero_title: 'Research Support & Supervision Platform',
    hero_subtitle: 'Making research progress visible, trackable, and intervenable',
    hero_desc: 'AI as a tool for激发深度思考, not a shortcut to bypass thinking',

    cta_primary: 'Get Started',
    cta_secondary: 'Our Philosophy',

    mission: 'We do not seek to replace supervisors with AI, nor encourage students to outsource their thinking to models.',

    features_title: 'Organized Around Research Process',
    features_subtitle: 'Based on Self-Regulated Learning Theory',

    features_1_title: 'Research Project Centered',
    features_1_desc: 'All conversations, literature, tasks, and feedback belong to research projects, not scattered across isolated chats. Track from topic to completion.',

    features_2_title: 'Progress & Obstacles',
    features_2_desc: 'Explicitly record unresolved questions, methodological difficulties, theoretical disagreements, and writing bottlenecks.',

    features_3_title: 'Timely Supervisor Intervention',
    features_3_desc: 'Identify who is stalled, who has lost focus, who over-relies on AI, and intervene at the right moment.',

    features_4_title: 'Evidence-Enhanced Search',
    features_4_desc: 'Integrated with Semantic Scholar, AI responses include traceable literature sources to reduce hallucination risks.',

    features_5_title: 'Socratic Guidance',
    features_5_desc: 'AI helps identify problem boundaries, surface assumptions, and compare research paths through questioning and clarification—not by giving answers.',

    features_6_title: 'Triadic Governance',
    features_6_desc: 'Students, AI, and supervisors collaborate in one system. Supervisors retain final judgment, AI provides evidence-based academic support.',

    how_title: 'Triadic Interaction Mechanism',
    how_1_title: 'Student Side',
    how_1_desc: 'Continuous dialogue around research topics, literature review, methodology, and data analysis to develop epistemic agency.',
    how_2_title: 'AI Side',
    how_2_desc: 'Socratic guidance + evidence-enhanced retrieval + governable support, never replacing supervisor\'s final judgment.',
    how_3_title: 'Supervisor Side',
    how_3_desc: 'From "post-hoc review" to "timely intervention", identify students who need help through structured dashboards.',

    quotes_title: 'Core Principles',
    quotes_sub: 'Based on Learning Sciences & Human-AI Collaboration Research',

    philosophy_title: 'Four Core Principles',
    philosophy_1_title: 'Continuous Academic Support',
    philosophy_1_desc: 'Embedded throughout the research process, not just at presentation milestones, aligning with self-regulated learning theory.',

    philosophy_2_title: 'AI Promotes, Not Replaces Thinking',
    philosophy_2_desc: 'Guide students to form higher-quality academic judgments through questioning, clarification, and reflection—not by providing shortcuts.',

    philosophy_3_title: 'Supervisors Remain in the Loop',
    philosophy_3_desc: 'Supervisors are re-embedded into a visible, trackable, and timely intervenable guidance process.',

    philosophy_4_title: 'Evidence & Governance',
    philosophy_4_desc: 'Emphasize literature basis, boundaries, and accountability, aligning with evidence-based practice and AI ethics.',

    cta_section_title: 'Join HAKHub',
    cta_section_desc: 'Redesigning the relational structure of research supervision',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: 'Making research progress visible, trackable, and intervenable',
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '設計理念',
    locale: '繁體',

    hero_badge: '面向學生—AI—導師三元互動',
    hero_title: '科研支持與監督平台',
    hero_subtitle: '讓科研進展可見、可追蹤、可干預',
    hero_desc: '使 AI 成為激發深度思考的工具，而非繞過思考的捷徑',

    cta_primary: '開始使用',
    cta_secondary: '了解理念',

    mission: '我們並非試圖用 AI 替代導師，也並非鼓勵學生把思考外包給模型。',

    features_title: '圍繞研究過程組織功能',
    features_subtitle: '基於自我調節學習理論的設計',

    features_1_title: '研究項目中心化',
    features_1_desc: '所有對話、文獻、任務與導師反饋都歸屬於研究項目，而非散落在獨立會話中。支持從選題到完成的全程追蹤。',

    features_2_title: '進展與障礙並重',
    features_2_desc: '不僅記錄完成了什麼，也顯式記錄尚未解決的困惑、方法難點、理論分歧與寫作瓶頸。',

    features_3_title: '導師及時介入',
    features_3_desc: '導師能夠識別誰長期停滯、誰問題失焦、誰過度依賴 AI，在更合適的時機精準介入。',

    features_4_title: '證據增強檢索',
    features_4_desc: '接入 Semantic Scholar 等學術搜索，AI 回應附帶可追蹤的文獻來源，減少模型幻覺風險。',

    features_5_title: '蘇格拉底式引導',
    features_5_desc: 'AI 通過追問與澄清幫助學生識別問題邊界、顯化隱含假設、比較不同研究路徑，而非直接給出答案。',

    features_6_title: '三元協同治理',
    features_6_desc: '學生、AI 與導師在同一系統中協同，導師保持最終判斷權，AI 以證據為基礎提供學術支持。',

    how_title: '三元互動機制',
    how_1_title: '學生端',
    how_1_desc: '圍繞研究主題、文獻綜述、方法設計、數據分析等環節持續對話，發展認知主體性與研究判斷力。',
    how_2_title: 'AI 端',
    how_2_desc: '蘇格拉底式引導 + 證據增強檢索 + 可治理的學術支持，不替代導師的最終裁量權。',
    how_3_title: '導師端',
    how_3_desc: '從"事後查看"轉向"及時介入"，通過結構化面板識別需要幫助的學生，精準投入指導時間。',

    quotes_title: '核心理念',
    quotes_sub: '基於學習科學與人—AI 協同研究',

    philosophy_title: '四項核心原則',
    philosophy_1_title: '科研支持應是持續性的',
    philosophy_1_desc: '並非僅發生在匯報時刻，而是嵌入整個研究過程的連續性支持，呼應自我調節學習理論。',

    philosophy_2_title: 'AI 促進而非替代思考',
    philosophy_2_desc: '通過追問、澄清、比較與反思引導學生形成更高質量的學術判斷，而非提供捷徑。',

    philosophy_3_title: '導師保持在環可見',
    philosophy_3_desc: '導師不是被繞開的對象，而是被重新嵌入到可見、可追蹤、可及時介入的指導流程中。',

    philosophy_4_title: '證據與治理並重',
    philosophy_4_desc: '強調文獻依據、邊界與責任，符合循證實踐原則與 AI 倫理要求。',

    cta_section_title: '加入 HAKHub',
    cta_section_desc: '重新設計科研指導的關係結構',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '讓研究過程可見、可追蹤、可干預',
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
  const quotes = ACADEMIC_QUOTES[localeProp];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
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
  const textMuted = isDark ? 'text-slate-400' : COLORS.text.secondary;
  const borderClass = isDark ? 'border-emerald-900/30' : 'border-slate-200';
  const cardBg = isDark ? 'bg-[#0F2937]' : 'bg-white';

  return (
    <div className={`min-h-screen font-sans ${bg} text-slate-900 dark:text-white`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
              { id: 'philosophy', label: t.nav_philosophy },
            ].map(link => (
              <a key={link.id} href={`#${link.id}`}
                 className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {link.label}
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
              style={{ background: COLORS.primary }}
            >
              {t.cta_primary}
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-5 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeIn delay={100}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
                   style={{ background: COLORS.bgLight, borderColor: COLORS.primaryLight, color: COLORS.text.primary }}>
                <Network size={14} />
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
              <p className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-300">
                {t.hero_subtitle}
              </p>
            </FadeIn>

            <FadeIn delay={400}>
              <p className={`text-base leading-relaxed mb-8 max-w-lg italic ${textMuted}`}>
                "{t.mission}"
              </p>
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
                  onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}
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
                  src="/images/Home1.png"
                  alt="HAKHub Scholar Platform"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl shadow-xl backdrop-blur-sm"
                   style={{ background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}>
                <img src="/SVG/ai-2.svg" alt="AI" className="w-16 h-16" />
                <p className="text-xs font-medium mt-2 text-slate-600 dark:text-slate-400">
                  {isEN ? 'AI as a Thinking Tool' : 'AI 思考工具'}
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
              { icon: MessageSquare, title: t.features_1_title, desc: t.features_1_desc, svg: '/SVG/ai-1.svg' },
              { icon: FileText, title: t.features_2_title, desc: t.features_2_desc, svg: '/SVG/student-profile.svg' },
              { icon: Eye, title: t.features_3_title, desc: t.features_3_desc, svg: '/SVG/teacher-dashboard.svg' },
              { icon: Search, title: t.features_4_title, desc: t.features_4_desc, svg: '/SVG/resource-collaboration.svg' },
              { icon: Lightbulb, title: t.features_5_title, desc: t.features_5_desc, svg: '/SVG/workflow-cycle.svg' },
              { icon: ShieldCheck, title: t.features_6_title, desc: t.features_6_desc, svg: '/SVG/team.svg' },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
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
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                           style={{ background: hoveredFeature === i ? COLORS.primary : COLORS.bgLight }}>
                        <img src={feature.svg} alt={feature.title} className="w-8 h-8" style={{ filter: hoveredFeature === i ? 'brightness(0) invert(1)' : 'none' }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                        <p className={`text-sm leading-relaxed ${textMuted}`}>{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Collaboration Image */}
      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="relative rounded-3xl overflow-hidden shadow-xl group">
              <img
                src="/images/collaboration.png"
                alt="Triadic collaboration"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ maxHeight: '380px', objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center gap-3 mb-2">
                  <Users size={24} className="text-emerald-400" />
                  <p className="text-white/90 text-sm font-medium">{isEN ? 'Student—AI—Supervisor Triadic Model' : '学生—AI—导师 三元模型'}</p>
                </div>
                <p className="text-white text-lg font-semibold">
                  {isEN ? 'Coordinated system for research supervision' : '协同的科研督导系统'}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How It Works - Triadic Mechanism */}
      <section className="py-20 px-5" style={{ background: isDark ? 'rgba(16, 185, 129, 0.03)' : COLORS.bgLight }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <Network size={32} className="inline-block mb-4 text-emerald-600" />
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.how_title}
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: t.how_1_title, desc: t.how_1_desc, icon: GraduationCap, color: 'bg-blue-500' },
              { title: t.how_2_title, desc: t.how_2_desc, icon: BrainCircuit, color: 'bg-emerald-500' },
              { title: t.how_3_title, desc: t.how_3_desc, icon: ShieldCheck, color: 'bg-amber-500' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={i} delay={i * 150}>
                  <div className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${cardBg}`}
                       style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.2)' : COLORS.bgLight }}>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
                      <Icon size={26} className="text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-3">{item.title}</h3>
                    <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Academic Quotes */}
      <section className="py-16 px-5">
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

              <p className="text-lg md:text-xl leading-relaxed text-center mb-6" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: isDark ? '#E0F2FE' : COLORS.text.primary }}>
                "{quotes[currentQuoteIndex].quote}"
              </p>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-md font-medium" style={{ background: COLORS.bgLight, color: COLORS.text.primary }}>
                  {quotes[currentQuoteIndex].source}
                </span>
                <span className={textMuted}>— {quotes[currentQuoteIndex].author}</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Philosophy - Four Core Principles */}
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

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: t.philosophy_1_title, desc: t.philosophy_1_desc, icon: '01' },
              { title: t.philosophy_2_title, desc: t.philosophy_2_desc, icon: '02' },
              { title: t.philosophy_3_title, desc: t.philosophy_3_desc, icon: '03' },
              { title: t.philosophy_4_title, desc: t.philosophy_4_desc, icon: '04' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className={`p-6 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg ${cardBg}`}
                     style={{ borderLeftColor: COLORS.primary }}>
                  <div className="flex items-start gap-4">
                    <span className={`text-2xl font-bold ${isDark ? 'text-slate-700' : 'text-slate-200'}`}>{item.icon}</span>
                    <div>
                      <h3 className="font-bold text-base mb-2">{item.title}</h3>
                      <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className={`p-12 md:p-16 rounded-3xl border-2 text-center ${cardBg}`}
               style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : COLORS.bgLight }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: COLORS.primary }}>
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
              {t.cta_section_title}
            </h2>
            <p className={`text-base mb-8 ${textMuted}`}>{t.cta_section_desc}</p>
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
              style={{ background: COLORS.primary }}
            >
              {t.cta_primary} <ArrowRight size={22} />
            </button>
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
