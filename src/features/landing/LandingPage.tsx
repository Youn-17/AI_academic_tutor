import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, BrainCircuit, Search, BookOpen, Users, ShieldCheck,
  Quote, Lightbulb, ChevronRight, Target, BarChart3, ArrowLeft,
  Eye, X, Menu, MessageSquare, Zap, TrendingUp, CheckCircle2,
  GraduationCap, FileText, Play, Sparkles, Globe, Bot, User,
  Sparkles as SparklesIcon, ChevronDown, Waves, Network
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

// Enhanced color palette
const COLORS = {
  primary: '#059669',
  primaryLight: '#10B981',
  primaryDark: '#047857',
  secondary: '#0EA5E9',
  accent: '#F59E0B',
  accentLight: '#FCD34D',
  purple: '#8B5CF6',
  rose: '#F43F5E',

  bgLight: '#F0FDFA',
  bgSubtle: '#F8FAFC',

  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
    light: '#94A3B8',
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

// Animated stats
const STATS = {
  'zh-CN': [
    { value: '500+', label: '活跃学生', icon: Users },
    { value: '50+', label: '合作导师', icon: GraduationCap },
    { value: '10K+', label: 'AI 对话', icon: MessageSquare },
    { value: '98%', label: '满意度', icon: CheckCircle2 },
  ],
  'zh-TW': [
    { value: '500+', label: '活躍學生', icon: Users },
    { value: '50+', label: '合作導師', icon: GraduationCap },
    { value: '10K+', label: 'AI 對話', icon: MessageSquare },
    { value: '98%', label: '滿意度', icon: CheckCircle2 },
  ],
  'en': [
    { value: '500+', label: 'Active Students', icon: Users },
    { value: '50+', label: 'Supervisors', icon: GraduationCap },
    { value: '10K+', label: 'AI Conversations', icon: MessageSquare },
    { value: '98%', label: 'Satisfaction', icon: CheckCircle2 },
  ],
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
    nav_pricing: '定价',
    locale: '简体',

    hero_badge: '学术研究新范式',
    hero_title: 'AI 辅助科研督导平台',
    hero_subtitle: '连接学生、AI 与导师，让研究过程更透明、更高效',
    hero_desc: '苏格拉底式对话引导 · 文献证据追溯 · 进展可视化分析 · 导师精准介入',

    cta_primary: '免费开始',
    cta_secondary: '观看演示',
    cta_trusted: '受多家科研机构信赖',

    stats_title: '正在改变学术研究方式',
    stats_subtitle: '数据实时更新中',

    features_title: '为什么选择 HAKHub',
    features_subtitle: '为学术科研量身打造的功能',

    features_1_title: 'AI 苏格拉底式对话',
    features_1_desc: 'AI 不会直接给出答案，而是通过提问引导学生独立思考，培养批判性思维。每一次对话都被记录，形成思维发展轨迹。',
    features_2_title: '全程可追溯',
    features_2_desc: '每一次对话、每一篇文献、每一次导师反馈，都完整记录，形成研究过程档案。支持导出完整的研究日志。',
    features_3_title: '导师实时洞察',
    features_3_desc: '导师随时查看学生研究进展，在关键节点提供指导，不错过介入时机。AI 辅助识别卡点与瓶颈。',
    features_4_title: '证据增强检索',
    features_4_desc: '直接接入 Semantic Scholar，检索结果与 AI 对话联动，保证学术严谨性。支持 200+ 学科领域。',
    features_5_title: '研究进展可视化',
    features_5_desc: '自动生成研究进展时间线，可视化展示从选题到完成的全过程。导出进度报告，方便组会汇报。',
    features_6_title: '多导师协作',
    features_6_desc: '支持导师团队共同指导学生，可分配不同阶段的督导责任。完整的协作记录可追溯。',

    how_title: '简单三步，开启高效科研',
    how_subtitle: '无需复杂配置，快速上手',

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
    philosophy_subtitle: '一切为了更好的学术研究',

    philosophy_1_title: 'AI 是辅助，不是替代',
    philosophy_1_desc: 'AI 的作用是启发思考，而非提供捷径。我们相信，真正的学术成长来自于独立思考的过程。',
    philosophy_2_title: '过程透明，信任建立',
    philosophy_2_desc: '所有交互对导师可见，不是为了监控，而是为了更好地理解学生需求，提供精准帮助。',
    philosophy_3_title: '面向过程，而非结果',
    philosophy_3_desc: '我们关注研究方法和思维训练，而不是论文产出速度。好的研究需要时间沉淀。',

    cta_section_title: '准备好提升科研质量了吗？',
    cta_section_desc: '加入数百名正在使用 HAKHub 的研究人员，开启更高效的科研之旅',
    cta_button: '立即体验',
    cta_note: '免费使用 · 无需信用卡 · 随时取消',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '为学术研究而生',
    footer_links: '功能 · 理念 · 隐私 · 关于',
  },
  'en': {
    brand: 'HAKHub Scholar',
    nav_features: 'Features',
    nav_philosophy: 'Philosophy',
    nav_pricing: 'Pricing',
    locale: 'EN',

    hero_badge: 'A New Paradigm for Research',
    hero_title: 'AI-Assisted Research Supervision Platform',
    hero_subtitle: 'Connecting students, AI, and supervisors for transparent, efficient research',
    hero_desc: 'Socratic dialogue · Evidence retrieval · Progress analytics · Timely intervention',

    cta_primary: 'Get Started Free',
    cta_secondary: 'Watch Demo',
    cta_trusted: 'Trusted by research institutions',

    stats_title: 'Transforming Academic Research',
    stats_subtitle: 'Real-time data updates',

    features_title: 'Why HAKHub',
    features_subtitle: 'Purpose-built for academic research',

    features_1_title: 'AI Socratic Dialogue',
    features_1_desc: 'AI guides through questioning, not answers—cultivating critical thinking and independence. Every conversation is recorded to show thinking progression.',
    features_2_title: 'Full Traceability',
    features_2_desc: 'Every conversation, paper, and feedback is recorded, creating a complete research journey archive. Export full research logs anytime.',
    features_3_title: 'Real-time Supervision Insights',
    features_3_desc: 'Supervisors monitor progress anytime, identifying the right moments for meaningful intervention. AI helps identify bottlenecks.',
    features_4_title: 'Evidence-Enhanced Search',
    features_4_desc: 'Integrated with Semantic Scholar, connecting search results with AI dialogue for academic rigor. Supports 200+ disciplines.',
    features_5_title: 'Progress Visualization',
    features_5_desc: 'Auto-generate research timeline showing the complete journey from topic to completion. Export progress reports for group meetings.',
    features_6_title: 'Multi-Supervisor Collaboration',
    features_6_desc: 'Support supervisor teams with distributed oversight responsibilities. Complete collaboration records are fully traceable.',

    how_title: 'Three Simple Steps',
    how_subtitle: 'Quick setup, instant value',

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
    philosophy_subtitle: 'Everything for better academic research',

    philosophy_1_title: 'AI assists, it doesn\'t replace',
    philosophy_1_desc: 'AI inspires thinking, not shortcuts. We believe true academic growth comes from independent reasoning.',
    philosophy_2_title: 'Transparency builds trust',
    philosophy_2_desc: 'All interactions are visible to supervisors—not for monitoring, but for understanding student needs.',
    philosophy_3_title: 'Process over results',
    philosophy_3_desc: 'We focus on research methodology and thinking training, not thesis speed. Good research takes time.',

    cta_section_title: 'Ready to Elevate Your Research?',
    cta_section_desc: 'Join hundreds of researchers already using HAKHub for a more efficient research journey',
    cta_button: 'Get Started Now',
    cta_note: 'Free to use · No credit card required · Cancel anytime',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: 'Built for academic research',
    footer_links: 'Features · Philosophy · Privacy · About',
  },
  'zh-TW': {
    brand: 'HAKHub Scholar',
    nav_features: '功能',
    nav_philosophy: '理念',
    nav_pricing: '定價',
    locale: '繁體',

    hero_badge: '學術研究新範式',
    hero_title: 'AI 輔助科研督導平台',
    hero_subtitle: '連接學生、AI 與導師，讓研究過程更透明、更高效',
    hero_desc: '蘇格拉底式對話引導 · 文獻證據追溯 · 進展可視化分析 · 導師精準介入',

    cta_primary: '免費開始',
    cta_secondary: '觀看演示',
    cta_trusted: '受多家科研機構信賴',

    stats_title: '正在改變學術研究方式',
    stats_subtitle: '數據實時更新中',

    features_title: '為什麼選擇 HAKHub',
    features_subtitle: '為學術科研量身打造的功能',

    features_1_title: 'AI 蘇格拉底式對話',
    features_1_desc: 'AI 不會直接給出答案，而是通過提問引導學生獨立思考，培養批判性思維。每一次對話都被記錄，形成思維發展軌跡。',
    features_2_title: '全程可追溯',
    features_2_desc: '每一次對話、每一篇文獻、每一次導師反饋，都完整記錄，形成研究過程檔案。支持導出完整的研究日誌。',
    features_3_title: '導師實時洞察',
    features_3_desc: '導師隨時查看學生研究進展，在關鍵節點提供指導，不錯過介入時機。AI 輔助識別卡點與瓶頸。',
    features_4_title: '證據增強檢索',
    features_4_desc: '直接接入 Semantic Scholar，檢索結果與 AI 對話聯動，保證學術嚴謹性。支持 200+ 學科領域。',
    features_5_title: '研究進展可視化',
    features_5_desc: '自動生成研究進展時間線，可視化展示從選題到完成的過程。導出進度報告，方便組會彙報。',
    features_6_title: '多導師協作',
    features_6_desc: '支持導師團隊共同指導學生，可分配不同階段的督導責任。完整的協作記錄可追溯。',

    how_title: '簡單三步，開啟高效科研',
    how_subtitle: '無需複雜配置，快速上手',

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
    philosophy_subtitle: '一切為了更好的學術研究',

    philosophy_1_title: 'AI 是輔助，不是替代',
    philosophy_1_desc: 'AI 的作用是啟發思考，而非提供捷徑。我們相信，真正的學術成長來自於獨立思考的過程。',
    philosophy_2_title: '過程透明，信任建立',
    philosophy_2_desc: '所有交互對導師可見，不是為了監控，而是為了更好地理解學生需求，提供精準幫助。',
    philosophy_3_title: '面向過程，而非結果',
    philosophy_3_desc: '我們關注研究方法和思維訓練，而不是論文產出速度。好的研究需要時間沉澱。',

    cta_section_title: '準備好提升科研質量了嗎？',
    cta_section_desc: '加入數百名正在使用 HAKHub 的研究人員，開啟更高效的科研之旅',
    cta_button: '立即體驗',
    cta_note: '免費使用 · 無需信用卡 · 隨時取消',

    footer_copy: '© 2026 HAKHub Team · HAKHub Scholar',
    footer_note: '為學術研究而生',
    footer_links: '功能 · 理念 · 隱私 · 關於',
  },
};

