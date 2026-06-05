import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, type Node, type Edge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RiNodeTree, RiRefreshLine, RiLoader4Line, RiErrorWarningLine } from '@remixicon/react';
import { supabase } from '@/lib/supabase';

interface Msg { content: string; sender?: unknown }
interface KnowledgeGraphProps { messages: Msg[]; theme: 'light' | 'dark' }

const EDGE_FN = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// concept "kind" → blue-family accent (deep→light), matching the platform palette
const KIND_COLOR: Record<string, string> = {
  concept: '#2563EB', theory: '#1D4ED8', method: '#0EA5E9',
  finding: '#38BDF8', question: '#6366F1', default: '#3B82F6',
};

interface RawGraph { central?: string; nodes?: { id: string; label: string; kind?: string }[]; edges?: { source: string; target: string; label?: string }[] }

async function extractGraph(text: string): Promise<RawGraph | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  const sys = '你是研究概念图抽取器。从下面的师生对话中，提炼该学生研究主题的核心概念网络。只输出 JSON、不要任何解释或代码块标记。格式严格为：{"central":"核心主题(≤8字)","nodes":[{"id":"n1","label":"概念(≤8字)","kind":"concept|theory|method|finding|question"}],"edges":[{"source":"n1","target":"n2","label":"关系(≤6字)"}]}。最多 9 个 node；central 不要重复出现在 nodes 里；edges 连接真正相关的概念。';
  const resp = await fetch(`${EDGE_FN}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, apikey: ANON },
    body: JSON.stringify({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: text.slice(0, 6000) }],
      provider: 'deepseek', model: 'deepseek-chat', stream: false,
      response_format: { type: 'json_object' },
    }),
  });
  if (!resp.ok) return null;
  const d = await resp.json();
  let raw: string = d?.choices?.[0]?.message?.content || '';
  const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) raw = raw.slice(a, b + 1);
  try {
    const g = JSON.parse(raw) as RawGraph;
    return Array.isArray(g.nodes) ? g : null;
  } catch { return null; }
}

function toFlow(g: RawGraph, isDark: boolean): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const text = isDark ? '#E9F1FF' : '#0A1A33';
  nodes.push({
    id: '__c', position: { x: 0, y: 0 }, data: { label: g.central || '研究主题' },
    style: {
      background: 'linear-gradient(135deg,#0B2447,#2563EB 60%,#38BDF8)', color: '#fff',
      border: 'none', borderRadius: 16, padding: '12px 18px', fontWeight: 700, fontSize: 14,
      boxShadow: '0 10px 26px rgba(37,99,235,0.4)', width: 'auto',
    },
  });
  const list = (g.nodes || []).slice(0, 9);
  const R = 270;
  list.forEach((nd, i) => {
    const ang = (2 * Math.PI * i) / Math.max(list.length, 1) - Math.PI / 2;
    const c = KIND_COLOR[nd.kind || 'default'] || KIND_COLOR.default;
    nodes.push({
      id: nd.id, position: { x: Math.round(R * Math.cos(ang)), y: Math.round(R * Math.sin(ang)) },
      data: { label: nd.label, kind: nd.kind || 'default' },
      style: {
        background: isDark ? 'rgba(12,30,62,0.85)' : '#fff', color: text,
        border: `1.5px solid ${c}`, borderRadius: 12, padding: '8px 12px', fontSize: 12, fontWeight: 600,
        boxShadow: `0 4px 14px ${c}33`,
      },
    });
  });
  const ids = new Set(list.map((n) => n.id));
  const edges: Edge[] = [];
  const linked = new Set<string>();
  (g.edges || []).forEach((e, i) => {
    if (!ids.has(e.source) || !ids.has(e.target)) return;
    edges.push({
      id: `e${i}`, source: e.source, target: e.target, label: e.label,
      animated: true, style: { stroke: isDark ? '#3B82F6' : '#60A5FA', strokeWidth: 1.5 },
      labelStyle: { fill: isDark ? '#8AA4CC' : '#56688A', fontSize: 10 },
      labelBgStyle: { fill: isDark ? '#0C1E3E' : '#F4F8FF', fillOpacity: 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, color: isDark ? '#3B82F6' : '#60A5FA' },
    });
    linked.add(e.source); linked.add(e.target);
  });
  // any concept not connected → link to the central node so nothing floats
  list.forEach((nd) => {
    if (!linked.has(nd.id)) edges.push({
      id: `c-${nd.id}`, source: '__c', target: nd.id,
      style: { stroke: isDark ? 'rgba(96,165,250,0.4)' : 'rgba(37,99,235,0.25)', strokeWidth: 1.2 },
    });
  });
  return { nodes, edges };
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ messages, theme }) => {
  const isDark = theme === 'dark';
  // useNodesState/useEdgesState wire React Flow's internal drag/zoom changes back into state — the
  // old plain useState passed nodes WITHOUT onNodesChange, so nodes couldn't actually be dragged.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'empty'>('idle');

  const generate = useCallback(async () => {
    const text = messages.map((m) => m.content).filter(Boolean).join('\n').trim();
    if (text.length < 20) { setStatus('empty'); return; }
    setStatus('loading');
    try {
      const g = await extractGraph(text);
      if (!g || !g.nodes?.length) { setStatus('error'); return; }
      const f = toFlow(g, isDark);
      setNodes(f.nodes); setEdges(f.edges); setStatus('done');
    } catch { setStatus('error'); }
  }, [messages, isDark]);

  // auto-generate once when the panel opens with enough conversation
  useEffect(() => {
    if (status === 'idle') generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bg = isDark ? '#06122A' : '#F7FAFF';
  const border = isDark ? 'rgba(120,170,255,0.14)' : '#DCE6F6';
  const muted = isDark ? '#8AA4CC' : '#56688A';

  return (
    <div className="relative w-full h-full rounded-2xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <RiNodeTree size={15} style={{ color: '#38BDF8' }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: muted }}>知识图谱</span>
      </div>
      <button onClick={generate} disabled={status === 'loading'}
        className="absolute top-2.5 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
        style={{ background: isDark ? 'rgba(37,99,235,0.16)' : 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
        {status === 'loading' ? <RiLoader4Line size={13} className="animate-spin" /> : <RiRefreshLine size={13} />}
        {status === 'loading' ? '生成中' : '重新生成'}
      </button>

      {status === 'done' ? (
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          fitView fitViewOptions={{ padding: 0.25 }} nodesDraggable nodesConnectable={false} minZoom={0.3} maxZoom={1.8}>
          <Background color={isDark ? 'rgba(120,170,255,0.10)' : 'rgba(37,99,235,0.08)'} gap={22} size={1} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right"
            nodeColor={(n) => (n.id === '__c' ? '#2563EB' : (KIND_COLOR[String((n.data as { kind?: string })?.kind || 'default')] || KIND_COLOR.default))}
            maskColor={isDark ? 'rgba(6,18,42,0.55)' : 'rgba(244,248,255,0.55)'}
            style={{ background: isDark ? '#0C1E3E' : '#fff', border: `1px solid ${border}`, borderRadius: 10, width: 150, height: 100 }} />
        </ReactFlow>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 gap-3">
          {status === 'loading' && (<><RiLoader4Line size={26} className="animate-spin" style={{ color: '#38BDF8' }} /><p className="text-sm" style={{ color: muted }}>正在用 AI 提炼你的研究概念网络…</p></>)}
          {status === 'empty' && (<><RiNodeTree size={26} style={{ color: muted, opacity: 0.5 }} /><p className="text-sm" style={{ color: muted }}>多聊几句后，这里会自动生成你研究主题的概念图。</p></>)}
          {status === 'error' && (<><RiErrorWarningLine size={24} className="text-rose-400" /><p className="text-sm" style={{ color: muted }}>暂时没能生成，点「重新生成」再试一次。</p></>)}
          {status === 'idle' && (<RiLoader4Line size={26} className="animate-spin" style={{ color: '#38BDF8' }} />)}
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
