import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, RefreshCw } from 'lucide-react';

// Admin AI-usage monitor: per-model / per-role token spend + call volume, from the
// model_usage_summary() RPC (teacher/admin gated). Helps route each task to the AI that
// handles it best. Token counts originate in the chat edge fn (provider `usage`).

interface Summary {
  by_model: { model: string; provider: string; turns: number; tokens: number; prompt_tokens: number; completion_tokens: number; avg_tokens: number }[];
  by_role: { active_role: string; model: string; turns: number; tokens: number }[];
  by_day: { day: string; tokens: number; turns: number }[];
  totals: { turns: number; tokens: number; safety_blocks: number };
}

const fmt = (n?: number) => (n == null ? '0' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));

const Stat: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rounded-xl border p-4 ${accent ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
    <div className="text-2xl font-bold text-slate-800">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{label}</div>
  </div>
);
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4">
    <h2 className="font-bold text-slate-800 text-sm mb-3">{title}</h2>{children}
  </div>
);
const Th: React.FC<{ children?: React.ReactNode; r?: boolean }> = ({ children, r }) => <th className={`py-2 font-medium ${r ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td: React.FC<{ children?: React.ReactNode; r?: boolean; className?: string }> = ({ children, r, className }) => <td className={`py-2 ${r ? 'text-right' : 'text-left'} ${className || ''}`}>{children}</td>;

const ModelUsagePanel: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async (d = days) => {
    setLoading(true); setErr(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: res, error } = await supabase.rpc('model_usage_summary', { days: d });
      if (error) throw error;
      setData(res as Summary);
    } catch (e: any) { setErr(e?.message || '加载失败'); } finally { setLoading(false); }
  };
  useEffect(() => { load(days); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-800">AI 使用监控</h1>
          <p className="text-xs text-slate-500 mt-0.5">每个模型 / 角色的调用量与 Token 消耗——把任务分配给最擅长的 AI。</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{d} 天</button>
          ))}
          <button onClick={() => load()} title="刷新" className="p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-16 justify-center"><Loader2 className="animate-spin" size={18} /> 加载中…</div>
      ) : err ? (
        <div className="text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">加载失败：{err}<div className="text-xs text-slate-500 mt-1">需要教师 / 管理员权限。</div></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="对话轮次" value={fmt(data.totals?.turns)} />
            <Stat label="总 Token" value={fmt(data.totals?.tokens)} accent />
            <Stat label="安全拦截" value={fmt(data.totals?.safety_blocks)} />
          </div>

          <Card title="各模型 Token 消耗">
            {data.by_model?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.by_model} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="model" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={52} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmt} width={42} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="tokens" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-slate-400 text-sm py-8 text-center">暂无数据——学生开始对话后即会出现。</div>}
          </Card>

          {data.by_day?.length > 1 && (
            <Card title="每日 Token 趋势">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.by_day} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmt} width={42} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="tokens" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card title="模型明细">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 border-b border-slate-100"><Th>模型</Th><Th>提供商</Th><Th r>轮次</Th><Th r>Token</Th><Th r>输入/输出</Th><Th r>平均</Th></tr></thead>
              <tbody>
                {data.by_model.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <Td className="font-medium text-slate-700">{m.model || '—'}</Td><Td className="text-slate-500">{m.provider || '—'}</Td>
                    <Td r>{m.turns}</Td><Td r className="font-semibold text-blue-600">{fmt(m.tokens)}</Td>
                    <Td r className="text-slate-500">{fmt(m.prompt_tokens)}/{fmt(m.completion_tokens)}</Td><Td r>{fmt(m.avg_tokens)}</Td>
                  </tr>
                ))}
                {data.by_model.length === 0 && <tr><Td className="text-slate-400 py-3">暂无数据</Td></tr>}
              </tbody>
            </table>
          </Card>

          <Card title="角色 × 模型（哪个 AI 在处理哪类任务）">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 border-b border-slate-100"><Th>角色 / 任务</Th><Th>模型</Th><Th r>轮次</Th><Th r>Token</Th></tr></thead>
              <tbody>
                {data.by_role.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <Td className="font-medium text-slate-700">{m.active_role || '—'}</Td><Td className="text-slate-500">{m.model || '—'}</Td>
                    <Td r>{m.turns}</Td><Td r className="font-semibold text-blue-600">{fmt(m.tokens)}</Td>
                  </tr>
                ))}
                {data.by_role.length === 0 && <tr><Td className="text-slate-400 py-3">暂无数据</Td></tr>}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default ModelUsagePanel;
