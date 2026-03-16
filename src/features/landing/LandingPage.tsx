import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Sun, Moon, BrainCircuit, Eye, MessageSquare,
  Users, ShieldCheck, BookOpen, ChevronRight, AlertTriangle,
  BarChart2, GitBranch, Microscope, FileText
} from 'lucide-react';
import { Locale, Theme } from '@/types';

interface LandingPageProps {
  onEnter: () => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

// ── Font injection ────────────────────────────────────────────────────────────
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
if (!document.head.querySelector('[href*="Cormorant"]')) document.head.appendChild(fontLink);

// ── Copy ─────────────────────────────────────────────────────────────────────
const T = {
  'zh-CN': {
    brand: 'HAKIF',
    brand_full: '人机知识互动论坛',
    nav_how: '工作原理',
    nav_supervisor: '导师端',
    nav_principles: '设计原则',

    hero_eyebrow: '面向研究型高校的学术督导平台',
    hero_title: '让每位学生的研究进展对导师真正可见',
    hero_sub: '大多数导师在定期会议之间，几乎无法判断学生真实的研究状态——谁卡住了，谁在漂移，谁需要介入。HAKIF 构建了一套以"学生—AI—导师"三元互动为核心的持续督导基础设施。',
    hero_cta: '进入平台',
    hero_cta_2: '了解工作原理',

    problem_label: '核心问题',
    problem_title: '会议之间，研究过程是不可见的',
    problem_1_title: '进展不透明',
    problem_1_desc: '导师依赖例会获取信息。学生在会议上表现"正常"，而真实的卡点、困惑与停滞发生在会议之外。',
    problem_2_title: '干预不及时',
    problem_2_desc: '当导师意识到某位学生需要介入时，往往已经过去了数周甚至数月。高风险状况在可见之前早已形成。',
    problem_3_title: 'AI 使用不受监控',
    problem_3_desc: '学生日益依赖通用AI工具。导师既无法了解这些交互的质量，也无法判断学生是否在独立思考。',

    triad_label: '三元互动模型',
    triad_title: '学生、AI 与导师协同工作，而非相互替代',
    triad_student_title: '学生端',
    triad_student_desc: '在整个研究周期中与AI持续对话：选题、文献综述、理论框架、研究设计、方法论、数据分析、学术写作。',
    triad_ai_title: 'AI 引导层',
    triad_ai_desc: '不直接给出答案。通过苏格拉底式提问——追问假设、引发对比、推动反思——帮助学生形成更严谨的思维，而非替代思考。',
    triad_supervisor_title: '导师监控层',
    triad_supervisor_desc: '实时获取有意义的交互摘要：进展节点、持续性卡点、概念困惑、高风险信号。在需要时精准介入。',

    socratic_label: '苏格拉底式AI引导',
    socratic_title: 'AI 支持思考，而不是替代思考',
    socratic_q1: '你目前假设了什么？这个假设是否经过了检验？',
    socratic_q2: '这个框架与 X 方法相比有什么不同？各自的适用边界在哪里？',
    socratic_q3: '如果这个论点成立，那么在你的数据中会出现什么可以被证伪的预测？',
    socratic_note: 'AI不会主动提供结论性答案。它的设计目标是让学生的推理过程更严谨、更有意识，而非提供捷径。',

    supervisor_label: '导师看板',
    supervisor_title: '持续的研究进展可见性',
    supervisor_desc: '导师不需要等待例会才能了解班级动态。以下信息持续更新：',
    supervisor_f1: '哪些学生在过去两周内进展停滞',
    supervisor_f2: '哪些概念困惑反复出现但未得到解决',
    supervisor_f3: '哪些学生对AI的依赖程度超出正常范围',
    supervisor_f4: '哪些情况需要在下次会议前紧急介入',
    supervisor_intervention: '导师可以直接在对话中注入有针对性的指导，无需另行安排会议。',

    boundary_label: '设计原则与边界',
    boundary_title: '这个平台明确拒绝做什么',
    boundary_1_title: '不是代写工具',
    boundary_1_desc: 'AI不会为学生起草论文段落、生成结论或完成任何可提交的学术写作。',
    boundary_2_title: '不替代导师',
    boundary_2_desc: '平台的作用是让督导关系更有质量，而不是用AI模拟或取代导师的学术判断。',
    boundary_3_title: '不是通用聊天机器人',
    boundary_3_desc: 'AI的交互模式专门针对学术研究流程设计，不是开放域问答，不是信息检索工具。',
    boundary_4_title: '透明性是默认值',
    boundary_4_desc: '所有学生与AI的交互对导师可见。不存在导师无法查看的私密对话。',

    rag_label: '未来方向',
    rag_title: '基于可信学术来源的知识增强',
    rag_desc: '我们正在探索将高质量学科文献库与AI引导层集成，以提升回应的来源可靠性，减少信息失实风险。这一方向目前处于研究阶段，我们不会对其可靠性作出超出实证依据的声称。',
    rag_note: '该功能尚未上线。我们会在有充分验证后再向用户发布。',

    cta_title: '为您的研究督导工作引入持续可见性',
    cta_desc: '适用于研究生院、导师团队与学术研究机构。',
    cta_btn: '申请访问',
    cta_btn2: '预约演示',

    footer_copy: '© 2026 ICET Lab · HAKIF 人机知识互动研究平台',
    footer_note: '本平台为学术研究工具，不适用于K-12或职业培训场景。',
  },

  'en': {
    brand: 'HAKIF',
    brand_full: 'Human–AI Knowledge Interaction Forum',
    nav_how: 'How It Works',
    nav_supervisor: 'Supervisor View',
    nav_principles: 'Design Principles',

    hero_eyebrow: 'Academic supervision infrastructure for research institutions',
    hero_title: 'Make each student\'s research process genuinely visible to their supervisor',
    hero_sub: 'Most supervisors have almost no continuous view of a student\'s real research state between scheduled meetings — who is stuck, who is drifting, who needs intervention. HAKIF builds a triadic student–AI–supervisor infrastructure for continuous supervision.',
    hero_cta: 'Enter Platform',
    hero_cta_2: 'See How It Works',

    problem_label: 'The Core Problem',
    problem_title: 'Between meetings, the research process is invisible',
    problem_1_title: 'Progress is opaque',
    problem_1_desc: 'Supervisors rely on scheduled meetings for information. Students appear fine in meetings while genuine bottlenecks, confusion, and stagnation occur between them.',
    problem_2_title: 'Intervention comes too late',
    problem_2_desc: 'By the time a supervisor recognises a student needs help, weeks or months may have passed. High-risk situations form long before they become visible.',
    problem_3_title: 'AI use is unmonitored',
    problem_3_desc: 'Students increasingly use general AI tools. Supervisors have no view of interaction quality, depth of engagement, or whether students are developing independent thinking.',

    triad_label: 'Triadic Interaction Model',
    triad_title: 'Student, AI, and Supervisor working together — not replacing each other',
    triad_student_title: 'Student Layer',
    triad_student_desc: 'Continuous AI-supported dialogue across the full research cycle: topic refinement, literature review, theoretical framing, research design, methodology, data analysis, academic writing.',
    triad_ai_title: 'AI Guidance Layer',
    triad_ai_desc: 'Not an answer engine. Through Socratic questioning — surfacing assumptions, prompting comparison, pushing reflection — the AI supports rigorous thinking rather than replacing it.',
    triad_supervisor_title: 'Supervisor Monitoring Layer',
    triad_supervisor_desc: 'Real-time access to meaningful interaction summaries: progress nodes, persistent bottlenecks, recurring conceptual confusion, high-risk signals. Targeted intervention when needed.',

    socratic_label: 'Socratic AI Guidance',
    socratic_title: 'The AI supports thinking, it does not replace it',
    socratic_q1: 'What assumptions are you currently making? Have they been tested against the literature?',
    socratic_q2: 'How does this framework differ from approach X? Where does each break down?',
    socratic_q3: 'If this argument holds, what falsifiable prediction would appear in your data?',
    socratic_note: 'The AI does not provide conclusive answers. It is designed to make the student\'s reasoning process more rigorous and more conscious — not to provide shortcuts.',

    supervisor_label: 'Supervisor Dashboard',
    supervisor_title: 'Continuous visibility into research progress',
    supervisor_desc: 'Supervisors do not need to wait for scheduled meetings to understand cohort dynamics. The following are continuously updated:',
    supervisor_f1: 'Which students have shown no meaningful progress in the past two weeks',
    supervisor_f2: 'Which conceptual confusions recur without resolution',
    supervisor_f3: 'Which students show signs of over-reliance on AI',
    supervisor_f4: 'Which situations require urgent intervention before the next meeting',
    supervisor_intervention: 'Supervisors can inject targeted guidance directly into a conversation thread, without scheduling a separate meeting.',

    boundary_label: 'Design Principles & Boundaries',
    boundary_title: 'What this platform explicitly refuses to do',
    boundary_1_title: 'Not a writing tool',
    boundary_1_desc: 'The AI will not draft thesis paragraphs, generate conclusions, or complete any submittable academic writing on behalf of students.',
    boundary_2_title: 'Not a replacement for supervisors',
    boundary_2_desc: 'The platform exists to improve the quality of supervisory relationships, not to simulate or substitute for a supervisor\'s academic judgement.',
    boundary_3_title: 'Not a general chatbot',
    boundary_3_desc: 'The AI\'s interaction mode is purpose-built for academic research workflows. It is not an open-domain Q&A tool or a general information retrieval interface.',
    boundary_4_title: 'Transparency by default',
    boundary_4_desc: 'All student–AI interactions are visible to the supervising instructor. There are no private conversation threads that supervisors cannot access.',

    rag_label: 'Future Direction',
    rag_title: 'Knowledge grounding from trusted academic sources',
    rag_desc: 'We are exploring integration of high-quality discipline-specific literature corpora with the AI guidance layer, to improve source reliability and reduce the risk of unsupported claims. This direction is currently in a research phase. We make no claims about accuracy that exceed the available empirical evidence.',
    rag_note: 'This feature is not yet available. We will release it only after sufficient validation.',

    cta_title: 'Bring continuous visibility to your research supervision',
    cta_desc: 'Built for graduate schools, supervisory teams, and academic research units.',
    cta_btn: 'Request Access',
    cta_btn2: 'Book a Demo',

    footer_copy: '© 2026 ICET Lab · HAKIF Human–AI Knowledge Interaction Platform',
    footer_note: 'This platform is designed for academic research supervision. It is not intended for K–12 or vocational training contexts.',
  },

  'zh-TW': {
    brand: 'HAKIF',
    brand_full: '人機知識互動論壇',
    nav_how: '運作原理',
    nav_supervisor: '導師端',
    nav_principles: '設計原則',

    hero_eyebrow: '面向研究型高校的學術督導平台',
    hero_title: '讓每位學生的研究進展對導師真正可見',
    hero_sub: '大多數導師在定期會議之間，幾乎無法判斷學生真實的研究狀態——誰卡住了，誰在漂移，誰需要介入。HAKIF 構建了一套以「學生—AI—導師」三元互動為核心的持續督導基礎設施。',
    hero_cta: '進入平台',
    hero_cta_2: '了解運作原理',

    problem_label: '核心問題',
    problem_title: '會議之間，研究過程是不可見的',
    problem_1_title: '進展不透明',
    problem_1_desc: '導師依賴例會獲取資訊。學生在會議上表現「正常」，而真實的卡點、困惑與停滯發生在會議之外。',
    problem_2_title: '干預不及時',
    problem_2_desc: '當導師意識到某位學生需要介入時，往往已經過去了數週甚至數月。高風險狀況在可見之前早已形成。',
    problem_3_title: 'AI 使用不受監控',
    problem_3_desc: '學生日益依賴通用AI工具。導師既無法了解這些互動的品質，也無法判斷學生是否在獨立思考。',

    triad_label: '三元互動模型',
    triad_title: '學生、AI 與導師協同工作，而非相互替代',
    triad_student_title: '學生端',
    triad_student_desc: '在整個研究周期中與AI持續對話：選題、文獻綜述、理論框架、研究設計、方法論、資料分析、學術寫作。',
    triad_ai_title: 'AI 引導層',
    triad_ai_desc: '不直接給出答案。透過蘇格拉底式提問——追問假設、引發對比、推動反思——幫助學生形成更嚴謹的思維，而非替代思考。',
    triad_supervisor_title: '導師監控層',
    triad_supervisor_desc: '即時獲取有意義的互動摘要：進展節點、持續性卡點、概念困惑、高風險訊號。在需要時精準介入。',

    socratic_label: '蘇格拉底式AI引導',
    socratic_title: 'AI 支持思考，而不是替代思考',
    socratic_q1: '你目前假設了什麼？這個假設是否經過了檢驗？',
    socratic_q2: '這個框架與 X 方法相比有什麼不同？各自的適用邊界在哪裡？',
    socratic_q3: '如果這個論點成立，那麼在你的資料中會出現什麼可以被證偽的預測？',
    socratic_note: 'AI不會主動提供結論性答案。它的設計目標是讓學生的推理過程更嚴謹、更有意識，而非提供捷徑。',

    supervisor_label: '導師看板',
    supervisor_title: '持續的研究進展可見性',
    supervisor_desc: '導師不需要等待例會才能了解班級動態。以下資訊持續更新：',
    supervisor_f1: '哪些學生在過去兩週內進展停滯',
    supervisor_f2: '哪些概念困惑反複出現但未得到解決',
    supervisor_f3: '哪些學生對AI的依賴程度超出正常範圍',
    supervisor_f4: '哪些情況需要在下次會議前緊急介入',
    supervisor_intervention: '導師可以直接在對話中注入有針對性的指導，無需另行安排會議。',

    boundary_label: '設計原則與邊界',
    boundary_title: '這個平台明確拒絕做什麼',
    boundary_1_title: '不是代寫工具',
    boundary_1_desc: 'AI不會為學生起草論文段落、生成結論或完成任何可提交的學術寫作。',
    boundary_2_title: '不替代導師',
    boundary_2_desc: '平台的作用是讓督導關係更有品質，而不是用AI模擬或取代導師的學術判斷。',
    boundary_3_title: '不是通用聊天機器人',
    boundary_3_desc: 'AI的互動模式專門針對學術研究流程設計，不是開放域問答，不是資訊檢索工具。',
    boundary_4_title: '透明性是預設值',
    boundary_4_desc: '所有學生與AI的互動對導師可見。不存在導師無法查看的私密對話。',

    rag_label: '未來方向',
    rag_title: '基於可信學術來源的知識增強',
    rag_desc: '我們正在探索將高品質學科文獻庫與AI引導層集成，以提升回應的來源可靠性，減少資訊失實風險。這一方向目前處於研究階段，我們不會對其可靠性作出超出實證依據的聲稱。',
    rag_note: '該功能尚未上線。我們會在有充分驗證後再向用戶發佈。',

    cta_title: '為您的研究督導工作引入持續可見性',
    cta_desc: '適用於研究生院、導師團隊與學術研究機構。',
    cta_btn: '申請訪問',
    cta_btn2: '預約演示',

    footer_copy: '© 2026 ICET Lab · HAKIF 人機知識互動研究平台',
    footer_note: '本平台為學術研究工具，不適用於K-12或職業培訓場景。',
  }
};

// ── Triadic Model SVG Diagram ─────────────────────────────────────────────────
const TriadicDiagram: React.FC<{ isDark: boolean; t: typeof T['en'] }> = ({ isDark, t }) => {
  const nodeColor = isDark ? '#1E293B' : '#F8FAFC';
  const borderColor = isDark ? '#334155' : '#CBD5E1';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const lineColor = isDark ? '#334155' : '#CBD5E1';
  const accentBlue = '#3B82F6';
  const accentAmber = '#D97706';
  const accentEmerald = '#10B981';

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      <svg viewBox="0 0 720 420" className="w-full" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {/* Connection lines */}
        {/* Student → AI */}
        <line x1="220" y1="200" x2="310" y2="200" stroke={lineColor} strokeWidth="1.5" strokeDasharray="4,3" />
        {/* AI → Supervisor */}
        <line x1="410" y1="200" x2="500" y2="200" stroke={lineColor} strokeWidth="1.5" strokeDasharray="4,3" />
        {/* Student ↔ Supervisor (curved arc above) */}
        <path d="M 220 175 Q 360 80 500 175" fill="none" stroke={accentAmber} strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />

        {/* Arrow heads */}
        <defs>
          <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={lineColor} />
          </marker>
          <marker id="arrowAmber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={accentAmber} opacity="0.5" />
          </marker>
        </defs>
        <line x1="270" y1="200" x2="308" y2="200" stroke={lineColor} strokeWidth="1.5" markerEnd="url(#arrowBlue)" />
        <line x1="450" y1="200" x2="498" y2="200" stroke={lineColor} strokeWidth="1.5" markerEnd="url(#arrowBlue)" />

        {/* Student Node */}
        <rect x="60" y="140" width="160" height="120" rx="12" fill={nodeColor} stroke={accentBlue} strokeWidth="1.5" />
        <circle cx="140" cy="168" r="14" fill={accentBlue} opacity="0.15" />
        <text x="140" y="173" textAnchor="middle" fontSize="11" fill={accentBlue} fontWeight="600">{locale === 'en' ? 'STUDENT' : '学生'}</text>
        <text x="140" y="198" textAnchor="middle" fontSize="10" fill={textSecondary} style={{ whiteSpace: 'pre-wrap' }}>
          <tspan x="140" dy="0">{locale === 'en' ? 'Research dialogue' : '研究对话'}</tspan>
          <tspan x="140" dy="16">{locale === 'en' ? 'across full cycle' : '贯穿研究全程'}</tspan>
        </text>
        <rect x="88" y="230" width="104" height="18" rx="4" fill={accentBlue} opacity="0.1" />
        <text x="140" y="243" textAnchor="middle" fontSize="9" fill={accentBlue}>{locale === 'en' ? 'Active participant' : '主动参与者'}</text>

        {/* AI Node */}
        <rect x="270" y="130" width="180" height="140" rx="12" fill={nodeColor} stroke={accentEmerald} strokeWidth="1.5" />
        <text x="360" y="162" textAnchor="middle" fontSize="11" fill={accentEmerald} fontWeight="600">{locale === 'en' ? 'AI GUIDANCE' : 'AI 引导层'}</text>
        <text x="360" y="185" textAnchor="middle" fontSize="10" fill={textSecondary}>
          <tspan x="360" dy="0">{locale === 'en' ? 'Socratic questioning' : '苏格拉底式提问'}</tspan>
          <tspan x="360" dy="16">{locale === 'en' ? 'Not an answer engine' : '非答题机器'}</tspan>
        </text>
        <rect x="300" y="230" width="120" height="18" rx="4" fill={accentEmerald} opacity="0.1" />
        <text x="360" y="243" textAnchor="middle" fontSize="9" fill={accentEmerald}>{locale === 'en' ? 'Mediating layer' : '中介层'}</text>

        {/* Supervisor Node */}
        <rect x="500" y="140" width="160" height="120" rx="12" fill={nodeColor} stroke={accentAmber} strokeWidth="1.5" />
        <text x="580" y="168" textAnchor="middle" fontSize="11" fill={accentAmber} fontWeight="600">{locale === 'en' ? 'SUPERVISOR' : '导师'}</text>
        <text x="580" y="191" textAnchor="middle" fontSize="10" fill={textSecondary}>
          <tspan x="580" dy="0">{locale === 'en' ? 'Monitors progress' : '监控进展'}</tspan>
          <tspan x="580" dy="16">{locale === 'en' ? 'Intervenes precisely' : '精准介入'}</tspan>
        </text>
        <rect x="528" y="230" width="104" height="18" rx="4" fill={accentAmber} opacity="0.1" />
        <text x="580" y="243" textAnchor="middle" fontSize="9" fill={accentAmber}>{locale === 'en' ? 'Visible oversight' : '可见督导'}</text>

        {/* Curved label */}
        <text fontSize="9" fill={accentAmber} opacity="0.6" textAnchor="middle">
          <textPath href="#arc1" startOffset="50%">{locale === 'en' ? 'Supervisory relationship maintained' : '导师关系持续有效'}</textPath>
        </text>
        <path id="arc1" d="M 230 172 Q 360 75 510 172" fill="none" />

        {/* Bottom label */}
        <text x="360" y="390" textAnchor="middle" fontSize="10" fill={textSecondary} opacity="0.6">
          {locale === 'en' ? 'All interactions visible to supervisor · No private AI conversations' : '所有交互对导师可见 · 无私密AI对话'}
        </text>
      </svg>
    </div>
  );
};

