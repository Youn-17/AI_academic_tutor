import React, { useState } from 'react';
import MarkdownView from './MarkdownView';
import { Check, Circle, Lightbulb, Sparkles } from 'lucide-react';
import type { Segment } from '@/lib/generativeContent';

// Renders one generative-UI card. The AI emits the markup; these are the components it drives.

const cardProse = 'prose prose-sm max-w-none break-words prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-strong:font-semibold prose-code:text-pink-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none';
const MD: React.FC<{ children: string }> = ({ children }) => (
  <MarkdownView className={cardProse}>{children}</MarkdownView>
);

const simpleHash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); };

// Level-3 interactive: a checkable task list whose tick state persists in localStorage.
const TaskList: React.FC<{ tasks: { done: boolean; text: string }[] }> = ({ tasks }) => {
  const key = 'hak_task_' + simpleHash(tasks.map((t) => t.text).join('|'));
  const [done, setDone] = useState<Record<number, boolean>>(() => {
    try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && typeof s === 'object') return s; } catch { /* ignore */ }
    return Object.fromEntries(tasks.map((t, i) => [i, t.done]));
  });
  const toggle = (i: number) => setDone((d) => { const n = { ...d, [i]: !d[i] }; try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const total = tasks.length;
  const completed = tasks.filter((_, i) => done[i]).length;
  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600">任务清单</span>
        <span className="text-[11px] text-slate-400 tabular-nums">{completed}/{total}</span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 mb-2 overflow-hidden"><div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></div>
      <ul className="space-y-1">
        {tasks.map((t, i) => (
          <li key={i}>
            <button onClick={() => toggle(i)} className="flex items-start gap-2 text-left w-full group/task">
              <span className={`mt-0.5 shrink-0 w-[16px] h-[16px] rounded flex items-center justify-center border transition-colors ${done[i] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover/task:border-emerald-400'}`}>{done[i] && <Check size={11} className="text-white" />}</span>
              <span className={`text-sm ${done[i] ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>{t.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Level-4 open-ended: AI-generated self-contained HTML/SVG in a sandboxed iframe (no same-origin
// → can't touch the parent, cookies or network-of-record), so the model can ship interactive
// visualizations (sliders, animations, diagrams) safely.
const HtmlViz: React.FC<{ html: string; height: number }> = ({ html, height }) => (
  <div className="my-3 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
    <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-400 flex items-center gap-1"><Sparkles size={10} /> 交互可视化</div>
    <iframe sandbox="allow-scripts allow-popups" srcDoc={html} className="w-full block bg-white" style={{ height, border: 0 }} title="交互可视化" loading="lazy" />
  </div>
);

const GenerativeCard: React.FC<{ seg: Segment }> = ({ seg }) => {
  if (seg.type === 'tasklist') return <TaskList tasks={seg.tasks} />;
  if (seg.type === 'htmlviz') return <HtmlViz html={seg.html} height={seg.height} />;
  if (seg.type === 'compare') {
    return (
      <div className="my-3 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div>
            <div className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border-b border-blue-100 truncate">{seg.left.title}</div>
            <div className="px-3 py-2 text-sm text-slate-700"><MD>{seg.left.body}</MD></div>
          </div>
          <div>
            <div className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border-b border-amber-100 truncate">{seg.right.title}</div>
            <div className="px-3 py-2 text-sm text-slate-700"><MD>{seg.right.body}</MD></div>
          </div>
        </div>
      </div>
    );
  }

  if (seg.type === 'steps') {
    return (
      <div className="my-3 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2.5">
        <ol className="space-y-0">
          {seg.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 relative pb-2 last:pb-0">
              {i < seg.steps.length - 1 && <span className="absolute left-[8px] top-5 bottom-0 w-px bg-slate-200" />}
              <span className="mt-0.5 shrink-0 z-10">
                {s.done
                  ? <span className="flex items-center justify-center w-[17px] h-[17px] rounded-full bg-emerald-500"><Check size={11} className="text-white" /></span>
                  : <Circle size={17} className="text-slate-300" />}
              </span>
              <span className={`text-sm ${s.done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (seg.type === 'metric') {
    return (
      <div className="my-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {seg.title && <div className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-100">{seg.title}</div>}
        <div className="grid gap-px bg-slate-100" style={{ gridTemplateColumns: `repeat(${Math.min(seg.metrics.length, 4)}, minmax(0, 1fr))` }}>
          {seg.metrics.map((mm, i) => (
            <div key={i} className="bg-white px-3 py-2.5 text-center">
              <div className="text-lg font-bold text-blue-600 leading-tight tabular-nums break-words">{mm.value || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={mm.label}>{mm.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (seg.type === 'keyidea') {
    return (
      <div className="my-3 rounded-r-lg border-l-4 border-blue-400 bg-blue-50/60 px-3 py-2 flex gap-2.5">
        <Lightbulb size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700"><MD>{seg.body}</MD></div>
      </div>
    );
  }

  return null;
};

export default GenerativeCard;
