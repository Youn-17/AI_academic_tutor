import React, { useState } from 'react';
import { RiBrainLine, RiLoader4Line, RiSparkling2Line, RiErrorWarningLine, RiArrowRightLine, RiRefreshLine } from '@remixicon/react';
import { supabase } from '@/lib/supabase';

interface Msg { sender?: unknown; content: string }
interface Props {
  messages: Msg[];
  studentName?: string;
  onUseNudge?: (text: string) => void;   // fill the intervention box (teacher edits + sends)
}

const EDGE_FN = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Teacher-facing classroom analyst — interpretable, OVERRIDABLE recommendation.
// Output never reaches the student directly; the teacher accepts/edits/dismisses.
const ANALYST_PROMPT = `你是面向教师的「课堂分析师」。你的唯一读者是教师本人；你的输出绝不会直接发送给学生。你阅读一段学生与 AI 导师的对话记录，给教师一条可解释、可推翻的指导建议。

严守治理底线：你建议的「推动方式（nudge）」必须是支持式的——帮助学生自己往前想（提问、给框架、指出待澄清处、建议查证），绝不能是替学生给出答案、替学生写将被评分/计入共同体的内容、或让 AI 代劳。如对话中出现 AI 有代写/给现成答案/无据断言的迹象，请在 risks 中点出并据此设计纠偏的 nudge。

你必须严格输出如下 JSON（不要输出任何其它文字）：
{
  "diagnosis": "一句话诊断：这段对话当前卡在什么地方（≤40 字）",
  "stuck_on": "用 1-2 句具体说明卡点（概念混淆 / 问题失焦 / 过度依赖 AI / 缺乏证据 / 停在表层 等）",
  "evidence_quotes": ["直接摘自学生原话、作为该判断依据的 1-3 条短引文"],
  "signal_reading": "用一句话解读对话中的互动信号（如：从未质疑 AI、无批判接受→可能过度依赖）",
  "draft_nudge": "给教师的、可直接发给学生的一条推动消息草稿（支持式：一个好问题或一个框架，≤80 字，不含答案）",
  "alt_nudges": ["1-2 条可替换的备选 nudge"],
  "confidence": "high | medium | low",
  "rationale": "≤60 字说明你为何这样建议，便于教师判断是否采纳",
  "risks": ["可选：需教师注意的风险，如疑似 AI 代写、学生焦虑、信息不足"],
  "escalate": false
}
证据不足时如实说明并把 confidence 设为 low；绝不编造对话中不存在的引文。`;

interface Analysis {
  diagnosis?: string; stuck_on?: string; evidence_quotes?: string[]; signal_reading?: string;
  draft_nudge?: string; alt_nudges?: string[]; confidence?: string; rationale?: string; risks?: string[]; escalate?: boolean;
}

const CONF: Record<string, string> = { high: 'bg-emerald-100 text-emerald-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-500' };

const ClassroomAnalyst: React.FC<Props> = ({ messages, studentName, onUseNudge }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [a, setA] = useState<Analysis | null>(null);
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    setOpen(true);
    setStatus('loading');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setStatus('error'); return; }
    const transcript = messages.filter(m => m.content)
      .map(m => `${m.sender === 'student' ? '学生' : m.sender === 'supervisor' ? '导师' : 'AI'}: ${m.content}`)
      .join('\n').slice(0, 7000);
    if (transcript.length < 30) { setStatus('error'); return; }
    try {
      const resp = await fetch(`${EDGE_FN}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON },
        body: JSON.stringify({
          messages: [{ role: 'system', content: ANALYST_PROMPT }, { role: 'user', content: `学生：${studentName || '（匿名）'}\n\n对话记录：\n${transcript}` }],
          provider: 'deepseek', model: 'deepseek-chat', stream: false, response_format: { type: 'json_object' },
        }),
      });
      if (!resp.ok) { setStatus('error'); return; }
      const d = await resp.json();
      let raw: string = d?.choices?.[0]?.message?.content || '';
      const i = raw.indexOf('{'); const j = raw.lastIndexOf('}');
      if (i >= 0 && j > i) raw = raw.slice(i, j + 1);
      setA(JSON.parse(raw)); setStatus('done');
    } catch { setStatus('error'); }
  };

  return (
    <div className="bg-white border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
        <button onClick={analyze} disabled={status === 'loading'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all disabled:opacity-50">
          {status === 'loading' ? <RiLoader4Line size={14} className="animate-spin" /> : <RiBrainLine size={14} />}
          {status === 'loading' ? '分析中…' : status === 'done' ? '重新分析' : '课堂分析师'}
        </button>
        <span className="text-[11px] text-slate-400">AI 读这段对话 → 给你可解释、可改的介入建议（不会发给学生）</span>
        {status === 'done' && <button onClick={() => setOpen(o => !o)} className="ml-auto text-[11px] text-blue-500">{open ? '收起' : '展开'}</button>}
      </div>

      {open && status === 'error' && (
        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2 text-xs text-rose-500">
          <RiErrorWarningLine size={14} /> 分析失败（对话太短或服务异常），稍后重试。
        </div>
      )}

      {open && status === 'done' && a && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <RiSparkling2Line size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{a.diagnosis}</p>
                {a.stuck_on && <p className="text-slate-600 mt-0.5 text-[13px]">{a.stuck_on}</p>}
              </div>
              {a.confidence && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${CONF[a.confidence] || CONF.low}`}>{a.confidence}</span>}
            </div>

            {!!a.evidence_quotes?.length && (
              <div className="pl-6 space-y-1">
                {a.evidence_quotes.map((q, i) => (
                  <p key={i} className="text-[12px] text-slate-500 border-l-2 border-slate-300 pl-2 italic">“{q}”</p>
                ))}
              </div>
            )}
            {a.signal_reading && <p className="pl-6 text-[12px] text-slate-500">📊 {a.signal_reading}</p>}

            {a.draft_nudge && (
              <div className="ml-6 rounded-lg bg-white border border-blue-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">建议的介入草稿（可改）</p>
                <p className="text-slate-700 text-[13px]">{a.draft_nudge}</p>
                {onUseNudge && (
                  <button onClick={() => onUseNudge(a.draft_nudge || '')}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                    用此建议填入输入框 <RiArrowRightLine size={12} />
                  </button>
                )}
              </div>
            )}

            {!!a.alt_nudges?.length && (
              <div className="ml-6 space-y-1">
                {a.alt_nudges.map((n, i) => (
                  <button key={i} onClick={() => onUseNudge?.(n)} title="点击填入输入框"
                    className="block text-left text-[12px] text-slate-500 hover:text-blue-600">· {n}</button>
                ))}
              </div>
            )}

            {!!a.risks?.length && (
              <div className="ml-6 flex flex-wrap gap-1.5">
                {a.risks.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-600">
                    <RiErrorWarningLine size={11} /> {r}
                  </span>
                ))}
              </div>
            )}

            {a.rationale && <p className="ml-6 text-[11px] text-slate-400 flex items-center gap-1"><RiRefreshLine size={11} /> 依据：{a.rationale}</p>}
            <p className="ml-6 text-[10px] text-slate-400">⚠️ 这是 AI 的建议，最终判断与措辞由你决定。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomAnalyst;