// Animated counter component
const AnimatedCounter: React.FC<{ value: string; duration?: number }> = ({ value, duration = 2000 }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
    const suffix = value.replace(/[0-9]/g, '');

    let start = 0;
    const increment = numericValue / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start) + suffix);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className={`tabular-nums transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {displayValue}
    </span>
  );
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

// Animated Triadic Model SVG Component
const TriadicModel: React.FC<{ isDark: boolean; isEN: boolean }> = ({ isDark, isEN }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseActive(p => !p);
    }, 2000);
    return () => clearInterval(pulseInterval);
  }, []);

  return (
    <div className="relative w-full h-56">
      <svg viewBox="0 0 400 200" className="w-full h-full drop-shadow-lg">
        {/* Animated background circles */}
        <circle cx="200" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1"
                className={`text-emerald-500/10 ${pulseActive ? 'animate-ping' : ''}`} />

        {/* Connection lines with animation */}
        <line x1="70" y1="160" x2="200" y2="50" stroke="currentColor" strokeWidth="2"
              className={`transition-all duration-300 ${(hoveredNode === 'student' || hoveredNode === 'ai') ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
          <animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="1s" fill="freeze" />
        </line>
        <line x1="330" y1="160" x2="200" y2="50" stroke="currentColor" strokeWidth="2"
              className={`transition-all duration-300 ${(hoveredNode === 'supervisor' || hoveredNode === 'ai') ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
          <animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="1s" fill="freeze" />
        </line>
        <line x1="70" y1="160" x2="330" y2="160" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5"
              className={`transition-all duration-300 ${(hoveredNode === 'student' || hoveredNode === 'supervisor') ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />

        {/* Flow animation on lines */}
        {(hoveredNode === 'student' || hoveredNode === 'ai' || !hoveredNode) && (
          <circle r="4" fill="#10B981">
            <animateMotion dur="2s" repeatCount="indefinite" path="M70,160 L200,50" />
          </circle>
        )}
        {(hoveredNode === 'supervisor' || hoveredNode === 'ai' || !hoveredNode) && (
          <circle r="4" fill="#10B981">
            <animateMotion dur="2s" repeatCount="indefinite" begin="1s" path="M330,160 L200,50" />
          </circle>
        )}

        {/* Student Node */}
        <g onMouseEnter={() => setHoveredNode('student')} onMouseLeave={() => setHoveredNode(null)}
           className="cursor-pointer transition-transform duration-300" style={{ transformOrigin: '70px 160px' }}>
          <circle cx="70" cy="160" r="40" fill={isDark ? '#1E3A5F' : '#EFF6FF'}
                  className={`transition-all duration-300 ${hoveredNode === 'student' ? 'r-44' : ''}`} />
          <circle cx="70" cy="160" r="36" fill="none" stroke="currentColor" strokeWidth="2"
                  className={hoveredNode === 'student' ? 'text-blue-500' : 'text-blue-500/50'} />
          <GraduationCap size={26} x="44" y="144" className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <text x="70" y="220" textAnchor="middle" className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEN ? 'Student' : '学生'}
          </text>
        </g>

        {/* AI Node with pulse */}
        <g onMouseEnter={() => setHoveredNode('ai')} onMouseLeave={() => setHoveredNode(null)}
           className="cursor-pointer">
          <circle cx="200" cy="50" r="42" fill={isDark ? '#064E3B' : '#ECFDF5'}
                  className={`transition-all duration-300 ${hoveredNode === 'ai' ? 'r-46' : ''}`} />
          <circle cx="200" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-emerald-500 ${pulseActive ? 'animate-pulse' : ''}`} />
          <BrainCircuit size={30} x="170" y="33" className="text-emerald-600" />
          <text x="200" y="115" textAnchor="middle" className={`text-xs font-bold text-emerald-600`}>
            AI
          </text>
        </g>

        {/* Supervisor Node */}
        <g onMouseEnter={() => setHoveredNode('supervisor')} onMouseLeave={() => setHoveredNode(null)}
           className="cursor-pointer transition-transform duration-300" style={{ transformOrigin: '330px 160px' }}>
          <circle cx="330" cy="160" r="40" fill={isDark ? '#78350F' : '#FEF3C7'}
                  className={`transition-all duration-300 ${hoveredNode === 'supervisor' ? 'r-44' : ''}`} />
          <circle cx="330" cy="160" r="36" fill="none" stroke="currentColor" strokeWidth="2"
                  className={hoveredNode === 'supervisor' ? 'text-amber-500' : 'text-amber-500/50'} />
          <ShieldCheck size={26} x="304" y="144" className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <text x="330" y="220" textAnchor="middle" className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEN ? 'Supervisor' : '导师'}
          </text>
        </g>
      </svg>

      {/* Hover info panel */}
      {hoveredNode && (
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-lg'}`}>
          {hoveredNode === 'student' && (isEN ? 'Engages in Socratic dialogue' : '参与苏格拉底式对话')}
          {hoveredNode === 'ai' && (isEN ? 'Guides through questioning' : '通过提问引导思考')}
          {hoveredNode === 'supervisor' && (isEN ? 'Provides timely intervention' : '提供及时介入指导')}
        </div>
      )}
    </div>
  );
};