// Fake locale ref for SVG — we'll pass it as prop instead
let locale: Locale = 'zh-CN';

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
const DashboardMockup: React.FC<{ isDark: boolean; t: typeof T['en']; isEN: boolean }> = ({ isDark, t, isEN }) => {
  const bg = isDark ? '#0F172A' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';
  const rowBg = isDark ? '#1E293B' : '#F8FAFC';
  const riskRed = '#EF4444';
  const riskAmber = '#F59E0B';
  const riskGreen = '#10B981';

  const rows = isEN ? [
    { name: 'Student A', status: 'No progress · 14 days', risk: 'high', days: '14d' },
    { name: 'Student B', status: 'Methodology unclear', risk: 'medium', days: '6d' },
    { name: 'Student C', status: 'Literature review active', risk: 'low', days: '1d' },
    { name: 'Student D', status: 'High AI reliance detected', risk: 'medium', days: '3d' },
  ] : [
    { name: '学生 A', status: '无进展 · 14天', risk: 'high', days: '14天' },
    { name: '学生 B', status: '方法论不清晰', risk: 'medium', days: '6天' },
    { name: '学生 C', status: '文献综述进行中', risk: 'low', days: '1天' },
    { name: '学生 D', status: '检测到高度AI依赖', risk: 'medium', days: '3天' },
  ];

  const riskColor = (r: string) => r === 'high' ? riskRed : r === 'medium' ? riskAmber : riskGreen;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="w-3 h-3 rounded-full" style={{ background: riskRed, opacity: 0.7 }} />
        <div className="w-3 h-3 rounded-full" style={{ background: riskAmber, opacity: 0.7 }} />
        <div className="w-3 h-3 rounded-full" style={{ background: riskGreen, opacity: 0.7 }} />
        <span className="ml-3 text-xs" style={{ color: textMuted, fontFamily: 'JetBrains Mono, monospace' }}>
          {isEN ? 'Supervisor Dashboard · Research Cohort 2025' : '导师看板 · 2025级研究生组'}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px" style={{ borderBottom: `1px solid ${border}`, background: border }}>
        {(isEN ? [
          { label: 'Needs attention', val: '2', color: riskRed },
          { label: 'Monitor', val: '2', color: riskAmber },
          { label: 'On track', val: '1', color: riskGreen },
        ] : [
          { label: '需关注', val: '2', color: riskRed },
          { label: '需监控', val: '2', color: riskAmber },
          { label: '进展正常', val: '1', color: riskGreen },
        ]).map((s, i) => (
          <div key={i} className="flex flex-col items-center py-4" style={{ background: bg }}>
            <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Manrope, sans-serif' }}>{s.val}</span>
            <span className="text-xs mt-1" style={{ color: textMuted }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="p-4 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: rowBg }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: riskColor(row.risk) }} />
            <span className="text-sm font-medium flex-shrink-0 w-20" style={{ color: textPrimary }}>{row.name}</span>
            <span className="text-xs flex-1" style={{ color: textMuted }}>{row.status}</span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: riskColor(row.risk) + '20', color: riskColor(row.risk), fontFamily: 'JetBrains Mono, monospace' }}>{row.days}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: isDark ? '#1E3A5F' : '#EFF6FF', border: `1px solid ${isDark ? '#2563EB30' : '#BFDBFE'}` }}>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <span className="text-xs" style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>
            {isEN ? 'Supervisor intervention injected into Student A thread · 2h ago' : '导师已向学生A对话注入指导 · 2小时前'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const LandingPage: React.FC<LandingPageProps> = ({ onEnter, locale: localeProp, setLocale, theme, setTheme }) => {
  locale = localeProp;
  const t = T[localeProp] as typeof T['en'];
  const isDark = theme === 'dark';
  const isEN = localeProp === 'en';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Style tokens
  const bg = isDark ? 'bg-[#060E1E]' : 'bg-[#F8FAFC]';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const cardBg = isDark ? 'bg-slate-900/60' : 'bg-white';
  const sectionBorder = isDark ? 'border-slate-800/60' : 'border-slate-200';

  return (
    <div
      className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${bg} ${textPrimary}`}
      style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}
    >
      {/* Ambient glow — restrained */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/3 w-[800px] h-[500px] rounded-full blur-[160px] opacity-[0.06] ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`} />
        <div className={`absolute bottom-1/3 right-0 w-[600px] h-[400px] rounded-full blur-[140px] opacity-[0.05] ${isDark ? 'bg-indigo-700' : 'bg-indigo-300'}`} />
      </div>

      {/* ── NAVIGATION ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? `border-b ${sectionBorder} backdrop-blur-xl ${isDark ? 'bg-[#060E1E]/90' : 'bg-[#F8FAFC]/90'}` : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
              <BrainCircuit size={14} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide">{t.brand}</span>
              <span className={`hidden sm:inline ml-2 text-xs ${textMuted}`}>· {t.brand_full}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {[t.nav_how, t.nav_supervisor, t.nav_principles].map((item, i) => (
              <a key={i} href={`#section-${i}`} className={`text-xs font-medium transition-colors hover:text-blue-500 ${textMuted}`}>{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(localeProp === 'en' ? 'zh-CN' : localeProp === 'zh-CN' ? 'zh-TW' : 'en')}
              className={`text-xs font-medium px-2.5 py-1 rounded border transition-colors ${borderColor} ${textMuted} hover:text-blue-500`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {localeProp === 'en' ? 'EN' : localeProp === 'zh-CN' ? '简' : '繁'}
            </button>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${textMuted} hover:text-blue-500`}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={onEnter}
              className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              {t.hero_cta}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-40 pb-24 px-6 max-w-6xl mx-auto">
        <div className={`inline-block text-xs font-semibold uppercase tracking-widest mb-6 px-3 py-1.5 rounded border ${borderColor} ${textMuted}`}
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {t.hero_eyebrow}
        </div>

        <h1
          className="text-4xl md:text-6xl font-semibold leading-[1.1] mb-8 max-w-4xl"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '-0.01em' }}
        >
          {t.hero_title}
        </h1>

        <p className={`text-base md:text-lg leading-relaxed max-w-2xl mb-10 ${textMuted}`}>
          {t.hero_sub}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onEnter}
            className="inline-flex items-center gap-2 px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
          >
            {t.hero_cta} <ArrowRight size={15} />
          </button>
          <button
            className={`inline-flex items-center gap-2 px-6 py-3 rounded border text-sm font-medium transition-colors ${borderColor} ${textMuted} hover:text-blue-500`}
          >
            {t.hero_cta_2} <ChevronRight size={14} />
          </button>
        </div>

        {/* Institutional note */}
        <p className={`mt-10 text-xs ${textMuted} flex items-center gap-2`}>
          <ShieldCheck size={12} className="text-blue-500 flex-shrink-0" />
          {isEN ? 'Designed for graduate research supervision. All AI interactions are supervisor-visible by default.' : '专为研究生督导设计。所有AI交互对导师默认可见。'}
        </p>
      </section>

      {/* ── PROBLEM SECTION ── */}
      <section className={`py-24 border-t ${sectionBorder}`} id="section-0">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${textMuted}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {t.problem_label}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 max-w-2xl" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            {t.problem_title}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Eye, title: t.problem_1_title, desc: t.problem_1_desc, accent: 'text-red-400' },
              { icon: AlertTriangle, title: t.problem_2_title, desc: t.problem_2_desc, accent: 'text-amber-400' },
              { icon: MessageSquare, title: t.problem_3_title, desc: t.problem_3_desc, accent: 'text-orange-400' },
            ].map(({ icon: Icon, title, desc, accent }, i) => (
              <div key={i} className={`p-6 rounded-xl border ${borderColor} ${cardBg}`}>
                <Icon size={20} className={`${accent} mb-4`} />
                <h3 className="font-semibold text-base mb-3">{title}</h3>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRIADIC MODEL ── */}
      <section className={`py-24 border-t ${sectionBorder}`} id="section-0b">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${textMuted}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {t.triad_label}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 max-w-2xl" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            {t.triad_title}
          </h2>
          <p className={`text-sm ${textMuted} mb-16 max-w-xl`}>
            {isEN ? 'The platform does not position AI as the primary actor. It positions AI as a structured mediating layer between students doing research and supervisors maintaining oversight.' : '平台不将AI定位为主要行动者。AI是结构化的中介层，连接正在研究的学生与维持监督的导师。'}
          </p>

          <TriadicDiagram isDark={isDark} t={t} />

          {/* Three columns */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { color: 'border-blue-500/40 bg-blue-500/5', accent: 'text-blue-400', label: '01', title: t.triad_student_title, desc: t.triad_student_desc },
              { color: 'border-emerald-500/40 bg-emerald-500/5', accent: 'text-emerald-400', label: '02', title: t.triad_ai_title, desc: t.triad_ai_desc },
              { color: 'border-amber-500/40 bg-amber-500/5', accent: 'text-amber-400', label: '03', title: t.triad_supervisor_title, desc: t.triad_supervisor_desc },
            ].map((col, i) => (
              <div key={i} className={`p-6 rounded-xl border ${col.color}`}>
                <span className={`text-xs font-bold ${col.accent} mb-3 block`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{col.label}</span>
                <h3 className="font-semibold mb-3">{col.title}</h3>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{col.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCRATIC AI ── */}
      <section className={`py-24 border-t ${sectionBorder}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${textMuted}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {t.socratic_label}
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-6" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                {t.socratic_title}
              </h2>
              <p className={`text-sm leading-relaxed ${textMuted}`}>{t.socratic_note}</p>
            </div>

            {/* Example questions */}
            <div className="space-y-4">
              {[t.socratic_q1, t.socratic_q2, t.socratic_q3].map((q, i) => (
                <div key={i} className={`flex gap-4 p-4 rounded-xl border ${borderColor} ${cardBg}`}>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Q</span>
                  </div>
                  <p className={`text-sm leading-relaxed italic ${textMuted}`}>"{q}"</p>
                </div>
              ))}
              <p className={`text-xs ${textMuted} pt-2 pl-1`}>
                {isEN ? '— The AI asks. The student thinks.' : '— AI提问。学生思考。'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUPERVISOR DASHBOARD ── */}
      <section className={`py-24 border-t ${sectionBorder}`} id="section-1">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${textMuted}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {t.supervisor_label}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            {t.supervisor_title}
          </h2>
          <p className={`text-sm ${textMuted} mb-12 max-w-xl`}>{t.supervisor_desc}</p>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-4">
              {[t.supervisor_f1, t.supervisor_f2, t.supervisor_f3, t.supervisor_f4].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{f}</p>
                </div>
              ))}
              <div className={`mt-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5`}>
                <p className={`text-sm leading-relaxed text-blue-400`}>{t.supervisor_intervention}</p>
              </div>
            </div>

            <DashboardMockup isDark={isDark} t={t} isEN={isEN} />
          </div>
        </div>
      </section>

      {/* ── DESIGN PRINCIPLES / BOUNDARIES ── */}
      <section className={`py-24 border-t ${sectionBorder}`} id="section-2">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${textMuted}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {t.boundary_label}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 max-w-2xl" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            {t.boundary_title}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: FileText, title: t.boundary_1_title, desc: t.boundary_1_desc },
              { icon: Users, title: t.boundary_2_title, desc: t.boundary_2_desc },
              { icon: MessageSquare, title: t.boundary_3_title, desc: t.boundary_3_desc },
              { icon: Eye, title: t.boundary_4_title, desc: t.boundary_4_desc },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className={`flex gap-5 p-6 rounded-xl border ${borderColor} ${cardBg}`}>
                <div className="flex-shrink-0 mt-0.5">
                  <Icon size={18} className={textMuted} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-2">{title}</h3>
                  <p className={`text-sm leading-relaxed ${textMuted}`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RAG FUTURE DIRECTION ── */}
      <section className={`py-24 border-t ${sectionBorder}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <div className={`text-xs font-semibold uppercase tracking-widest mb-4 ${textMuted}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {t.rag_label}
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-6" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              {t.rag_title}
            </h2>
            <p className={`text-sm leading-relaxed ${textMuted} mb-6`}>{t.rag_desc}</p>
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className={`text-xs leading-relaxed ${textMuted}`}>{t.rag_note}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={`py-24 border-t ${sectionBorder}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`rounded-2xl p-12 border ${borderColor} ${isDark ? 'bg-slate-900/40' : 'bg-white'} text-center`}>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 max-w-xl mx-auto" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              {t.cta_title}
            </h2>
            <p className={`text-sm ${textMuted} mb-8`}>{t.cta_desc}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onEnter}
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all active:scale-[0.98]"
              >
                {t.cta_btn} <ArrowRight size={15} />
              </button>
              <button
                className={`inline-flex items-center gap-2 px-6 py-3 rounded border text-sm font-medium transition-colors ${borderColor} ${textMuted} hover:text-blue-500`}
              >
                {t.cta_btn2}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={`py-12 border-t ${sectionBorder}`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <BrainCircuit size={12} className="text-white" />
            </div>
            <span className={`text-sm font-semibold`}>{t.brand}</span>
            <span className={`text-xs ${textMuted}`}>· {t.brand_full}</span>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <p className={`text-xs ${textMuted}`}>{t.footer_copy}</p>
            <p className={`text-xs ${textMuted} opacity-60`}>{t.footer_note}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
