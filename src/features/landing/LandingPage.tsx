import React, { useState, useEffect, useRef } from 'react';
import {
  Users, ArrowRight, Sun, Moon, BrainCircuit, BarChart3, Globe2, Sparkles,
  BookOpen, Share2, Search, Zap, Layout, GraduationCap, CheckCircle2,
  MessageCircle, Eye, Lightbulb, Play, MonitorPlay, ChevronRight, Hash,
  ArrowUpRight, Command, Cpu, Network, ShieldCheck, X
} from 'lucide-react';
import { Locale, Theme } from '@/types';

interface LandingPageProps {
  onEnter: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const TRANSLATIONS = {
  'zh-CN': {
    brand: 'EduTech_Pro',
    nav_product: '产品',
    nav_method: '方法论',

    hero_badge: '全新发布 v2.4 智能引擎',
    hero_title_1: '重塑',
    hero_title_2: '探究式学习',
    hero_desc: '不仅是 AI 答疑，更是苏格拉底式的思维引导。构建“学生-AI-教师”三元协同的下一代教育基础设施。',
    btn_start: '免费开始',
    btn_demo: '预约演示',

    bento_1_title: '深度知识图谱',
    bento_1_desc: '基于数亿学术文献构建的知识网络，不仅提供答案，更展示知识点之间的逻辑关联。',
    bento_2_title: '苏格拉底 AI',
    bento_2_desc: '拒绝直接灌输。通过反问、启发与引导，培养学生的批判性思维与元认知能力。',
    bento_3_title: '实时教学看板',
    bento_3_desc: '教师端上帝视角，实时监控班级学习状态与思维路径。',
    bento_4_title: '全球互联',
    bento_4_desc: '跨语言、跨学科的学术协作网络。',

    stats_title: '以数据定义效果',
    stat_1_val: '94%',
    stat_1_label: '概念留存率提升',
    stat_2_val: '2.5x',
    stat_2_label: '深度思考时长',
    stat_3_val: '10M+',
    stat_3_label: '知识节点连接',

    footer_copy: '© 2026 ICET Lab. 保留所有权利。',
  },
  'zh-TW': {
    brand: 'EduTech_Pro',
    nav_product: '產品',
    nav_method: '方法論',

    hero_badge: '全新發佈 v2.4 智能引擎',
    hero_title_1: '重塑',
    hero_title_2: '探究式學習',
    hero_desc: '不僅是 AI 答疑，更是蘇格拉底式的思維引導。構建“學生-AI-教師”三元協同的下一代教育基礎設施。',
    btn_start: '免費開始',
    btn_demo: '預約演示',

    bento_1_title: '深度知識圖譜',
    bento_1_desc: '基於數億學術文獻構建的知識網絡，不僅提供答案，更展示知識點之間的邏輯關聯。',
    bento_2_title: '蘇格拉底 AI',
    bento_2_desc: '拒絕直接灌輸。通過反問、啟發與引導，培養學生的批判性思維與元認知能力。',
    bento_3_title: '實時教學看板',
    bento_3_desc: '教師端上帝視角，實時監控班級學習狀態與思維路徑。',
    bento_4_title: '全球互聯',
    bento_4_desc: '跨語言、跨學科的學術協作網絡。',

    stats_title: '以數據定義效果',
    stat_1_val: '94%',
    stat_1_label: '概念留存率提升',
    stat_2_val: '2.5x',
    stat_2_label: '深度思考時長',
    stat_3_val: '10M+',
    stat_3_label: '知識節點連接',

    footer_copy: '© 2026 ICET Lab. 保留所有權利。',
  },
  'en': {
    brand: 'EduTech_Pro',
    nav_product: 'Product',
    nav_method: 'Methodology',

    hero_badge: 'Introducing v2.4 Intelligence Engine',
    hero_title_1: 'Reinventing',
    hero_title_2: 'Inquiry-Based Learning',
    hero_desc: 'More than just AI Q&A. A Socratic reasoning engine that builds the next generation of educational infrastructure connecting Student, AI, and Teacher.',
    btn_start: 'Start Free',
    btn_demo: 'Book Demo',

    bento_1_title: 'Deep Knowledge Graph',
    bento_1_desc: 'Built on millions of academic papers. We don\'t just give answers; we map the logic between concepts.',
    bento_2_title: 'Socratic AI',
    bento_2_desc: 'Refusing direct instruction. Fostering critical thinking through recursive questioning and guidance.',
    bento_3_title: 'Live Teacher Dashboard',
    bento_3_desc: 'God-mode view for educators to monitor cognitive pathways in real-time.',
    bento_4_title: 'Global Mesh',
    bento_4_desc: 'Cross-lingual, cross-disciplinary academic collaboration.',

    stats_title: 'Defined by Data',
    stat_1_val: '94%',
    stat_1_label: 'Retention Uplift',
    stat_2_val: '2.5x',
    stat_2_label: 'Deep Thinking Time',
    stat_3_val: '10M+',
    stat_3_label: 'Knowledge Nodes',

    footer_copy: '© 2026 ICET Lab. All rights reserved.',
  }
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, locale, setLocale, theme, setTheme }) => {
  const t = TRANSLATIONS[locale];
  const isDark = theme === 'dark';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pro Max UI Components
  const FloatingNavbar = () => (
    <nav className={`fixed top-6 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'translate-y-0 px-4' : 'translate-y-2 px-6'}`}>
      <div className={`
        relative flex items-center justify-between p-2 rounded-full border shadow-xl backdrop-blur-xl transition-all duration-500
        ${isDark
          ? 'bg-[#0F172A]/80 border-white/10 shadow-black/20 w-full max-w-5xl'
          : 'bg-white/90 border-slate-200/60 shadow-slate-200/40 w-full max-w-6xl'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <BrainCircuit size={16} />
          </div>
          <span className={`font-bold tracking-tight text-sm hidden sm:block ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.brand}</span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-full">
          {[t.nav_product, t.nav_method].map((item, i) => (
            <a key={i} href="#" className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {item}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-2">
          <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-white/10 mr-2">
            <button
              onClick={() => setLocale(locale === 'en' ? 'zh-CN' : (locale === 'zh-CN' ? 'zh-TW' : 'en'))}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              {locale === 'en' ? 'EN' : (locale === 'zh-CN' ? '简' : '繁')}
            </button>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10 text-amber-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <button onClick={onEnter} className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95">
            {t.btn_start}
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden transition-colors duration-500
      ${isDark ? 'bg-[#020617] text-white' : 'bg-[#F1F5F9] text-slate-900'}
    `}>
      <FloatingNavbar />

      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 mix-blend-screen animate-float
            ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'}
         `}></div>
        <div className={`absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 mix-blend-screen animate-float-delayed
            ${isDark ? 'bg-blue-900' : 'bg-blue-200'}
         `}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>


      {/* --- HERO SECTION: Linear Style --- */}
      <section className="relative pt-48 pb-24 px-6 flex flex-col items-center text-center z-10">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest mb-8 animate-fade-up
            ${isDark ? 'bg-white/5 border-white/10 text-indigo-300' : 'bg-white/60 border-slate-200 text-indigo-600'}
         `}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          {t.hero_badge}
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.05] animate-fade-up delay-100 max-w-5xl">
          <span className={`bg-clip-text text-transparent bg-gradient-to-b ${isDark ? 'from-white to-slate-400' : 'from-slate-900 to-slate-500'}`}>
            {t.hero_title_1}
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-500 to-purple-500 animate-shimmer-text">
            {t.hero_title_2}
          </span>
        </h1>

        <p className={`text-lg md:text-xl max-w-2xl mb-10 leading-relaxed animate-fade-up delay-200
             ${isDark ? 'text-slate-400' : 'text-slate-500'}
         `}>
          {t.hero_desc}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
          <button onClick={onEnter} className="h-12 px-8 rounded-full bg-white text-black hover:bg-slate-200 font-bold text-sm transition-all hover:scale-105 flex items-center gap-2">
            {t.btn_start} <ArrowRight size={16} />
          </button>
          <button className={`h-12 px-8 rounded-full border font-bold text-sm transition-all hover:bg-white/5 flex items-center gap-2
               ${isDark ? 'border-white/10 text-white' : 'border-slate-300 text-slate-700'}
            `}>
            <MonitorPlay size={16} /> {t.btn_demo}
          </button>
        </div>
      </section>

      {/* --- BENTO GRID SHOWCASE --- */}
      <section className="px-6 pb-32 max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 h-auto md:h-[600px]">

          {/* Card 1: Large Span (Knowledge Graph) */}
          <div className={`md:col-span-2 row-span-2 rounded-[2rem] p-8 md:p-12 relative overflow-hidden group border transition-all duration-500 hover:shadow-2xl
                 ${isDark ? 'bg-[#0B101E] border-white/5 hover:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-indigo-200'}
             `}>
            <div className="relative z-10 h-full flex flex-col pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6">
                <Network size={24} />
              </div>
              <h3 className="text-3xl font-bold mb-4 drop-shadow-lg">{t.bento_1_title}</h3>
              <p className={`max-w-md text-lg drop-shadow-md ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t.bento_1_desc}</p>
            </div>

            {/* Decorative BG - Image */}
            <div className="absolute inset-0 z-0">
              <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-[#0B101E] via-[#0B101E]/80 to-transparent' : 'from-white via-white/80 to-transparent'} z-10`}></div>
              <img
                src="/knowledge-graph.png"
                className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-1000"
                alt="Knowledge Graph"
              />
            </div>
          </div>

          {/* Card 2: Socratic AI */}
          <div className={`rounded-[2rem] p-8 relative overflow-hidden group border transition-all duration-500 hover:-translate-y-1
                 ${isDark ? 'bg-[#0B101E] border-white/5 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:border-emerald-200'}
             `}>
            <div className="relative z-10 pointer-events-none">
              <h3 className="text-xl font-bold mb-2 drop-shadow-md">{t.bento_2_title}</h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.bento_2_desc}</p>
            </div>

            {/* Image BG */}
            <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500">
              <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#0B101E] to-transparent' : 'from-white to-transparent'} z-10`}></div>
              <img
                src="/socratic-ai.png"
                className="object-cover w-full h-full group-hover:rotate-3 transition-transform duration-700"
                alt="Socratic AI"
              />
            </div>
          </div>

          {/* Card 3: Dashboard */}
          <div className={`rounded-[2rem] p-8 relative overflow-hidden group border transition-all duration-500 hover:-translate-y-1
                 ${isDark ? 'bg-[#0B101E] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-200 hover:border-orange-200'}
             `}>
            <div className="relative z-10 pointer-events-none">
              <h3 className="text-xl font-bold mb-2 drop-shadow-md">{t.bento_3_title}</h3>
              <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.bento_3_desc}</p>
            </div>

            {/* Image BG */}
            <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500">
              <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#0B101E] to-transparent' : 'from-white to-transparent'} z-10`}></div>
              <img
                src="/teacher-dashboard.png"
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                alt="Dashboard"
              />
            </div>
          </div>

        </div>
      </section>

      {/* --- STATS --- */}
      <section className="py-24 border-y border-dashed relative overflow-hidden bg-slate-50 dark:bg-[#050914] border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img src="/global-mesh.png" className="w-full h-full object-cover opacity-30" alt="Global Mesh" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-xl font-bold uppercase tracking-widest opacity-50 mb-16">{t.stats_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { val: t.stat_1_val, label: t.stat_1_label },
              { val: t.stat_2_val, label: t.stat_2_label },
              { val: t.stat_3_val, label: t.stat_3_label },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-6xl md:text-7xl font-bold font-heading mb-4 bg-clip-text text-transparent bg-gradient-to-b from-indigo-500 to-blue-600">
                  {stat.val}
                </span>
                <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 bg-transparent text-center">
        <div className="flex items-center justify-center gap-2 mb-8 opacity-50">
          <BrainCircuit size={20} />
          <span className="font-bold">{t.brand}</span>
        </div>
        <p className="text-xs opacity-30">{t.footer_copy}</p>
      </footer>

    </div>
  );
};

export default LandingPage;