// Floating particles animation
const FloatingParticles: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 8 + 4,
    x: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20 animate-bounce"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            background: isDark ? 'linear-gradient(135deg, #10B981, #0EA5E9)' : 'linear-gradient(135deg, #059669, #0EA5E9)',
          }}
        />
      ))}
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
  const stats = STATS[localeProp];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Check which section is visible
      const sections = ['hero', 'stats', 'features', 'how', 'quotes', 'philosophy'];
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
  const textMuted = isDark ? 'text-slate-400' : COLORS.text.secondary;
  const borderClass = isDark ? 'border-emerald-900/30' : 'border-slate-200';
  const cardBg = isDark ? 'bg-[#0F2937]' : 'bg-white';

  return (
    <div className={`min-h-screen font-sans ${bg} ${textPrimary}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-blue-500/5 to-cyan-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/3 to-orange-500/3 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? `border-b ${borderClass} shadow-sm ${isDark ? 'bg-[#0B1416]/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'}` : ''}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                 style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})` }}>
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
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})` }}
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
      <section id="hero" className="relative pt-32 pb-20 px-5 max-w-7xl mx-auto overflow-hidden">
        <FloatingParticles isDark={isDark} />

        <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <FadeIn delay={100}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border transition-all hover:scale-105 cursor-default"
                   style={{ background: COLORS.bgLight, borderColor: COLORS.primaryLight, color: COLORS.text.primary }}>
                <Sparkles size={14} className="animate-pulse" />
                {t.hero_badge}
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                  style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>
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
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})` }}
                >
                  {t.cta_primary} <ArrowRight size={18} />
                </button>
                <button
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium border-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95"
                  style={{ borderColor: isDark ? COLORS.slate[700] : COLORS.slate[200], color: isDark ? COLORS.slate[300] : COLORS.slate[700] }}
                >
                  <Play size={16} className="group-hover:scale-110 transition-transform" />
                  {t.cta_secondary}
                </button>
              </div>
            </FadeIn>

            <FadeIn delay={600}>
              <div className="flex items-center gap-2 mt-6 text-sm text-slate-500 dark:text-slate-400">
                <CheckCircle2 size={16} className="text-emerald-500" />
                {t.cta_trusted}
              </div>
            </FadeIn>
          </div>

          {/* Interactive Triadic Model */}
          <FadeIn delay={300} direction="right" className="hidden lg:block">
            <div className={`p-8 rounded-3xl border-2 backdrop-blur-sm ${cardBg}`}
                 style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : COLORS.bgLight }}>
              <div className="text-center mb-4">
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

      {/* Hero Image */}
      <section className="relative px-5 pb-20">
        <div className="max-w-6xl mx-auto">
          <FadeIn delay={200}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <img
                src="/images/hero_bg.png"
                alt="Research platform illustration"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
                    <ShieldCheck size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{isEN ? 'Academic Research Excellence' : '学术研究卓越'}</p>
                    <p className="text-white/80 text-sm">{t.cta_trusted}</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-16 px-5 border-y" style={{ borderColor: isDark ? 'rgba(16, 185, 129, 0.15)' : COLORS.bgLight }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>{t.stats_title}</h2>
              <p className={`text-sm ${textMuted}`}>{t.stats_subtitle}</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div className="text-center p-6 rounded-2xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                       style={{ background: isDark ? 'rgba(16, 185, 129, 0.05)' : COLORS.bgLight }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110"
                         style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})` }}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <p className="text-3xl font-bold mb-1" style={{ color: COLORS.primary }}>
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className={`text-xs font-medium ${textMuted}`}>{stat.label}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
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
              { icon: MessageSquare, title: t.features_1_title, desc: t.features_1_desc, color: COLORS.primary },
              { icon: FileText, title: t.features_2_title, desc: t.features_2_desc, color: COLORS.secondary },
              { icon: Eye, title: t.features_3_title, desc: t.features_3_desc, color: COLORS.purple },
              { icon: Search, title: t.features_4_title, desc: t.features_4_desc, color: COLORS.accent },
              { icon: BarChart3, title: t.features_5_title, desc: t.features_5_desc, color: COLORS.rose },
              { icon: Users, title: t.features_6_title, desc: t.features_6_desc, color: COLORS.primaryLight },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div
                    onMouseEnter={() => setHoveredFeature(i)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${cardBg}`}
                    style={{
                      borderColor: hoveredFeature === i ? feature.color : (isDark ? 'rgba(5, 150, 105, 0.15)' : COLORS.slate[200]),
                      transform: hoveredFeature === i ? 'translateY(-8px)' : 'translateY(0)',
                      boxShadow: hoveredFeature === i ? `0 25px 50px -12px ${feature.color}25` : 'none'
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                         style={{ background: hoveredFeature === i ? feature.color : `${feature.color}15` }}>
                      <Icon size={28} style={{ color: hoveredFeature === i ? 'white' : feature.color }} />
                    </div>
                    <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                    <p className={`text-sm leading-relaxed ${textMuted}`}>{feature.desc}</p>
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
                alt="Supervisor and students collaboration"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ maxHeight: '400px', objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
                      <Network size={20} className="text-white" />
                    </div>
                    <p className="text-white/90 text-sm font-medium">{isEN ? 'Connected Research Ecosystem' : '互联的研究生态系统'}</p>
                  </div>
                  <p className="text-white text-lg font-semibold">
                    {isEN ? 'Real-time visibility into student research progress' : '实时了解学生研究进展'}
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
              <Zap size={36} className="inline-block mb-4 text-amber-500" />
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.how_title}
              </h2>
              <p className={`text-base ${textMuted}`}>{t.how_subtitle}</p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

            {[
              { step: t.how_1_step, title: t.how_1_title, desc: t.how_1_desc, icon: User, color: COLORS.primary },
              { step: t.how_2_step, title: t.how_2_title, desc: t.how_2_desc, icon: MessageSquare, color: COLORS.secondary },
              { step: t.how_3_step, title: t.how_3_title, desc: t.how_3_desc, icon: ShieldCheck, color: COLORS.purple },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={i} delay={i * 150}>
                  <div className="relative text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transition-all duration-300 hover:scale-110"
                         style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)` }}>
                      <Icon size={32} className="text-white" />
                    </div>
                    <div className={`text-5xl font-bold mb-4 ${isDark ? 'text-slate-800' : 'text-slate-100'}`}
                         style={{ fontFamily: 'Crimson Pro, serif' }}>
                      {item.step}
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className={`text-sm leading-relaxed ${textMuted}`}>{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
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
              <Lightbulb size={32} className="inline-block mb-4 text-amber-500" />
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.philosophy_title}
              </h2>
              <p className={`text-base ${textMuted}`}>{t.philosophy_subtitle}</p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: t.philosophy_1_title, desc: t.philosophy_1_desc, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500' },
              { title: t.philosophy_2_title, desc: t.philosophy_2_desc, icon: ShieldCheck, gradient: 'from-blue-500 to-cyan-500' },
              { title: t.philosophy_3_title, desc: t.philosophy_3_desc, icon: TrendingUp, gradient: 'from-purple-500 to-pink-500' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div className={`p-8 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${cardBg} group`}
                       style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.2)' : COLORS.bgLight }}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${item.gradient} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-4">{item.title}</h3>
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
          <div className={`p-12 md:p-16 rounded-3xl border-2 text-center relative overflow-hidden ${cardBg}`}
               style={{ borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : COLORS.bgLight }}>
            {/* Animated background */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 animate-pulse" style={{ background: COLORS.primary, transform: 'translate(40%, -40%)' }} />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 animate-pulse" style={{ background: COLORS.accent, transform: 'translate(-40%, 40%)', animationDelay: '1s' }} />
            </div>

            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg animate-bounce" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})` }}>
                <SparklesIcon size={40} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif', color: COLORS.primary }}>
                {t.cta_section_title}
              </h2>
              <p className={`text-base mb-8 max-w-xl mx-auto ${textMuted}`}>{t.cta_section_desc}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={onEnter}
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})` }}
                >
                  {t.cta_button} <ArrowRight size={22} />
                </button>
              </div>
              <p className={`text-xs mt-6 ${textMuted}`}>{t.cta_note}</p>
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
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              {t.footer_links.split('·').map((link, i) => (
                <a key={i} href="#" className="hover:text-emerald-600 transition-colors">
                  {link.trim()}
                </a>
              ))}
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
