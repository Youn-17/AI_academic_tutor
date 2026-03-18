import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, BrainCircuit, Search, ShieldCheck,
  Quote, Lightbulb, Menu, X, MessageSquare,
  FileText, Eye, Users, Network, GraduationCap, ChevronRight,
  Globe, ChevronDown, Check
} from 'lucide-react';
import { Locale, Theme } from '@/types';

interface LandingPageProps {
  onEnter: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

// ─────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────
const QUOTES = {
  'zh-CN': [
    { text: 'AI 的角色是促进思考，而非替代思考。', source: '苏格拉底式教学法', author: 'Paul & Elder, 2006' },
    { text: '有效的学术成长依赖于监控、反馈与调整的不间断运行。', source: '持续反馈循环', author: 'Zimmerman, 2000' },
    { text: '导师必须保持在环可见与可干预。', source: '人在环治理', author: 'Mosqueira-Rey et al., 2023' },
    { text: '让研究过程更加透明，让学术支持更加连续，让思维发展更加可见。', source: '平台愿景', author: 'HAKHub' },
  ],
  'zh-TW': [
    { text: 'AI 的角色是促進思考，而非替代思考。', source: '蘇格拉底式教學法', author: 'Paul & Elder, 2006' },
    { text: '有效的學術成長依賴於監控、反饋與調整的不間斷運行。', source: '持續反饋循環', author: 'Zimmerman, 2000' },
    { text: '導師必須保持在環可見與可干預。', source: '人在環治理', author: 'Mosqueira-Rey et al., 2023' },
    { text: '讓研究過程更加透明，讓學術支持更加連續，讓思維發展更加可見。', source: '平台願景', author: 'HAKHub' },
  ],
  'en': [
    { text: 'AI should promote thinking, not replace it.', source: 'Socratic Method', author: 'Paul & Elder, 2006' },
    { text: 'Effective academic growth depends on uninterrupted cycles of monitoring, feedback, and adjustment.', source: 'Continuous Feedback Loop', author: 'Zimmerman, 2000' },
    { text: 'Supervisors must remain visible and intervenable.', source: 'Human-in-the-Loop', author: 'Mosqueira-Rey et al., 2023' },
    { text: 'Make research processes transparent, academic support continuous, and thinking development visible.', source: 'Platform Vision', author: 'HAKHub' },
  ],
};

const T = {
  'zh-CN': {
    brand: 'HAKHub Scholar',
    nav_features: '功能', nav_philosophy: '理念',
    badge: '学生 · AI · 导师 三元互动',
    h1_line1: '科研支持与', h1_line2: '监督平台',
    subtitle: '让科研进展可见、可追踪、可干预',
    mission: '我们并非试图用 AI 替代导师，也并非鼓励学生把思考外包给模型。',
    cta_primary: '立即使用', cta_secondary: '了解理念',
    stats: [
      { value: '三元', label: '协同互动模型' },
      { value: '6+', label: '核心功能模块' },
      { value: '100%', label: '循证设计原则' },
    ],
    features_label: '功能特性',
    features_h2: '围绕研究过程，重新组织支持系统',
    features_sub: '基于自我调节学习理论的设计',
    f: [
      { title: '研究项目中心化', desc: '所有对话、文献、任务与导师反馈都归属于研究项目，支持从选题到完成的全过程追踪。', svg: '/SVG/ai-1.svg' },
      { title: '进展与障碍并重', desc: '显式记录尚未解决的困惑、方法难点、理论分歧与写作瓶颈。', svg: '/SVG/student-profile.svg' },
      { title: '导师及时介入', desc: '识别谁长期停滞、谁过度依赖 AI，在更合适的时机精准介入。', svg: '/SVG/teacher-dashboard.svg' },
      { title: '证据增强检索', desc: '接入 Semantic Scholar，AI 回应附带可追溯的文献来源。', svg: '/SVG/resource-collaboration.svg' },
      { title: '苏格拉底式引导', desc: '通过追问与澄清帮助学生识别问题边界、显化隐含假设，而非直接给出答案。', svg: '/SVG/workflow-cycle.svg' },
      { title: '三元协同治理', desc: '学生、AI 与导师在同一系统中协同，导师保持最终判断权。', svg: '/SVG/team.svg' },
    ],
    how_h2: '三元互动机制',
    roles: [
      { title: '学生端', desc: '围绕研究主题、文献综述、方法设计等持续对话，发展认知主体性与研究判断力。' },
      { title: 'AI 端', desc: '苏格拉底式引导 + 证据增强检索，可治理的学术支持，不替代导师的最终裁量权。' },
      { title: '导师端', desc: '从"事后查看"转向"及时介入"，通过结构化面板识别需要帮助的学生。' },
    ],
    quotes_h2: '核心理念', quotes_sub: '基于学习科学与人—AI 协同研究',
    phil_h2: '四项核心原则',
    phil: [
      { title: '科研支持应是持续性的', desc: '嵌入整个研究过程，而非仅发生在汇报时刻，呼应自我调节学习理论。' },
      { title: 'AI 促进而非替代思考', desc: '通过追问、澄清与反思引导学生形成更高质量的学术判断。' },
      { title: '导师保持在环可见', desc: '导师被重新嵌入可见、可追踪、可及时介入的指导流程中。' },
      { title: '证据与治理并重', desc: '强调文献依据与责任，符合循证实践原则与 AI 伦理要求。' },
    ],
    cta_h2: '加入 HAKHub Scholar', cta_desc: '重新设计科研指导的关系结构',
    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '让研究过程可见、可追踪、可干预',
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav_features: '功能', nav_philosophy: '理念',
    badge: '學生 · AI · 導師 三元互動',
    h1_line1: '科研支持與', h1_line2: '監督平台',
    subtitle: '讓科研進展可見、可追蹤、可干預',
    mission: '我們並非試圖用 AI 替代導師，也並非鼓勵學生把思考外包給模型。',
    cta_primary: '立即使用', cta_secondary: '了解理念',
    stats: [
      { value: '三元', label: '協同互動模型' },
      { value: '6+', label: '核心功能模塊' },
      { value: '100%', label: '循證設計原則' },
    ],
    features_label: '功能特性',
    features_h2: '圍繞研究過程，重新組織支持系統',
    features_sub: '基於自我調節學習理論的設計',
    f: [
      { title: '研究項目中心化', desc: '所有對話、文獻、任務與導師反饋都歸屬於研究項目，支持全程追蹤。', svg: '/SVG/ai-1.svg' },
      { title: '進展與障礙並重', desc: '顯式記錄尚未解決的困惑、方法難點、理論分歧與寫作瓶頸。', svg: '/SVG/student-profile.svg' },
      { title: '導師及時介入', desc: '識別誰長期停滯、誰過度依賴 AI，在更合適的時機精準介入。', svg: '/SVG/teacher-dashboard.svg' },
      { title: '證據增強檢索', desc: '接入 Semantic Scholar，AI 回應附帶可追蹤的文獻來源。', svg: '/SVG/resource-collaboration.svg' },
      { title: '蘇格拉底式引導', desc: '通過追問與澄清幫助學生識別問題邊界、顯化隱含假設，而非直接給出答案。', svg: '/SVG/workflow-cycle.svg' },
      { title: '三元協同治理', desc: '學生、AI 與導師在同一系統中協同，導師保持最終判斷權。', svg: '/SVG/team.svg' },
    ],
    how_h2: '三元互動機制',
    roles: [
      { title: '學生端', desc: '圍繞研究主題、文獻綜述、方法設計等持續對話，發展認知主體性與研究判斷力。' },
      { title: 'AI 端', desc: '蘇格拉底式引導 + 證據增強檢索，可治理的學術支持，不替代導師的最終裁量權。' },
      { title: '導師端', desc: '從「事後查看」轉向「及時介入」，通過結構化面板識別需要幫助的學生。' },
    ],
    quotes_h2: '核心理念', quotes_sub: '基於學習科學與人—AI 協同研究',
    phil_h2: '四項核心原則',
    phil: [
      { title: '科研支持應是持續性的', desc: '嵌入整個研究過程，而非僅發生在匯報時刻，呼應自我調節學習理論。' },
      { title: 'AI 促進而非替代思考', desc: '通過追問、澄清與反思引導學生形成更高質量的學術判斷。' },
      { title: '導師保持在環可見', desc: '導師被重新嵌入可見、可追蹤、可及時介入的指導流程中。' },
      { title: '證據與治理並重', desc: '強調文獻依據與責任，符合循證實踐原則與 AI 倫理要求。' },
    ],
    cta_h2: '加入 HAKHub Scholar', cta_desc: '重新設計科研指導的關係結構',
    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '讓研究過程可見、可追蹤、可干預',
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav_features: 'Features', nav_philosophy: 'Philosophy',
    badge: 'Student · AI · Supervisor Triadic Model',
    h1_line1: 'Research Support &', h1_line2: 'Supervision Platform',
    subtitle: 'Making research progress visible, trackable, and intervenable',
    mission: 'We do not replace supervisors with AI, nor encourage students to outsource their thinking to models.',
    cta_primary: 'Get Started', cta_secondary: 'Our Philosophy',
    stats: [
      { value: '3-Way', label: 'Collaborative Model' },
      { value: '6+', label: 'Core Feature Modules' },
      { value: '100%', label: 'Evidence-Based Design' },
    ],
    features_label: 'FEATURES',
    features_h2: 'Organized Around the Research Process',
    features_sub: 'Designed on Self-Regulated Learning Theory',
    f: [
      { title: 'Research Project Centered', desc: 'All conversations, literature, tasks, and feedback belong to research projects—trackable from topic to completion.', svg: '/SVG/ai-1.svg' },
      { title: 'Progress & Obstacles', desc: 'Explicitly record unresolved questions, methodological difficulties, and theoretical disagreements.', svg: '/SVG/student-profile.svg' },
      { title: 'Timely Supervisor Intervention', desc: 'Identify who is stalled or over-relying on AI, and intervene at exactly the right moment.', svg: '/SVG/teacher-dashboard.svg' },
      { title: 'Evidence-Enhanced Search', desc: 'Integrated with Semantic Scholar—AI responses include traceable literature sources.', svg: '/SVG/resource-collaboration.svg' },
      { title: 'Socratic Guidance', desc: 'AI identifies problem boundaries and surfaces assumptions through questioning, not by giving direct answers.', svg: '/SVG/workflow-cycle.svg' },
      { title: 'Triadic Governance', desc: 'Students, AI, and supervisors collaborate in one system. Supervisors retain final judgment.', svg: '/SVG/team.svg' },
    ],
    how_h2: 'Triadic Interaction Mechanism',
    roles: [
      { title: 'Student', desc: 'Continuous dialogue around research topics, literature review, and methodology to develop epistemic agency.' },
      { title: 'AI', desc: 'Socratic guidance + evidence-enhanced retrieval. Governable academic support—never replacing supervisor judgment.' },
      { title: 'Supervisor', desc: 'Shift from post-hoc review to timely intervention via structured dashboards that highlight who needs help.' },
    ],
    quotes_h2: 'Core Principles', quotes_sub: 'Based on Learning Sciences & Human–AI Collaboration Research',
    phil_h2: 'Four Core Principles',
    phil: [
      { title: 'Continuous Academic Support', desc: 'Embedded throughout the research process, not just at presentation milestones.' },
      { title: 'AI Promotes, Not Replaces Thinking', desc: 'Guide students to higher-quality academic judgments through questioning and reflection.' },
      { title: 'Supervisors Remain in the Loop', desc: 'Re-embedded into a visible, trackable, and timely-intervenable guidance process.' },
      { title: 'Evidence & Governance', desc: 'Emphasize literature basis and accountability, aligning with AI ethics and evidence-based practice.' },
    ],
    cta_h2: 'Join HAKHub Scholar', cta_desc: 'Redesigning the relational structure of research supervision',
    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: 'Making research progress visible, trackable, and intervenable',
  },
} as const;

// ─────────────────────────────────────────────
// Scroll-triggered fade using IntersectionObserver
// ─────────────────────────────────────────────
const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
  from?: 'bottom' | 'left' | 'right';
}> = ({ children, delay = 0, className = '', from = 'bottom' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const initial =
    from === 'left' ? 'translate-x-8 opacity-0'
    : from === 'right' ? '-translate-x-8 opacity-0'
    : 'translate-y-8 opacity-0';

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-x-0 translate-y-0 opacity-100' : initial} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const LandingPage: React.FC<LandingPageProps> = ({ onEnter, locale: loc, setLocale, theme, setTheme }) => {
  const t = T[loc];
  const isDark = theme === 'dark';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const quotes = QUOTES[loc];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx(i => (i + 1) % quotes.length), 6000);
    return () => clearInterval(id);
  }, [quotes.length]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Design tokens ──────────────────────────
  const bg       = isDark ? '#07111A'  : '#F8FAFC';
  const surface  = isDark ? '#0D1E2C'  : '#FFFFFF';
  const border   = isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0';
  const textBase = isDark ? '#E8F1F8'  : '#0F172A';
  const textMuted= isDark ? '#7A9BB0'  : '#64748B';
  const emerald  = '#059669';
  const emeraldLight = '#10B981';

  const navBg = scrolled
    ? (isDark ? 'rgba(7,17,26,0.85)' : 'rgba(248,250,252,0.85)')
    : 'transparent';

  return (
    <div className="min-h-screen antialiased" style={{ background: bg, color: textBase, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Ambient background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${emerald}22 0%, transparent 70%)`, top: '-100px', left: '-100px' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, #0EA5E922 0%, transparent 70%)`, bottom: '10%', right: '-80px' }} />
      </div>

      {/* ══════════════════════════════════════
          FLOATING NAVBAR
      ══════════════════════════════════════ */}
      <nav className="fixed top-4 left-4 right-4 z-50 transition-all duration-300 rounded-2xl"
        style={{
          background: navBg,
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? `1px solid ${border}` : 'none',
          boxShadow: scrolled ? (isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)') : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onEnter}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})` }}>
              <BrainCircuit size={16} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">{t.brand}</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {[{ href: '#features', label: t.nav_features }, { href: '#philosophy', label: t.nav_philosophy }].map(l => (
              <a key={l.href} href={l.href}
                className="text-sm font-medium transition-colors duration-200 cursor-pointer"
                style={{ color: textMuted }}
                onMouseEnter={e => (e.currentTarget.style.color = emeraldLight)}
                onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">

            {/* Globe language dropdown */}
            <div className="hidden sm:block relative" ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textMuted }}>
                <Globe size={14} />
                <span>{loc === 'zh-CN' ? '简体中文' : loc === 'zh-TW' ? '繁體中文' : 'English'}</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden shadow-2xl z-50"
                  style={{ background: surface, border: `1px solid ${border}` }}>
                  {([
                    { code: 'zh-CN' as Locale, label: '简体中文', sub: 'Simplified Chinese' },
                    { code: 'zh-TW' as Locale, label: '繁體中文', sub: 'Traditional Chinese' },
                    { code: 'en'    as Locale, label: 'English',  sub: 'English' },
                  ]).map(({ code, label, sub }) => (
                    <button key={code}
                      onClick={() => { setLocale(code); localStorage.setItem('preferred-locale', code); setLangOpen(false); }}
                      className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer"
                      style={{ background: loc === code ? `${emerald}12` : 'transparent' }}
                      onMouseEnter={e => { if (loc !== code) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
                      onMouseLeave={e => { if (loc !== code) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: loc === code ? emeraldLight : textBase }}>{label}</p>
                        <p className="text-xs" style={{ color: textMuted }}>{sub}</p>
                      </div>
                      {loc === code && <Check size={13} style={{ color: emeraldLight, flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center transition-all duration-200 cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textMuted }}>
              <span className="text-xs">{isDark ? '☀' : '◐'}</span>
            </button>

            {/* CTA */}
            <button onClick={onEnter}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})`, boxShadow: `0 4px 14px ${emerald}40` }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {t.cta_primary} <ArrowRight size={14} />
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg cursor-pointer"
              style={{ color: textMuted }}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden rounded-b-2xl px-5 pb-5 pt-3 border-t"
            style={{ background: isDark ? '#0D1E2C' : 'white', borderColor: border }}>
            <div className="flex flex-col gap-3 mb-4">
              {[{ href: '#features', label: t.nav_features }, { href: '#philosophy', label: t.nav_philosophy }].map(l => (
                <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium py-2" style={{ color: textMuted }}>{l.label}</a>
              ))}
            </div>
            <div className="mb-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              {([
                { code: 'zh-CN' as Locale, label: '简体中文' },
                { code: 'zh-TW' as Locale, label: '繁體中文' },
                { code: 'en'    as Locale, label: 'English' },
              ]).map(({ code, label }, i) => (
                <button key={code} onClick={() => { setLocale(code); localStorage.setItem('preferred-locale', code); setMobileOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium cursor-pointer transition-colors"
                  style={{
                    background: loc === code ? `${emerald}12` : 'transparent',
                    color: loc === code ? emeraldLight : textMuted,
                    borderTop: i > 0 ? `1px solid ${border}` : 'none',
                  }}>
                  <span className="flex items-center gap-2"><Globe size={14} />{label}</span>
                  {loc === code && <Check size={13} style={{ color: emeraldLight }} />}
                </button>
              ))}
            </div>
            <button onClick={() => { onEnter(); setMobileOpen(false); }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})` }}>
              {t.cta_primary}
            </button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 px-5" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            {/* Badge */}
            <FadeIn delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
                style={{ borderColor: `${emerald}40`, color: emeraldLight, background: `${emerald}10` }}>
                <Network size={12} />
                {t.badge}
              </div>
            </FadeIn>

            {/* Headline */}
            <FadeIn delay={80}>
              <h1 className="font-bold leading-[1.1] mb-6" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2.6rem, 6vw, 4.5rem)' }}>
                <span style={{ color: textBase }}>{t.h1_line1}</span>
                <br />
                <span style={{
                  background: `linear-gradient(135deg, ${emerald}, ${emeraldLight}, #0EA5E9)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {t.h1_line2}
                </span>
              </h1>
            </FadeIn>

            {/* Subtitle */}
            <FadeIn delay={160}>
              <p className="text-xl font-medium mb-4" style={{ color: textBase, opacity: 0.8 }}>
                {t.subtitle}
              </p>
            </FadeIn>

            {/* Mission */}
            <FadeIn delay={220}>
              <p className="text-sm leading-relaxed italic mb-10 max-w-lg" style={{ color: textMuted, borderLeft: `2px solid ${emerald}60`, paddingLeft: '14px' }}>
                "{t.mission}"
              </p>
            </FadeIn>

            {/* CTAs */}
            <FadeIn delay={280}>
              <div className="flex flex-wrap gap-3 mb-14">
                <button onClick={onEnter}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})`, boxShadow: `0 8px 24px ${emerald}40` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 32px ${emerald}50`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 24px ${emerald}40`; }}>
                  {t.cta_primary} <ArrowRight size={16} />
                </button>
                <button onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm border transition-all duration-200 cursor-pointer"
                  style={{ borderColor: border, color: textMuted }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = emeraldLight; e.currentTarget.style.color = emeraldLight; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted; }}>
                  {t.cta_secondary} <ChevronRight size={14} />
                </button>
              </div>
            </FadeIn>

            {/* Stats row */}
            <FadeIn delay={360}>
              <div className="flex flex-wrap gap-6">
                {t.stats.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && <div className="w-px h-8 hidden sm:block" style={{ background: border }} />}
                    <div>
                      <p className="text-2xl font-bold leading-none" style={{ color: emeraldLight, fontFamily: 'Crimson Pro, Georgia, serif' }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: textMuted }}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right - Hero visual */}
          <FadeIn delay={200} from="right">
            <div className="relative">
              {/* Main screenshot */}
              <div className="rounded-2xl overflow-hidden"
                style={{ boxShadow: isDark ? '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' : '0 40px 80px rgba(0,0,0,0.15), 0 0 0 1px #E2E8F0' }}>
                <img src="/images/Home1.png" alt="HAKHub Scholar Platform" className="w-full h-auto object-cover block" />
              </div>

              {/* Floating badge - AI thinking */}
              <div className="absolute -bottom-5 -left-6 flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: surface, boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(0,0,0,0.12)', border: `1px solid ${border}` }}>
                <img src="/SVG/ai-2.svg" alt="AI" className="w-10 h-10 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold" style={{ color: textBase }}>{loc === 'en' ? 'AI Thinking Tool' : 'AI 思考工具'}</p>
                  <p className="text-xs" style={{ color: emeraldLight }}>{loc === 'en' ? 'Socratic, not prescriptive' : '苏格拉底式，非处方式'}</p>
                </div>
              </div>

              {/* Floating badge - Triadic */}
              <div className="absolute -top-4 -right-4 px-4 py-2.5 rounded-xl flex items-center gap-2"
                style={{ background: `${emerald}18`, border: `1px solid ${emerald}40`, backdropFilter: 'blur(8px)' }}>
                <Users size={14} style={{ color: emeraldLight }} />
                <span className="text-xs font-semibold" style={{ color: emeraldLight }}>
                  {loc === 'en' ? 'Triadic System' : '三元协同'}
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES — BENTO GRID
      ══════════════════════════════════════ */}
      <section id="features" className="py-28 px-5 relative" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-4"
                style={{ background: `${emerald}15`, color: emeraldLight, letterSpacing: '0.1em' }}>
                {t.features_label}
              </span>
              <h2 className="font-bold mb-4"
                style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', color: textBase }}>
                {t.features_h2}
              </h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: textMuted }}>{t.features_sub}</p>
            </div>
          </FadeIn>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large card — Feature 1 */}
            <FadeIn delay={0} className="lg:col-span-2">
              <FeatureCard isDark={isDark} surface={surface} border={border} textBase={textBase} textMuted={textMuted} emerald={emerald} emeraldLight={emeraldLight} feature={t.f[0]} large />
            </FadeIn>

            {/* Regular — Feature 2 */}
            <FadeIn delay={60}>
              <FeatureCard isDark={isDark} surface={surface} border={border} textBase={textBase} textMuted={textMuted} emerald={emerald} emeraldLight={emeraldLight} feature={t.f[1]} />
            </FadeIn>

            {/* Regular — Feature 3 */}
            <FadeIn delay={120}>
              <FeatureCard isDark={isDark} surface={surface} border={border} textBase={textBase} textMuted={textMuted} emerald={emerald} emeraldLight={emeraldLight} feature={t.f[2]} />
            </FadeIn>

            {/* Large card — Feature 5 */}
            <FadeIn delay={180} className="lg:col-span-2">
              <FeatureCard isDark={isDark} surface={surface} border={border} textBase={textBase} textMuted={textMuted} emerald={emerald} emeraldLight={emeraldLight} feature={t.f[4]} large />
            </FadeIn>

            {/* Regular — Feature 4 */}
            <FadeIn delay={100}>
              <FeatureCard isDark={isDark} surface={surface} border={border} textBase={textBase} textMuted={textMuted} emerald={emerald} emeraldLight={emeraldLight} feature={t.f[3]} />
            </FadeIn>

            {/* Regular — Feature 6 */}
            <FadeIn delay={140}>
              <FeatureCard isDark={isDark} surface={surface} border={border} textBase={textBase} textMuted={textMuted} emerald={emerald} emeraldLight={emeraldLight} feature={t.f[5]} />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TRIADIC MECHANISM
      ══════════════════════════════════════ */}
      <section className="py-24 px-5 relative" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <Network size={28} className="inline-block mb-4" style={{ color: emeraldLight }} />
              <h2 className="font-bold" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: textBase }}>
                {t.how_h2}
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connecting line on desktop */}
            <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${emerald}60, transparent)` }} />

            {[
              { icon: GraduationCap, color: '#3B82F6', role: t.roles[0] },
              { icon: BrainCircuit, color: emerald,    role: t.roles[1] },
              { icon: ShieldCheck,  color: '#F59E0B',  role: t.roles[2] },
            ].map(({ icon: Icon, color, role }, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="p-7 rounded-2xl h-full transition-all duration-300 group cursor-default"
                  style={{ background: surface, border: `1px solid ${border}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = `1px solid ${color}60`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px ${color}18`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = `1px solid ${border}`; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-105"
                    style={{ background: `${color}18` }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <h3 className="font-bold text-base mb-3" style={{ color: textBase }}>{role.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{role.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          ACADEMIC QUOTES
      ══════════════════════════════════════ */}
      <section className="py-24 px-5 relative" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <Quote size={24} className="inline-block mb-4" style={{ color: emeraldLight }} />
              <h2 className="font-bold mb-2" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: textBase }}>
                {t.quotes_h2}
              </h2>
              <p className="text-sm" style={{ color: textMuted }}>{t.quotes_sub}</p>
            </div>
          </FadeIn>

          <FadeIn delay={120}>
            <div className="p-10 md:p-14 rounded-3xl relative overflow-hidden"
              style={{ background: surface, border: `1px solid ${border}`, boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.3)' : '0 24px 60px rgba(0,0,0,0.07)' }}>

              {/* Decorative large quote mark */}
              <div className="absolute top-6 right-8 text-8xl font-serif leading-none select-none pointer-events-none"
                style={{ color: `${emerald}12`, fontFamily: 'Georgia, serif' }}>"</div>

              {/* Quote dots */}
              <div className="flex justify-center gap-2 mb-10">
                {quotes.map((_, i) => (
                  <button key={i} onClick={() => setQuoteIdx(i)}
                    className="rounded-full transition-all duration-300 cursor-pointer"
                    style={{ width: i === quoteIdx ? '28px' : '8px', height: '8px', background: i === quoteIdx ? emeraldLight : `${textMuted}40` }} />
                ))}
              </div>

              <p className="text-xl md:text-2xl leading-relaxed text-center mb-8 transition-all duration-500"
                style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: textBase }}>
                "{quotes[quoteIdx].text}"
              </p>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-lg font-medium" style={{ background: `${emerald}12`, color: emeraldLight }}>
                  {quotes[quoteIdx].source}
                </span>
                <span style={{ color: textMuted }}>— {quotes[quoteIdx].author}</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PHILOSOPHY — 4 PRINCIPLES
      ══════════════════════════════════════ */}
      <section id="philosophy" className="py-24 px-5 relative" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <Lightbulb size={28} className="inline-block mb-4" style={{ color: '#F59E0B' }} />
              <h2 className="font-bold" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: textBase }}>
                {t.phil_h2}
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-5">
            {t.phil.map((p, i) => (
              <FadeIn key={i} delay={i * 90}>
                <div className="p-7 rounded-2xl flex gap-5 group transition-all duration-300"
                  style={{ background: surface, border: `1px solid ${border}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = `1px solid ${emerald}50`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px ${emerald}12`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = `1px solid ${border}`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div className="text-4xl font-bold leading-none flex-shrink-0 mt-1"
                    style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: `${emerald}25`, WebkitTextStroke: `1px ${emerald}40` }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-2" style={{ color: textBase }}>{p.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{p.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════ */}
      <section className="py-24 px-5 relative" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="p-14 md:p-20 rounded-3xl text-center relative overflow-hidden"
              style={{
                background: isDark
                  ? `linear-gradient(135deg, #0D2A1E 0%, #0D1E2C 100%)`
                  : `linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%)`,
                border: `1px solid ${emerald}30`,
                boxShadow: `0 40px 80px ${emerald}12`,
              }}>

              {/* Background decoration */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full"
                  style={{ background: `${emerald}08` }} />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full"
                  style={{ background: `${emerald}06` }} />
              </div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})`, boxShadow: `0 8px 24px ${emerald}50` }}>
                  <BrainCircuit size={26} className="text-white" />
                </div>

                <h2 className="font-bold mb-4"
                  style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', color: textBase }}>
                  {t.cta_h2}
                </h2>
                <p className="text-base mb-10 max-w-md mx-auto" style={{ color: textMuted }}>
                  {t.cta_desc}
                </p>

                <button onClick={onEnter}
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-semibold text-base transition-all duration-200 cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})`, boxShadow: `0 10px 28px ${emerald}50` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 18px 40px ${emerald}60`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 10px 28px ${emerald}50`; }}>
                  {t.cta_primary} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="py-12 px-5 relative" style={{ zIndex: 1, borderTop: `1px solid ${border}` }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onEnter}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${emerald}, ${emeraldLight})` }}>
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span className="font-semibold text-sm" style={{ color: textBase }}>{t.brand}</span>
          </div>

          <p className="text-xs text-center" style={{ color: textMuted }}>{t.footer_copy}</p>
          <p className="text-xs" style={{ color: textMuted, opacity: 0.6 }}>{t.footer_note}</p>
        </div>
      </footer>
    </div>
  );
};

// ─────────────────────────────────────────────
// Feature Card (extracted for reuse)
// ─────────────────────────────────────────────
interface FeatureCardProps {
  isDark: boolean;
  surface: string;
  border: string;
  textBase: string;
  textMuted: string;
  emerald: string;
  emeraldLight: string;
  feature: { title: string; desc: string; svg: string };
  large?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ isDark, surface, border, textBase, textMuted, emerald, emeraldLight, feature, large }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="p-7 rounded-2xl h-full transition-all duration-300 cursor-default"
      style={{
        background: hovered ? (isDark ? '#0D2518' : `${emerald}06`) : surface,
        border: `1px solid ${hovered ? `${emerald}50` : border}`,
        boxShadow: hovered ? `0 16px 40px ${emerald}15` : 'none',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-col h-full">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-200"
          style={{ background: hovered ? `${emerald}20` : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'), transform: hovered ? 'scale(1.08)' : 'scale(1)' }}>
          <img src={feature.svg} alt={feature.title} className="w-7 h-7" />
        </div>
        <h3 className="font-bold mb-2.5 text-base" style={{ color: textBase }}>{feature.title}</h3>
        <p className="text-sm leading-relaxed flex-1" style={{ color: textMuted, maxWidth: large ? '480px' : undefined }}>{feature.desc}</p>
        {hovered && (
          <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: emeraldLight }}>
            <span>{feature.title.includes('检索') || feature.title.includes('Search') ? 'Semantic Scholar' : 'Learn more'}</span>
            <ChevronRight size={12} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
