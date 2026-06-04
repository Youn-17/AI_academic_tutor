// One-click research data export (teacher/admin). Pulls the anonymized bundle from the
// `export_research_bundle` RPC, serializes tidy CSVs + a codebook, zips, and downloads.
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '';
  const keys: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [keys.join(',')];
  for (const r of rows) lines.push(keys.map((k) => esc(r[k])).join(','));
  return lines.join('\r\n');
}

const CODEBOOK = `# 研究数据导出 · Codebook (techedu.icu)

导出时间见 raw.json.exported_at。所有身份已**匿名化**为 P0001 形式；已退出研究(withdrawn)的被试已排除。
对话**原文保留**(话语编码需要)；participant_id 是唯一可追溯字段，还原映射仅平台管理员持有。

## 文件总览
| 文件 | 粒度 | 直接喂给的分析 |
|---|---|---|
| participants.csv | 一行=一被试 | A/B 建模(GLMM)、公平性(Gini) |
| sessions.csv | 一行=一会话 | 描述、抽样 |
| messages.csv | 一行=一条消息 | 话语编码(+κ)、LLM 自动编码 |
| events.csv | 一行=一交互事件(有序) | ENA、滞后序列分析、过程挖掘 |
| raw.json | 原始嵌套 | 留余地 |

## participants.csv
- participant_id — 匿名被试ID (P0001…)
- condition — A/B 条件：A_direct | B_socratic | 空(=非研究参与者)
- consent_status — 知情同意状态
- study_code — 研究/班级代码
- enrolled_at — 入组时间
- n_sessions / n_messages / n_events — 该被试的会话/消息/事件计数

## sessions.csv
- session_id — 会话ID(join 键)
- participant_id — 匿名被试ID
- status — 会话状态
- created_at / updated_at
- n_messages — 会话内消息数

## messages.csv（话语单元）
- message_id — 消息ID
- session_id — 所属会话（按 created_at 排序还原话轮顺序）
- participant_id — 匿名被试ID
- sender — student | ai | supervisor
- content — 消息原文（待编码）
- content_type — text | chart | …
- model_used — AI 使用的模型
- citations — RAG 引用（JSON）
- created_at — 时间戳
> 编码建议：自行追加列 ct_dim / quality / agency_code；按 session_id 分组、created_at 排序得到话轮序列。

## events.csv（有序交互事件 — ENA/序列分析的命脉）
- event_id — 事件ID
- participant_id — 匿名被试ID
- session_id — 所属会话（按 created_at 排序得到事件序列）
- condition — 条件快照
- active_role — 当时激活的 agent 角色
- model — 当时模型
- event_type — student_query | ai_response | tool_invoked | student_action | role_switched | model_switched
- event_subtype — first_question/follow_up | team/direct/socratic… | run_python/deep_search/research_team/search_knowledge_base… | edit_resend | (角色或模型id)
- message_id — 关联消息（若有）
- payload — 附加（chars 字数 / has_file / plan 团队分工 / …），JSON
- created_at — 时间戳
> 用法：按 participant_id + session_id 分组、created_at 排序 → 可编码事件序列 → 直接喂 ENA / lag-sequential / 序列挖掘。

## 备注
- 暂未做 LLM 自动编码（按你的选择，留给离线）。编码列需自行追加。
- 非研究参与者(condition 为空)也包含在内，按 condition/consent_status 自行过滤。
`;

export interface ExportSummary {
  n_participants: number;
  n_sessions: number;
  n_messages: number;
  n_events: number;
}

export async function exportResearchData(): Promise<ExportSummary> {
  const { data, error } = await supabase.rpc('export_research_bundle');
  if (error) throw new Error(error.message || '导出失败（需教师/管理员权限）');
  const bundle = data as {
    participants?: Record<string, unknown>[];
    sessions?: Record<string, unknown>[];
    messages?: Record<string, unknown>[];
    events?: Record<string, unknown>[];
  };

  const zip = new JSZip();
  zip.file('participants.csv', toCSV(bundle.participants || []));
  zip.file('sessions.csv', toCSV(bundle.sessions || []));
  zip.file('messages.csv', toCSV(bundle.messages || []));
  zip.file('events.csv', toCSV(bundle.events || []));
  zip.file('raw.json', JSON.stringify(bundle, null, 2));
  zip.file('codebook.md', CODEBOOK);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `techedu_research_data_${ts}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return {
    n_participants: bundle.participants?.length || 0,
    n_sessions: bundle.sessions?.length || 0,
    n_messages: bundle.messages?.length || 0,
    n_events: bundle.events?.length || 0,
  };
}
