import React, { useState, useEffect, useRef } from 'react';
import {
  RiBrainLine, RiSearchEyeLine, RiShieldCheckLine, RiDoubleQuotesL,
  RiLightbulbFlashLine, RiBookOpenLine, RiGraduationCapLine, RiEyeLine,
  RiTeamLine, RiUserVoiceLine, RiQuillPenLine, RiArrowRightLine, RiArrowRightUpLine,
  RiGlobalLine, RiMenuLine, RiCloseLine, RiCheckLine, RiArrowDownSLine,
  RiSparkling2Line, RiRobot2Line, RiMoonLine, RiSunLine, RiFlaskLine,
  RiChatQuoteLine, RiHistoryLine, RiNodeTree, RiScales3Line, RiSeedlingLine,
  RiHome5Line, RiCompassLine, RiBook2Line, RiStackLine,
} from '@remixicon/react';
import { Locale, Theme } from '@/types';
import Aurora from './Aurora';

interface LandingPageProps {
  onEnter: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

type PageId = 'home' | 'design' | 'learning' | 'features';

// ─────────────────────────────────────────────
// Trilingual copy (content from docs/homepage_content.md)
// ─────────────────────────────────────────────
const T: Record<Locale, any> = {
  'zh-CN': {
    brand: 'HAKHub Scholar',
    nav: { home: '首页', design: '设计理念', learning: '学习理念', features: '平台功能' },
    hero: {
      badge: '学生 · AI · 导师 — 三元在环',
      h1a: '答案越来越廉价，', h1grad: '思考越来越珍贵',
      sub: '学生—AI—导师 三元协同的科研支持平台。用引导式追问守护你的认知主体性，让每个有依据的回答都连着真实文献。',
      mission: '我们不替代导师，也不让你把思考外包给模型——在这里，AI 是那个"逼你想清楚"的人。',
      ctaPrimary: '立即使用', ctaSecondary: '了解理念',
      chips: ['苏格拉底式引导', '回答附真实来源', '导师可见可干预', '知识库：统计 · 学习科学'],
    },
    tension: {
      eyebrow: '设计的出发点',
      title: '当答案变得免费，学习反而更难',
      body: '生成式 AI 让"得到一个答案"几乎零成本。但学习从不发生在答案被递到手上的那一刻——它发生在你自己设定问题、权衡证据、推进想法的过程里。当思考可以被一键外包，真正的风险不是答案出错，而是思考的能力没有长在你身上。',
      foot: '认知卸载会削弱个体自身的能力（Risko & Gilbert, 2016）；适度的"合意困难"才是持久学习的条件（Bjork & Bjork, 2011）。',
    },
    principles: {
      eyebrow: '设计理念',
      title: '三条不可让渡的原则',
      sub: '这是我们设计每一处交互的底线。',
      items: [
        { title: '促进思考，而非替代思考', body: '遇到你想让它"代劳"的关键判断，它会指出哪些必须由你来做，并把框架还给你。', source: '认知主体性 · Scardamalia (2002)；Zhou et al. (2025)' },
        { title: '导师必须在环：可见 · 可干预', body: '平台不取代导师的学术权威。学生的思考过程对导师可见，导师可在任意节点介入、纠偏。', source: '人在环治理 · 责任式 AI' },
        { title: '循证、透明、不杜撰', body: '每个有依据的回答都连着真实来源——知识库的教材与论文，或真实文献；思考过程可展开查看。', source: '检索增强（RAG）+ 可解释性' },
      ],
    },
    features: {
      eyebrow: '平台功能',
      title: '围绕研究过程，重新组织支持',
      sub: '基于自我调节学习理论设计',
      items: [
        { title: '苏格拉底式对话', desc: '问题模糊先帮你界定；问题清晰给结构化框架 + 推进性追问，而非直接给完整答案。' },
        { title: '循证检索智能体', desc: '需要依据时，它会自己去检索平台知识库与真实学术文献，并说明查阅了哪些来源。' },
        { title: '真实引用', desc: '每条有依据的回答都附"来源"卡片，可点击核对，而非一段无法溯源的话。' },
        { title: '思考过程可见', desc: '使用推理模型时，模型的思考过程独立呈现、可折叠，与正式回答分开。' },
        { title: '过程记忆', desc: '记住你的研究进展、关键决策与反复出现的难点，让辅导得以延续。' },
        { title: '导师视图', desc: '导师可查看（经授权的）对话、在关键处介入、留下反馈。' },
      ],
    },
    roles: {
      title: '一套系统，三种受益',
      items: [
        { title: '学生', tag: '把问题想清楚', desc: '在追问中澄清研究问题、找到真实文献线索、看清自己的假设与盲点。你始终是研究的作者。' },
        { title: '导师 / 督导', tag: '让过程可见', desc: '看见过程而非只看结果，在关键节点介入，把有限的指导时间用在刀刃上。' },
        { title: '研究者', tag: '循证可复现', desc: '支持对照设计（引导式 vs 直答式）与可解释的交互记录，用于研究 AI 如何影响学习。' },
      ],
    },
    foundation: {
      eyebrow: '学习理念',
      title: '不是又一个 AI 工具，而是一套有学理依据的学习设计',
      sub: '主页上的每一处主张，都出自真实可核验的学习科学经典。',
      points: [
        { claim: '学习的主权属于学生', body: '真正的成长发生在学生自己设定问题、评估证据、推进想法的时刻。', source: 'Scardamalia (2002)；Zhou et al. (2025)' },
        { claim: '被外包的思考，不会变成你的能力', body: '认知卸载在当下高效，却可能削弱个体自身的能力。', source: 'Risko & Gilbert (2016)' },
        { claim: '适度的困难是学习的条件，不是障碍', body: '"合意困难"让记忆与理解更持久。', source: 'Bjork & Bjork (2011)' },
        { claim: '好的反馈让你学会自我调节', body: '回答"我要去哪 / 现在在哪 / 下一步怎么走"，把监控能力交还给学习者。', source: 'Hattie & Timperley (2007)' },
        { claim: '教学是持续的"会话"，而非单向传递', body: '学习在陈述—行动—反馈—调整的循环中发生。', source: 'Laurillard (2012)' },
        { claim: '主动建构胜过被动接收', body: '处于"互动 / 建构"状态的学习显著优于被动接收。', source: 'Chi & Wylie (2014)' },
        { claim: '脚手架要懂得"退场"', body: '好的支持随能力增长而逐步撤除；永不退场的帮助会固化为依赖。', source: 'Collins, Brown & Newman (1989)' },
        { claim: '有依据，才敢说；说了，就能溯源', body: '每个有依据的回答都连着真实来源，绝不编造文献。', source: '本平台 RAG + 工具设计' },
      ],
    },
    cta: { title: '把答案变便宜的时代，更需要守护思考', desc: '立即开始，或先了解我们的设计理念。', button: '进入平台' },
    footer: {
      tagline: '让研究过程可见、可追踪、可干预。',
      ethics: '本平台为学术研究与教学支持工具，生成内容仅供参考，不构成专业建议。',
      copy: '© 2026 HAKHub Team · HAKHub Scholar',
    },
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav: { home: '首頁', design: '設計理念', learning: '學習理念', features: '平台功能' },
    hero: {
      badge: '學生 · AI · 導師 — 三元在環',
      h1a: '答案越來越廉價，', h1grad: '思考越來越珍貴',
      sub: '學生—AI—導師 三元協同的科研支持平台。用引導式追問守護你的認知主體性，讓每個有依據的回答都連著真實文獻。',
      mission: '我們不替代導師，也不讓你把思考外包給模型——在這裡，AI 是那個「逼你想清楚」的人。',
      ctaPrimary: '立即使用', ctaSecondary: '了解理念',
      chips: ['蘇格拉底式引導', '回答附真實來源', '導師可見可干預', '知識庫：統計 · 學習科學'],
    },
    tension: {
      eyebrow: '設計的出發點',
      title: '當答案變得免費，學習反而更難',
      body: '生成式 AI 讓「得到一個答案」幾乎零成本。但學習從不發生在答案被遞到手上的那一刻——它發生在你自己設定問題、權衡證據、推進想法的過程裡。當思考可以被一鍵外包，真正的風險不是答案出錯，而是思考的能力沒有長在你身上。',
      foot: '認知卸載會削弱個體自身的能力（Risko & Gilbert, 2016）；適度的「合意困難」才是持久學習的條件（Bjork & Bjork, 2011）。',
    },
    principles: {
      eyebrow: '設計理念',
      title: '三條不可讓渡的原則',
      sub: '這是我們設計每一處互動的底線。',
      items: [
        { title: '促進思考，而非替代思考', body: '遇到你想讓它「代勞」的關鍵判斷，它會指出哪些必須由你來做，並把框架還給你。', source: '認知主體性 · Scardamalia (2002)；Zhou et al. (2025)' },
        { title: '導師必須在環：可見 · 可干預', body: '平台不取代導師的學術權威。學生的思考過程對導師可見，導師可在任意節點介入、糾偏。', source: '人在環治理 · 責任式 AI' },
        { title: '循證、透明、不杜撰', body: '每個有依據的回答都連著真實來源——知識庫的教材與論文，或真實文獻；思考過程可展開查看。', source: '檢索增強（RAG）+ 可解釋性' },
      ],
    },
    features: {
      eyebrow: '平台功能',
      title: '圍繞研究過程，重新組織支持',
      sub: '基於自我調節學習理論設計',
      items: [
        { title: '蘇格拉底式對話', desc: '問題模糊先幫你界定；問題清晰給結構化框架 + 推進性追問，而非直接給完整答案。' },
        { title: '循證檢索智能體', desc: '需要依據時，它會自己去檢索平台知識庫與真實學術文獻，並說明查閱了哪些來源。' },
        { title: '真實引用', desc: '每條有依據的回答都附「來源」卡片，可點擊核對，而非一段無法溯源的話。' },
        { title: '思考過程可見', desc: '使用推理模型時，模型的思考過程獨立呈現、可折疊，與正式回答分開。' },
        { title: '過程記憶', desc: '記住你的研究進展、關鍵決策與反覆出現的難點，讓輔導得以延續。' },
        { title: '導師視圖', desc: '導師可查看（經授權的）對話、在關鍵處介入、留下反饋。' },
      ],
    },
    roles: {
      title: '一套系統，三種受益',
      items: [
        { title: '學生', tag: '把問題想清楚', desc: '在追問中澄清研究問題、找到真實文獻線索、看清自己的假設與盲點。你始終是研究的作者。' },
        { title: '導師 / 督導', tag: '讓過程可見', desc: '看見過程而非只看結果，在關鍵節點介入，把有限的指導時間用在刀刃上。' },
        { title: '研究者', tag: '循證可復現', desc: '支持對照設計（引導式 vs 直答式）與可解釋的互動記錄，用於研究 AI 如何影響學習。' },
      ],
    },
    foundation: {
      eyebrow: '學習理念',
      title: '不是又一個 AI 工具，而是一套有學理依據的學習設計',
      sub: '主頁上的每一處主張，都出自真實可核驗的學習科學經典。',
      points: [
        { claim: '學習的主權屬於學生', body: '真正的成長發生在學生自己設定問題、評估證據、推進想法的時刻。', source: 'Scardamalia (2002)；Zhou et al. (2025)' },
        { claim: '被外包的思考，不會變成你的能力', body: '認知卸載在當下高效，卻可能削弱個體自身的能力。', source: 'Risko & Gilbert (2016)' },
        { claim: '適度的困難是學習的條件，不是障礙', body: '「合意困難」讓記憶與理解更持久。', source: 'Bjork & Bjork (2011)' },
        { claim: '好的反饋讓你學會自我調節', body: '回答「我要去哪 / 現在在哪 / 下一步怎麼走」，把監控能力交還給學習者。', source: 'Hattie & Timperley (2007)' },
        { claim: '教學是持續的「會話」，而非單向傳遞', body: '學習在陳述—行動—反饋—調整的循環中發生。', source: 'Laurillard (2012)' },
        { claim: '主動建構勝過被動接收', body: '處於「互動 / 建構」狀態的學習顯著優於被動接收。', source: 'Chi & Wylie (2014)' },
        { claim: '腳手架要懂得「退場」', body: '好的支持隨能力增長而逐步撤除；永不退場的幫助會固化為依賴。', source: 'Collins, Brown & Newman (1989)' },
        { claim: '有依據，才敢說；說了，就能溯源', body: '每個有依據的回答都連著真實來源，絕不編造文獻。', source: '本平台 RAG + 工具設計' },
      ],
    },
    cta: { title: '把答案變便宜的時代，更需要守護思考', desc: '立即開始，或先了解我們的設計理念。', button: '進入平台' },
    footer: {
      tagline: '讓研究過程可見、可追蹤、可干預。',
      ethics: '本平台為學術研究與教學支持工具，生成內容僅供參考，不構成專業建議。',
      copy: '© 2026 HAKHub Team · HAKHub Scholar',
    },
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav: { home: 'Home', design: 'Design', learning: 'Learning', features: 'Platform' },
    hero: {
      badge: 'Student · AI · Mentor — A Triad in the Loop',
      h1a: 'As answers get cheaper, ', h1grad: 'thinking gets precious.',
      sub: 'A triadic research-support platform for student, AI, and mentor. We guard your epistemic agency through questioning, and anchor every grounded answer to real literature.',
      mission: 'We don’t replace your mentor, nor let you outsource thinking to a model—here, the AI is the one that makes you think it through.',
      ctaPrimary: 'Get Started', ctaSecondary: 'Our Philosophy',
      chips: ['Socratic guidance', 'Sourced answers', 'Mentor in the loop', 'Corpus: stats · learning sci'],
    },
    tension: {
      eyebrow: 'WHERE THE DESIGN STARTS',
      title: 'When answers get cheap, learning gets harder',
      body: 'Generative AI makes "getting an answer" nearly free. But learning never happens the moment an answer is handed to you—it happens while you set the problem, weigh the evidence, and advance your own ideas. When thinking can be outsourced with one click, the real risk is not a wrong answer, but that the capability never grows in you.',
      foot: 'Cognitive offloading can erode one’s own ability (Risko & Gilbert, 2016); "desirable difficulties" are what make learning durable (Bjork & Bjork, 2011).',
    },
    principles: {
      eyebrow: 'DESIGN PHILOSOPHY',
      title: 'Three non-negotiable principles',
      sub: 'The line we hold in every interaction we design.',
      items: [
        { title: 'Promote thinking, never replace it', body: 'When you try to offload a judgment that should be yours, it names what only you can decide and hands the framework back.', source: 'Epistemic agency · Scardamalia (2002); Zhou et al. (2025)' },
        { title: 'The mentor stays in the loop', body: 'It never replaces the mentor’s authority. The student’s thinking is visible to the mentor, who can step in at any point.', source: 'Human-in-the-loop · responsible AI' },
        { title: 'Evidence-grounded, transparent, no fabrication', body: 'Every grounded answer links to real sources—textbooks and papers in the corpus, or real literature; reasoning is inspectable.', source: 'Retrieval-augmented (RAG) + explainability' },
      ],
    },
    features: {
      eyebrow: 'PLATFORM',
      title: 'Support organized around the research process',
      sub: 'Designed on self-regulated learning theory',
      items: [
        { title: 'Socratic dialogue', desc: 'When the question is vague it helps you define it; when it’s clear it gives a framework plus probing questions—not a finished answer.' },
        { title: 'Evidence-seeking agent', desc: 'When grounding is needed, it searches the knowledge base and real literature on its own—and tells you what it consulted.' },
        { title: 'Real citations', desc: 'Every grounded answer carries clickable "source" cards you can verify—not an untraceable paragraph.' },
        { title: 'Visible reasoning', desc: 'With reasoning models, the model’s thinking is shown separately and collapsibly, apart from the answer.' },
        { title: 'Process memory', desc: 'It remembers your progress, key decisions, and recurring difficulties so guidance can continue.' },
        { title: 'Mentor view', desc: 'Mentors can view (consented) conversations, step in at key moments, and leave feedback.' },
      ],
    },
    roles: {
      title: 'One system, three ways to benefit',
      items: [
        { title: 'Students', tag: 'Think it through', desc: 'Clarify your question, find real literature, and see your own assumptions. You remain the author of your research.' },
        { title: 'Mentors', tag: 'Make process visible', desc: 'See the process, not just the result; step in at key points; spend scarce guidance time where it counts.' },
        { title: 'Researchers', tag: 'Evidence-based', desc: 'Supports controlled designs (Socratic vs direct) and interpretable interaction logs to study how AI shapes learning.' },
      ],
    },
    foundation: {
      eyebrow: 'LEARNING PHILOSOPHY',
      title: 'Not another AI tool, but a learning design with a scholarly basis',
      sub: 'Every claim here comes from real, verifiable learning-science work.',
      points: [
        { claim: 'The student owns the learning', body: 'Real growth happens when the student sets the problem, weighs evidence, and advances ideas.', source: 'Scardamalia (2002); Zhou et al. (2025)' },
        { claim: 'Outsourced thinking never becomes your ability', body: 'Cognitive offloading is efficient now but can erode one’s own capability.', source: 'Risko & Gilbert (2016)' },
        { claim: 'Difficulty is a condition for learning, not an obstacle', body: '"Desirable difficulties" make memory and understanding durable.', source: 'Bjork & Bjork (2011)' },
        { claim: 'Good feedback teaches self-regulation', body: 'It answers "where to, where now, what next," returning monitoring to the learner.', source: 'Hattie & Timperley (2007)' },
        { claim: 'Teaching is a continuing conversation', body: 'Learning happens in cycles of stating, acting, feedback, and adjusting.', source: 'Laurillard (2012)' },
        { claim: 'Active construction beats passive reception', body: 'Learning while interactive/constructive far outperforms passive reception.', source: 'Chi & Wylie (2014)' },
        { claim: 'Scaffolding must fade', body: 'Good support is withdrawn as competence grows; help that never fades becomes dependence.', source: 'Collins, Brown & Newman (1989)' },
        { claim: 'Grounded enough to say it; said, so you can trace it', body: 'Every grounded answer links to a real source. It never fabricates references.', source: 'This platform’s RAG + tools' },
      ],
    },
    cta: { title: 'In an age of cheap answers, thinking needs protecting', desc: 'Start now, or explore our design philosophy first.', button: 'Enter Platform' },
    footer: {
      tagline: 'Make research visible, trackable, and intervenable.',
      ethics: 'This platform is an academic and teaching-support tool; generated content is for reference only and is not professional advice.',
      copy: '© 2026 HAKHub Team · HAKHub Scholar',
    },
  },
};

const PRINCIPLE_ICONS = [RiBrainLine, RiUserVoiceLine, RiShieldCheckLine];
const FEATURE_ICONS = [RiChatQuoteLine, RiRobot2Line, RiDoubleQuotesL, RiEyeLine, RiHistoryLine, RiTeamLine];
const ROLE_ICONS = [RiGraduationCapLine, RiUserVoiceLine, RiFlaskLine];
const FOUNDATION_ICONS = [RiSeedlingLine, RiBrainLine, RiScales3Line, RiQuillPenLine, RiChatQuoteLine, RiSparkling2Line, RiLightbulbFlashLine, RiShieldCheckLine];
const NAV_ICONS: Record<PageId, any> = { home: RiHome5Line, design: RiCompassLine, learning: RiBook2Line, features: RiStackLine };

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${v ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
};

const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onMouseMove={onMove} className={`hak-spot relative overflow-hidden ${className}`} style={style}>
      <span className="hak-spot-glow" aria-hidden />
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, locale: loc, setLocale, theme, setTheme }) => {
  const t = T[loc];
  const isDark = theme === 'dark';
  const [page, setPage] = useState<PageId>('home');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [page]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Blue palette: navy → sky (deep to light) ──
  const navy = '#0B2447';
  const primary = '#2563EB';   // royal blue
  const sky = '#38BDF8';       // sky blue
  const bg = isDark ? '#06122A' : '#F4F8FF';
  const surface = isDark ? '#0C1E3E' : '#FFFFFF';
  const border = isDark ? 'rgba(120,170,255,0.12)' : '#DCE6F6';
  const textBase = isDark ? '#E9F1FF' : '#0A1A33';
  const textMuted = isDark ? '#8AA4CC' : '#56688A';
  const cardBg = isDark ? 'rgba(120,170,255,0.04)' : '#FFFFFF';
  const navBg = scrolled ? (isDark ? 'rgba(6,18,42,0.82)' : 'rgba(244,248,255,0.85)') : 'transparent';

  // 4 pages, accent goes DEEP → LIGHT (navy → sky)
  const PAGES: { id: PageId; accent: string }[] = [
    { id: 'home', accent: '#1E3A8A' },
    { id: 'design', accent: '#2563EB' },
    { id: 'learning', accent: '#3B82F6' },
    { id: 'features', accent: '#38BDF8' },
  ];
  const go = (p: PageId) => { setPage(p); setMobileOpen(false); };

  const Header: React.FC<{ eyebrow: string; title: string; sub?: string; accent: string }> = ({ eyebrow, title, sub, accent }) => (
    <div className="mb-14">
      <p className="text-xs font-bold tracking-[0.22em] mb-3" style={{ color: accent }}>{eyebrow}</p>
      <h2 className="font-bold" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', color: textBase, lineHeight: 1.14 }}>{title}</h2>
      {sub && <p className="mt-4 text-base max-w-2xl" style={{ color: textMuted }}>{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen antialiased" style={{ background: bg, color: textBase, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      <style>{`
        @keyframes hak-drift { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(7%,-9%) scale(1.12)} 66%{transform:translate(-6%,7%) scale(.94)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes hak-up { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hak-page { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hak-shimmer { to { background-position: 200% center } }
        .hak-up { animation: hak-up .9s cubic-bezier(.16,.84,.3,1) both }
        .hak-page { animation: hak-page .55s cubic-bezier(.16,.84,.3,1) both }
        .hak-aurora { position:absolute; border-radius:9999px; filter: blur(74px); will-change:transform; pointer-events:none }
        .hak-grad { background: linear-gradient(115deg, ${navy}, ${primary} 45%, ${sky}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; background-size:200% auto; animation: hak-shimmer 8s linear infinite }
        .hak-spot-glow { position:absolute; inset:0; opacity:0; transition:opacity .35s ease; background: radial-gradient(360px circle at var(--mx,50%) var(--my,50%), ${sky}26, transparent 60%); pointer-events:none; z-index:0 }
        .hak-spot:hover .hak-spot-glow { opacity:1 }
        .hak-spot { transition: transform .3s cubic-bezier(.2,.7,.2,1) }
        .hak-spot:hover { transform: translateY(-4px) }
        .hak-logo { transition: transform .65s cubic-bezier(.4,0,.2,1) }
        .hak-logo:hover { transform: rotate(360deg) }
        .hak-pill { position:relative; height:38px; padding:0 18px; border:none; border-radius:9999px; overflow:hidden; cursor:pointer; display:inline-flex; align-items:center; transition: background .3s ease }
        .hak-pill-circle { position:absolute; left:50%; bottom:0; width:160%; aspect-ratio:1/1; background:var(--pa); border-radius:50%; transform:translate(-50%,68%) scale(0); transform-origin:center bottom; transition:transform .5s cubic-bezier(.4,0,.2,1); z-index:0 }
        .hak-pill:hover .hak-pill-circle { transform:translate(-50%,20%) scale(1.05) }
        .hak-pill-labels { position:relative; z-index:1; display:block; height:1.3em; line-height:1.3em; overflow:hidden; font-size:14px; font-weight:500 }
        .hak-pill-label,.hak-pill-label-hover { display:block; white-space:nowrap; transition:transform .5s cubic-bezier(.4,0,.2,1) }
        .hak-pill-label-hover { position:absolute; top:0; left:0; transform:translateY(130%); color:#fff }
        .hak-pill:hover .hak-pill-label { transform:translateY(-130%) }
        .hak-pill:hover .hak-pill-label-hover { transform:translateY(0) }
        @media (prefers-reduced-motion: reduce){ .hak-up,.hak-page,.hak-aurora,.hak-grad{animation:none!important} .hak-up,.hak-page{opacity:1;transform:none} .hak-pill-circle,.hak-pill-label,.hak-pill-label-hover,.hak-logo{transition:none!important} }
      `}</style>

      {/* ── WebGL Aurora background (React Bits port · navy → royal → sky) ── */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, opacity: isDark ? 0.85 : 0.55 }}>
        <Aurora colorStops={[navy, primary, sky]} amplitude={1.0} blend={0.55} speed={0.6} />
      </div>
      {/* fade the aurora into the solid base toward the lower page so content stays readable */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: `linear-gradient(to bottom, transparent 0%, transparent 30%, ${bg} 80%)` }} />

      {/* ══ NAVBAR with page tabs ══ */}
      <nav className="fixed top-4 left-4 right-4 z-50 transition-all duration-300 rounded-2xl"
        style={{ background: navBg, backdropFilter: scrolled ? 'blur(16px)' : 'none', border: scrolled ? `1px solid ${border}` : '1px solid transparent', boxShadow: scrolled ? '0 8px 30px rgba(4,18,48,0.18)' : 'none' }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => go('home')}>
            <div className="hak-logo w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${navy}, ${primary} 60%, ${sky})`, boxShadow: `0 4px 14px ${primary}55` }}>
              <RiBrainLine size={18} className="text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight" style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>{t.brand}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {PAGES.map(({ id, accent }) => {
              const active = page === id;
              return (
                <button key={id} onClick={() => go(id)} className="hak-pill"
                  style={{ '--pa': accent, background: active ? accent : (isDark ? 'rgba(120,170,255,0.07)' : 'rgba(37,99,235,0.05)') } as React.CSSProperties}>
                  <span className="hak-pill-circle" />
                  <span className="hak-pill-labels">
                    <span className="hak-pill-label" style={{ color: active ? '#fff' : textMuted }}>{t.nav[id]}</span>
                    <span className="hak-pill-label-hover">{t.nav[id]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block relative" ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer" style={{ background: isDark ? 'rgba(120,170,255,0.08)' : 'rgba(37,99,235,0.06)', color: textMuted }}>
                <RiGlobalLine size={14} /><span>{loc === 'zh-CN' ? '简体' : loc === 'zh-TW' ? '繁體' : 'EN'}</span>
                <RiArrowDownSLine size={13} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden shadow-2xl" style={{ background: surface, border: `1px solid ${border}` }}>
                  {([{ code: 'zh-CN', label: '简体中文', sub: 'Simplified' }, { code: 'zh-TW', label: '繁體中文', sub: 'Traditional' }, { code: 'en', label: 'English', sub: 'English' }] as { code: Locale; label: string; sub: string }[]).map(({ code, label, sub }) => (
                    <button key={code} onClick={() => { setLocale(code); localStorage.setItem('preferred-locale', code); setLangOpen(false); }} className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors cursor-pointer" style={{ background: loc === code ? `${primary}14` : 'transparent' }}>
                      <div><p className="text-sm font-medium" style={{ color: loc === code ? sky : textBase }}>{label}</p><p className="text-xs" style={{ color: textMuted }}>{sub}</p></div>
                      {loc === code && <RiCheckLine size={14} style={{ color: sky }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center transition-all cursor-pointer" style={{ background: isDark ? 'rgba(120,170,255,0.08)' : 'rgba(37,99,235,0.06)', color: textMuted }}>
              {isDark ? <RiSunLine size={15} /> : <RiMoonLine size={15} />}
            </button>
            <button onClick={onEnter} className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-transform cursor-pointer" style={{ background: `linear-gradient(135deg, ${primary}, ${sky})`, boxShadow: `0 4px 14px ${primary}40` }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {t.hero.ctaPrimary} <RiArrowRightLine size={15} />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg cursor-pointer" style={{ color: textMuted }}>{mobileOpen ? <RiCloseLine size={20} /> : <RiMenuLine size={20} />}</button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden rounded-b-2xl px-4 pb-4 pt-2 border-t" style={{ background: surface, borderColor: border }}>
            {PAGES.map(({ id, accent }) => {
              const Ic = NAV_ICONS[id];
              return (
                <button key={id} onClick={() => go(id)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium cursor-pointer mb-1" style={{ color: page === id ? accent : textMuted, background: page === id ? `${accent}12` : 'transparent' }}>
                  <Ic size={17} /> {t.nav[id]}
                </button>
              );
            })}
            <div className="flex items-center gap-2 mt-2">
              {([{ code: 'zh-CN', label: '简体' }, { code: 'zh-TW', label: '繁體' }, { code: 'en', label: 'EN' }] as { code: Locale; label: string }[]).map(({ code, label }) => (
                <button key={code} onClick={() => { setLocale(code); localStorage.setItem('preferred-locale', code); }} className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: loc === code ? `${primary}14` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'), color: loc === code ? sky : textMuted }}>{label}</button>
              ))}
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: textMuted }}>{isDark ? <RiSunLine size={15} /> : <RiMoonLine size={15} />}</button>
            </div>
            <button onClick={() => { onEnter(); setMobileOpen(false); }} className="w-full mt-3 py-3 rounded-xl text-white font-semibold text-sm cursor-pointer" style={{ background: `linear-gradient(135deg, ${primary}, ${sky})` }}>{t.hero.ctaPrimary}</button>
          </div>
        )}
      </nav>

      {/* ══ PAGE CONTENT (switches on nav click) ══ */}
      <main key={page} className="hak-page relative" style={{ zIndex: 1 }}>

        {/* ─── HOME ─── */}
        {page === 'home' && (
          <section className="min-h-screen flex items-center pt-28 pb-16 px-5">
            <div className="max-w-4xl mx-auto w-full text-center">
              <div className="hak-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-9 border" style={{ borderColor: `${primary}33`, color: sky, background: `${primary}0E`, animationDelay: '0ms' }}>
                <RiNodeTree size={13} /> {t.hero.badge}
              </div>
              <h1 className="hak-up font-bold mb-7" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(2.7rem, 7vw, 5rem)', lineHeight: 1.08, animationDelay: '90ms' }}>
                <span style={{ color: textBase }}>{t.hero.h1a}</span><span className="hak-grad">{t.hero.h1grad}</span>
              </h1>
              <p className="hak-up mx-auto max-w-2xl text-lg leading-relaxed mb-5" style={{ color: textMuted, animationDelay: '180ms' }}>{t.hero.sub}</p>
              <p className="hak-up mx-auto max-w-2xl text-[15px] leading-relaxed mb-9 italic" style={{ color: textBase, opacity: 0.85, fontFamily: 'Crimson Pro, Georgia, serif', animationDelay: '250ms' }}>“{t.hero.mission}”</p>
              <div className="hak-up flex flex-wrap items-center justify-center gap-3 mb-12" style={{ animationDelay: '330ms' }}>
                <button onClick={onEnter} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-transform cursor-pointer" style={{ background: `linear-gradient(135deg, ${primary}, ${sky})`, boxShadow: `0 10px 30px ${primary}45` }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                  {t.hero.ctaPrimary} <RiArrowRightLine size={17} />
                </button>
                <button onClick={() => go('design')} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[15px] font-semibold transition-all cursor-pointer border" style={{ color: textBase, borderColor: border, background: cardBg }}>
                  {t.hero.ctaSecondary} <RiArrowRightLine size={16} />
                </button>
              </div>
              <div className="hak-up flex flex-wrap items-center justify-center gap-x-6 gap-y-3" style={{ animationDelay: '410ms' }}>
                {[RiChatQuoteLine, RiSearchEyeLine, RiUserVoiceLine, RiBookOpenLine].map((Icon, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: textMuted }}>
                    <Icon size={15} style={{ color: sky }} /> {t.hero.chips[i]}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── DESIGN PHILOSOPHY ─── */}
        {page === 'design' && (
          <section className="min-h-screen pt-32 pb-20 px-5">
            <div className="max-w-5xl mx-auto">
              <Header eyebrow={t.principles.eyebrow} title={t.principles.title} sub={t.principles.sub} accent="#2563EB" />
              <FadeIn>
                <div className="rounded-3xl p-9 md:p-11 mb-14 border relative overflow-hidden" style={{ background: cardBg, borderColor: border }}>
                  <RiDoubleQuotesL size={72} className="absolute -top-2 -left-1" style={{ color: primary, opacity: 0.08 }} />
                  <p className="text-xs font-bold tracking-[0.2em] mb-4" style={{ color: sky }}>{t.tension.eyebrow}</p>
                  <h3 className="font-bold mb-5" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(1.5rem, 3.2vw, 2.3rem)', color: textBase, lineHeight: 1.18 }}>{t.tension.title}</h3>
                  <p className="text-[17px] leading-relaxed max-w-3xl" style={{ color: textMuted }}>{t.tension.body}</p>
                  <p className="mt-5 text-[13px] leading-relaxed pl-4 border-l-2" style={{ color: textMuted, borderColor: `${primary}55`, opacity: 0.85 }}>{t.tension.foot}</p>
                </div>
              </FadeIn>
              <div className="grid md:grid-cols-3 gap-6">
                {t.principles.items.map((p: any, i: number) => {
                  const Icon = PRINCIPLE_ICONS[i];
                  return (
                    <FadeIn key={i} delay={i * 100}>
                      <SpotlightCard className="h-full rounded-3xl p-7 border" style={{ background: cardBg, borderColor: border }}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${primary}14`, color: sky }}><Icon size={24} /></div>
                        <div className="text-5xl font-bold leading-none mb-3 select-none" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: `${primary}26` }}>0{i + 1}</div>
                        <h3 className="font-bold text-lg mb-2.5" style={{ color: textBase }}>{p.title}</h3>
                        <p className="text-sm leading-relaxed mb-4" style={{ color: textMuted }}>{p.body}</p>
                        <p className="text-[11px] font-medium pt-3 border-t" style={{ color: textMuted, borderColor: border, opacity: 0.85 }}>{p.source}</p>
                      </SpotlightCard>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── LEARNING PHILOSOPHY ─── */}
        {page === 'learning' && (
          <section className="min-h-screen pt-32 pb-20 px-5">
            <div className="max-w-4xl mx-auto">
              <Header eyebrow={t.foundation.eyebrow} title={t.foundation.title} sub={t.foundation.sub} accent="#3B82F6" />
              <div>
                {t.foundation.points.map((pt: any, i: number) => {
                  const Icon = FOUNDATION_ICONS[i];
                  return (
                    <FadeIn key={i} delay={Math.min(i, 5) * 45}>
                      <div className="flex gap-5 py-6 border-b" style={{ borderColor: border }}>
                        <div className="flex-shrink-0 flex items-start gap-3">
                          <span className="text-sm font-mono pt-1.5" style={{ color: sky, opacity: 0.6 }}>{String(i + 1).padStart(2, '0')}</span>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primary}12`, color: sky }}><Icon size={20} /></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1.5" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: textBase }}>{pt.claim}</h3>
                          <p className="text-[15px] leading-relaxed mb-1.5" style={{ color: textMuted }}>{pt.body}</p>
                          <p className="text-xs font-medium" style={{ color: sky, opacity: 0.9 }}>{pt.source}</p>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── PLATFORM FEATURES ─── */}
        {page === 'features' && (
          <section className="min-h-screen pt-32 pb-20 px-5">
            <div className="max-w-6xl mx-auto">
              <Header eyebrow={t.features.eyebrow} title={t.features.title} sub={t.features.sub} accent="#38BDF8" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
                {t.features.items.map((f: any, i: number) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <FadeIn key={i} delay={(i % 3) * 90}>
                      <SpotlightCard className="h-full rounded-2xl p-6 border" style={{ background: surface, borderColor: border }}>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${primary}1F, ${sky}12)`, color: sky, border: `1px solid ${primary}26` }}><Icon size={22} /></div>
                        <h3 className="font-bold text-base mb-2" style={{ color: textBase }}>{f.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{f.desc}</p>
                      </SpotlightCard>
                    </FadeIn>
                  );
                })}
              </div>
              <FadeIn><h3 className="font-bold text-center mb-12" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(1.5rem, 3.4vw, 2.3rem)', color: textBase }}>{t.roles.title}</h3></FadeIn>
              <div className="grid md:grid-cols-3 gap-6">
                {t.roles.items.map((r: any, i: number) => {
                  const Icon = ROLE_ICONS[i];
                  return (
                    <FadeIn key={i} delay={i * 100}>
                      <div className="h-full rounded-3xl p-7 border text-center" style={{ background: cardBg, borderColor: border }}>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `linear-gradient(135deg, ${primary}, ${sky})`, color: '#fff', boxShadow: `0 8px 22px ${primary}40` }}><Icon size={26} /></div>
                        <h3 className="font-bold text-lg mb-1" style={{ color: textBase }}>{r.title}</h3>
                        <p className="text-xs font-semibold mb-3" style={{ color: sky }}>{r.tag}</p>
                        <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{r.desc}</p>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── Shared CTA band ─── */}
        <div className="px-5 pb-20">
          <div className="max-w-4xl mx-auto rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden border" style={{ background: isDark ? 'linear-gradient(135deg, rgba(11,36,71,0.6), rgba(56,189,248,0.1))' : 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(56,189,248,0.06))', borderColor: `${primary}33` }}>
            <RiSeedlingLine size={120} className="absolute -bottom-6 -right-4" style={{ color: primary, opacity: 0.1 }} />
            <h2 className="font-bold mb-4 relative" style={{ fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 'clamp(1.7rem, 3.8vw, 2.7rem)', color: textBase, lineHeight: 1.18 }}>{t.cta.title}</h2>
            <p className="text-base mb-8 relative" style={{ color: textMuted }}>{t.cta.desc}</p>
            <button onClick={onEnter} className="relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white transition-transform cursor-pointer" style={{ background: `linear-gradient(135deg, ${primary}, ${sky})`, boxShadow: `0 12px 34px ${primary}50` }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              {t.cta.button} <RiArrowRightUpLine size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="relative py-12 px-5 border-t" style={{ zIndex: 1, borderColor: border }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${navy}, ${sky})` }}><RiBrainLine size={16} className="text-white" /></div>
            <div>
              <p className="font-semibold text-sm" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: textBase }}>{t.brand}</p>
              <p className="text-xs" style={{ color: textMuted }}>{t.footer.tagline}</p>
            </div>
          </div>
          <div className="md:text-right">
            <p className="text-xs max-w-md leading-relaxed mb-1" style={{ color: textMuted, opacity: 0.8 }}>{t.footer.ethics}</p>
            <p className="text-xs" style={{ color: textMuted }}>{t.footer.copy}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
