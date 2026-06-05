import React, { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import {
  RiChat3Line, RiDoubleQuotesL, RiRobot2Line, RiHistoryLine, RiBrainLine,
  RiSparkling2Line, RiLightbulbFlashLine, RiNodeTree, RiSearchEyeLine,
  RiBookOpenLine, RiLoader4Line, RiArrowRightLine,
} from '@remixicon/react';
import { getInsights, getStats, type StudentInsight, type UserStats } from '@/services/ProfileService';
import { getConversations, getMessages } from '@/services/ConversationService';
import { Theme, Role } from '@/types';
import { supabase } from '@/lib/supabase';

interface StudentDashboardProps { theme: Theme; userName: string; onNewChat?: () => void; onOpenKnowledge?: () => void; onOpenGraph?: () => void }

const EDGE_FN = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const RADAR_DIMS = ['文献阅读', '批判思维', '写作能力', '方法论', 'AI协作', '研究设计'];

interface Analysis { radar: { subject: string; value: number }[]; insights: { type: string; content: string }[] }

// LLM analysis of the student's REAL conversations (no fabricated numbers).
async function analyzeStudent(): Promise<Analysis | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  let convs: { id: string }[] = [];
  try { convs = await getConversations(); } catch { return null; }
  if (!convs.length) return null;
  let text = '';
  for (const c of convs.slice(0, 5)) {
    try {
      const msgs = await getMessages(c.id);
      text += msgs.map((m) => `${m.sender === Role.STUDENT ? '学生' : 'AI'}: ${m.content}`).join('\n') + '\n———\n';
    } catch { /* skip */ }
    if (text.length > 6000) break;
  }
  if (text.trim().length < 60) return null;
  const sys = '你是学术导师分析助手。基于以下真实师生对话，客观、保守地评估该学生当前在 6 个维度的水平，并给出 3 条有依据的观察/建议。只输出 JSON、无解释：{"radar":{"文献阅读":N,"批判思维":N,"写作能力":N,"方法论":N,"AI协作":N,"研究设计":N},"insights":[{"type":"strength|weakness|suggestion","content":"≤40字，具体、基于对话证据"}]}。N 为 0-100 整数；无证据的维度给 50。不要夸大。';
  try {
    const resp = await fetch(`${EDGE_FN}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, apikey: ANON },
      body: JSON.stringify({
        messages: [{ role: 'system', content: sys }, { role: 'user', content: text.slice(0, 6000) }],
        provider: 'deepseek', model: 'deepseek-chat', stream: false, response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    let raw: string = d?.choices?.[0]?.message?.content || '';
    const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
    if (a >= 0 && b > a) raw = raw.slice(a, b + 1);
    const g = JSON.parse(raw);
    const radar = RADAR_DIMS.map((s) => ({ subject: s, value: Math.max(0, Math.min(100, Number(g.radar?.[s]) || 50)) }));
    const insights = Array.isArray(g.insights) ? g.insights.slice(0, 6) : [];
    return { radar, insights };
  } catch { return null; }
}

const StatCard = ({ icon: Icon, label, value, isDark }: { icon: any; label: string; value: React.ReactNode; isDark: boolean }) => (
  <div className={`p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5 ${isDark ? 'bg-[#0C1E3E] border-blue-900/20' : 'bg-white border-slate-100'}`}>
    <div className="p-2.5 rounded-xl bg-blue-500/10 w-fit mb-4"><Icon size={18} className="text-blue-500" /></div>
    <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>{value}</p>
    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
  </div>
);

const INSIGHT_CFG: Record<string, { label: string; cls: string; border: string }> = {
  strength: { label: '优势', cls: 'bg-blue-100 text-blue-700', border: '#2563EB' },
  weakness: { label: '待改进', cls: 'bg-rose-100 text-rose-700', border: '#f43f5e' },
  suggestion: { label: '建议', cls: 'bg-sky-100 text-sky-700', border: '#38BDF8' },
  milestone: { label: '里程碑', cls: 'bg-amber-100 text-amber-700', border: '#f59e0b' },
};

export default function StudentDashboard({ theme, userName, onNewChat, onOpenKnowledge, onOpenGraph }: StudentDashboardProps) {
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<UserStats | null>(null);
  const [insights, setInsights] = useState<{ type: string; content: string }[]>([]);
  const [radar, setRadar] = useState(RADAR_DIMS.map((s) => ({ subject: s, value: 50 })));
  const [analyzing, setAnalyzing] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    (async () => {
      setAnalyzing(true);
      // prefer real supervisor/AI insights if any exist
      let real: StudentInsight[] = [];
      try { real = await getInsights(); } catch { /* table may be missing */ }
      const a = await analyzeStudent();
      if (a) {
        setRadar(a.radar);
        setInsights([...real.map((r) => ({ type: r.type, content: r.content })), ...a.insights]);
        setHasData(true);
      } else if (real.length) {
        setInsights(real.map((r) => ({ type: r.type, content: r.content })));
        setHasData(true);
      } else {
        setHasData(false);
      }
      setAnalyzing(false);
    })();
  }, []);

  const cardBase = `rounded-2xl border ${isDark ? 'bg-[#0C1E3E] border-blue-900/20' : 'bg-white border-slate-100'}`;
  const greeting = (() => { const h = new Date().getHours(); return h < 6 ? '深夜好' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好'; })();
  const lastActive = stats?.last_active_time ? new Date(stats.last_active_time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—';

  return (
    <div className={`h-full overflow-y-auto p-5 md:p-8 space-y-6 ${isDark ? 'bg-[#06122A]' : 'bg-slate-50'}`}>
      {/* Header */}
      <div>
        <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>{greeting}，{userName.split(' ')[0]}</h1>
        <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>这里是你的学术成长概览 · 数据来自你的真实使用记录。</p>
      </div>

      {/* Real stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={RiChat3Line} label="累计对话" value={stats?.total_conversations ?? '—'} isDark={isDark} />
        <StatCard icon={RiDoubleQuotesL} label="对话消息" value={stats?.total_messages ?? '—'} isDark={isDark} />
        <StatCard icon={RiRobot2Line} label="AI 交互" value={stats?.ai_interactions ?? '—'} isDark={isDark} />
        <StatCard icon={RiHistoryLine} label="最近活跃" value={lastActive} isDark={isDark} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '新对话', sub: '与 AI 导师探讨', Icon: RiChat3Line, action: onNewChat },
          { label: '知识图谱', sub: '可视化你的概念', Icon: RiNodeTree, action: onOpenGraph },
          { label: '联网检索', sub: '让 AI 查最新资料', Icon: RiSearchEyeLine, action: onNewChat },
          { label: '知识库', sub: '检索教材与论文', Icon: RiBookOpenLine, action: onOpenKnowledge },
        ].map((a, i) => (
          <button key={i} onClick={a.action} className={`p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] group ${cardBase}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors"><a.Icon size={17} /></div>
            <p className={`text-sm font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{a.label}</p>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{a.sub}</p>
          </button>
        ))}
      </div>

      {/* LLM radar + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`p-5 ${cardBase}`}>
          <div className="flex items-center gap-2 mb-2">
            <RiBrainLine size={16} className="text-blue-500" />
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>能力分布</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">AI 评估</span>
          </div>
          <p className="text-[10px] mb-2 text-slate-400">基于你与 AI 的真实对话</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke={isDark ? 'rgba(120,170,255,0.15)' : '#e2e8f0'} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Radar name="能力" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-2 p-5 ${cardBase}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><RiSparkling2Line size={15} className="text-blue-500" /></div>
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>AI 协同建议</h3>
            <span className="text-[10px] text-slate-400">实时分析你的对话</span>
          </div>
          {analyzing ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center"><RiLoader4Line size={18} className="animate-spin text-blue-500" /> 正在分析你的研究对话…</div>
          ) : hasData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((ins, i) => {
                const c = INSIGHT_CFG[ins.type] || INSIGHT_CFG.suggestion;
                return (
                  <div key={i} className={`p-4 rounded-xl border-l-4 ${isDark ? 'bg-[#0C1E3E]/60' : 'bg-slate-50'}`} style={{ borderLeftColor: c.border }}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.cls}`}>{c.label}</span>
                    <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{ins.content}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-8 text-center">多和 AI 导师讨论几轮后，这里会基于你的真实对话给出个性化分析与建议。</div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-blue-900/20 to-sky-900/10 border-blue-800/30' : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200/50'}`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5"><RiLightbulbFlashLine size={15} className="text-blue-500" /></div>
          <div>
            <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>苏格拉底式学习提示</p>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>当 AI 给出答案时，试着追问「为什么」和「如何验证」——这会帮你建立更深的理解，而不只是获取答案。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
