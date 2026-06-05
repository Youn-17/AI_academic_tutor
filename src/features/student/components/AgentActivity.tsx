import React from 'react';
import { Loader2, Check, BookOpen, Globe, Telescope, Brain, Bookmark, Code2, FileSearch, Wrench } from 'lucide-react';

// Live "agent at work" panel — one card per tool call, CopilotKit-style: a status
// pill (working → done), the tool's friendly name + icon, and crucially the ARGUMENT
// (the search query / code) so the student can see WHAT the agent is doing, not just
// that it's doing something. Cards tint blue while running, settle to green when done.
// Driven entirely by the SSE `_agent_step {tool, args, status, found}` stream.

interface Step { tool?: string; args?: any; status?: string; found?: number; label?: string }
interface ThemeColors { text: string; textSecondary: string }
interface Props {
  steps?: Step[];
  reasoning?: string;
  isEN?: boolean;
  colors: ThemeColors;
  isDark?: boolean;
}

const TOOL_META: Record<string, { zh: string; en: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  search_knowledge_base:  { zh: '检索知识库', en: 'Searching knowledge base', Icon: BookOpen },
  web_search:             { zh: '联网搜索',   en: 'Searching the web',         Icon: Globe },
  deep_search:            { zh: '深度检索',   en: 'Deep search',               Icon: Telescope },
  search_academic_papers: { zh: '检索文献',   en: 'Searching papers',          Icon: FileSearch },
  get_paper_details:      { zh: '获取论文详情', en: 'Fetching paper details',   Icon: FileSearch },
  recall_memory:          { zh: '回忆过往',   en: 'Recalling memory',          Icon: Brain },
  save_memory:            { zh: '保存到记忆', en: 'Saving to memory',          Icon: Bookmark },
  run_python:             { zh: '运行代码',   en: 'Running code',              Icon: Code2 },
};

// Pull the most meaningful human-readable field out of a tool's arguments.
function argSummary(args: any): string {
  if (!args || typeof args !== 'object') return typeof args === 'string' ? args : '';
  const v = args.query ?? args.q ?? args.keyword ?? args.question ?? args.topic ?? args.content ?? args.code ?? args.text ?? '';
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s.length > 90 ? s.slice(0, 90) + '…' : s;
}

const AgentActivity: React.FC<Props> = ({ steps, reasoning, isEN, colors, isDark }) => {
  if ((!steps || steps.length === 0) && !reasoning) return null;
  return (
    <div className="space-y-1.5">
      {steps?.map((s, i) => {
        const meta = TOOL_META[s.tool || ''];
        const Icon = meta?.Icon || Wrench;
        const name = s.label || (meta ? (isEN ? meta.en : meta.zh) : (s.tool || (isEN ? 'Tool' : '工具')));
        const done = s.status === 'done';
        const query = argSummary(s.args);
        return (
          <div
            key={i}
            className="rounded-xl border px-2.5 py-1.5 transition-colors duration-500 animate-in fade-in slide-in-from-left-1"
            style={{
              borderColor: done ? 'rgba(16,185,129,0.35)' : 'rgba(37,99,235,0.30)',
              background: done
                ? (isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.05)')
                : (isDark ? 'rgba(37,99,235,0.10)' : 'rgba(37,99,235,0.05)'),
            }}
          >
            <div className="flex items-center gap-2">
              <Icon size={13} className={done ? 'text-emerald-500 shrink-0' : 'text-blue-500 shrink-0'} />
              <span className="text-xs font-medium truncate" style={{ color: colors.text }}>{name}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium shrink-0">
                {done ? (
                  <>
                    <Check size={11} className="text-emerald-500" />
                    <span className="text-emerald-600">{s.found != null ? `${s.found}${isEN ? ' found' : ' 条'}` : (isEN ? 'done' : '完成')}</span>
                  </>
                ) : (
                  <>
                    <Loader2 size={11} className="animate-spin text-blue-500" />
                    <span className="text-blue-500">{isEN ? 'working' : '进行中'}</span>
                  </>
                )}
              </span>
            </div>
            {query && (
              <div className="mt-0.5 pl-[21px] text-[11px] truncate" style={{ color: colors.textSecondary }} title={query}>
                {query}
              </div>
            )}
          </div>
        );
      })}
      {reasoning && (
        <details className="text-xs rounded-lg px-2.5 py-1.5" style={{ background: isDark ? 'rgba(148,163,184,0.10)' : '#f1f5f9' }}>
          <summary className="cursor-pointer select-none font-medium flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
            <Brain size={12} /> {isEN ? 'Reasoning' : '思考过程'}
          </summary>
          <div className="mt-1.5 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto" style={{ color: colors.textSecondary }}>
            {reasoning}
          </div>
        </details>
      )}
    </div>
  );
};

export default AgentActivity;
