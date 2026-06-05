// AI Chat Edge Function — DMXAPI / DeepSeek / Zhipu / Moonshot / Google proxy
// Features: provider routing, server-resolved keys, RAG, A/B prompts (client-side),
//   tool-calling AGENT loop (search KB / papers / memory), DeepSeek thinking +
//   reasoning_content routing, JSON mode, robust timeouts & guarded streaming.
// Deployment: supabase functions deploy chat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hasImage, lastUserText, pickModel, stripThinking, extractJSON, extractCode } from './pure.ts';

// ── API Endpoints ─────────────────────────────────────────
const DMXAPI_URL    = 'https://www.dmxapi.cn/v1/chat/completions';
const DEEPSEEK_URL  = 'https://api.deepseek.com/v1/chat/completions';
const ZHIPU_URL     = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MOONSHOT_URL  = 'https://api.moonshot.cn/v1/chat/completions';
const GOOGLE_URL    = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MINIMAX_URL   = 'https://api.minimaxi.com/v1/chat/completions';   // MiniMax OpenAI-compatible (China host; .io for international)

// ── Platform API Keys (env fallbacks) ─────────────────────
const DMXAPI_API_KEY    = Deno.env.get('DMXAPI_API_KEY')    || '';
const DEEPSEEK_API_KEY  = Deno.env.get('DEEPSEEK_API_KEY')  || '';
const ZHIPU_API_KEY     = Deno.env.get('ZHIPU_API_KEY')     || '';
const MOONSHOT_API_KEY  = Deno.env.get('MOONSHOT_API_KEY')  || '';
const GOOGLE_API_KEY    = Deno.env.get('GOOGLE_API_KEY')    || '';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SUPPORTED_PROVIDERS = ['dmxapi', 'deepseek', 'zhipu', 'moonshot', 'kimi', 'google', 'minimax'] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SSE_HEADERS = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

const DMXAPI_EMBED_URL = 'https://www.dmxapi.cn/v1/embeddings';
const EMBED_MODEL      = 'text-embedding-3-small';
const SS_API           = 'https://api.semanticscholar.org/graph/v1';
const SS_API_KEY       = Deno.env.get('SEMANTIC_SCHOLAR_API_KEY') || ''; // optional — lifts rate limits

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_MESSAGES_COUNT = 50;
const RATE_LIMIT_MAX       = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Timeouts (ms)
const T_EMBED    = 10_000;
const T_SS       = 30_000;
const T_PROVIDER = 60_000;   // non-stream provider call (agent rounds)
const T_CONNECT  = 60_000;   // stream connect
const T_IDLE     = 45_000;   // max gap between stream chunks before we give up

const MAX_TOOL_ROUNDS = 4;

// ── fetch with timeout (R2 fix: never hang on a slow/dead upstream) ─────────
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Semantic Scholar fetch: send the API key if configured, and retry on 429
// (the unauthenticated pool is heavily rate-limited → frequent 429s).
async function ssFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (SS_API_KEY) headers['x-api-key'] = SS_API_KEY;
  let resp: Response | null = null;
  for (let i = 0; i < 3; i++) {
    resp = await fetchWithTimeout(url, { headers }, T_SS);
    if (resp.status !== 429) return resp;
    await new Promise((r) => setTimeout(r, 1200 * (i + 1))); // backoff: 1.2s, 2.4s
  }
  return resp!;
}

// ── in-memory rate limit (fast path / fallback for S1) ─────────────────────
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
function checkRateLimitMem(userId: string): boolean {
  const now = Date.now();
  const e = rateLimitStore.get(userId);
  if (!e || now - e.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (e.count >= RATE_LIMIT_MAX) return false;
  e.count += 1;
  return true;
}
// S1 fix: cross-isolate check via Postgres RPC, best-effort (falls back to mem).
async function rateLimitOk(serviceClient: any, userId: string): Promise<boolean> {
  // Postgres RPC is authoritative (cross-isolate); only fall back to the in-memory
  // counter when the RPC errors/absent — never charge both budgets on one request.
  try {
    const { data, error } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: userId, p_max: RATE_LIMIT_MAX, p_window: 60,
    });
    if (!error) return data !== false;
  } catch (_) { /* RPC absent → fall back to in-memory */ }
  return checkRateLimitMem(userId);
}

// ── provider routing ───────────────────────────────────────
function resolveEndpoint(p: Provider): string {
  if (p === 'deepseek')                 return DEEPSEEK_URL;
  if (p === 'zhipu')                    return ZHIPU_URL;
  if (p === 'moonshot' || p === 'kimi') return MOONSHOT_URL;
  if (p === 'google')                   return GOOGLE_URL;
  if (p === 'minimax')                  return MINIMAX_URL;
  return DMXAPI_URL;
}
function resolvePlatformKey(p: Provider): string {
  if (p === 'deepseek')                 return DEEPSEEK_API_KEY;
  if (p === 'zhipu')                    return ZHIPU_API_KEY;
  if (p === 'moonshot' || p === 'kimi') return MOONSHOT_API_KEY;
  if (p === 'google')                   return GOOGLE_API_KEY;
  return DMXAPI_API_KEY;
}

// ── Multimodal helpers ─────────────────────────────────────
const VISION_MODEL = 'glm-4v-flash';   // Zhipu free vision model (one place to update if renamed)
// hasImage · lastUserText · pickModel (+ ROUTER) → ./pure.ts (pure + unit-tested)

// ── embedding (used by RAG + agent tools) ──────────────────
async function embedQuery(text: string, fallbackKey: string): Promise<number[] | null> {
  try {
    const key = DMXAPI_API_KEY || fallbackKey;
    const r = await fetchWithTimeout(DMXAPI_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: [text] }),
    }, T_EMBED);
    if (!r.ok) return null;
    const j = await r.json();
    const v = j.data?.[0]?.embedding;
    return Array.isArray(v) && v.length ? v : null;
  } catch (_) { return null; }
}

// stripThinking → ./pure.ts (pure + unit-tested)

// ── Agent tool definitions (OpenAI tools schema) ───────────
const TOOL_DEFS = [
  { type: 'function', function: {
    name: 'search_knowledge_base',
    description: '检索平台知识库（已导入的教材、论文、课程资料、教师文档）。当问题涉及具体概念/方法/定义/统计或学习科学知识，或需要有依据地引用时调用。返回最相关的若干段落。',
    parameters: { type: 'object', properties: {
      query: { type: 'string', description: '语义检索查询，提炼成检索关键词比照搬原话更好' },
      layers: { type: 'array', items: { type: 'integer' }, description: '可选，限定知识层级 1-4' },
    }, required: ['query'] },
  }},
  { type: 'function', function: {
    name: 'recall_memory',
    description: '回忆关于该学生的分型记忆（过往经历、知识状态/误解、学习偏好）以及教师反馈。延续之前讨论、了解学生背景、或想个性化辅导时调用。',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  }},
  { type: 'function', function: {
    name: 'save_memory',
    description: '当出现值得长期记住、有助于以后更懂这个学生的内容时，保存为分型记忆，便于跨会话延续辅导。',
    parameters: { type: 'object', properties: {
      content: { type: 'string', description: '要记住的内容，写成对未来辅导有用的简洁陈述' },
      memory_type: { type: 'string', enum: ['episodic', 'semantic', 'procedural'], description: 'episodic=该学生的具体经历/事件（某次卡在哪、问过什么、做了什么决定）；semantic=关于学生的事实（知识状态、典型误解、研究兴趣、目标）；procedural=他怎么学最有效（吃哪种讲法、学习策略、偏好）' },
      importance: { type: 'number', description: '重要性 0~1：越能长期影响"如何辅导这个学生"越高（核心误解/研究方向≈0.9，一般进展≈0.5，临时待办≈0.3）' },
    }, required: ['content', 'memory_type'] },
  }},
];

const WEB_SEARCH_TOOL = { type: 'function', function: {
  name: 'web_search',
  description: '联网搜索最新信息（Tavily，为 AI 优化）。当需要时效性/最新进展、平台知识库没有的事实、或要核实某说法时调用。返回综合答案 + 真实来源链接；绝不编造，用此工具获取真实网页信息。',
  parameters: { type: 'object', properties: {
    query: { type: 'string', description: '搜索查询' },
    topic: { type: 'string', enum: ['general', 'news'], description: '可选，news 偏新闻时效' },
  }, required: ['query'] },
}};

// Code-interpreter backend (Cloud Run) — runs LLM-written Python in an E2B sandbox.
const CODE_INTERPRETER_URL = Deno.env.get('CODE_INTERPRETER_URL') || 'https://ci-backend-546443218324.asia-east1.run.app';
const CODE_INTERPRETER_TOOL = { type: 'function', function: {
  name: 'run_python',
  description: '在隔离沙箱里执行 Python 做数据分析/计算/画图/生成文件（已装 pandas、numpy、matplotlib、openpyxl、python-docx）。当需要：对表格/数据做统计或计算、画图表、生成 Excel/Word/Markdown 文件时调用。要求：代码完整可独立运行；用 print() 输出关键结论；画图直接 plt.show()（会自动展示给用户）；要让用户下载的文件存到 /data/ 目录并在 return_files 里列出文件名。绝不编造数据。',
  parameters: { type: 'object', properties: {
    code: { type: 'string', description: '完整可运行的 Python 代码' },
    return_files: { type: 'array', items: { type: 'string' }, description: '可选：/data/ 下要返回给用户下载的文件名，如 ["report.xlsx"]' },
  }, required: ['code'] },
}};

const DEEP_SEARCH_TOOL = { type: 'function', function: {
  name: 'deep_search',
  description: '深度检索平台知识库：把一个较复杂/综合的研究问题自动拆成多个角度的子问题，分别检索后去重合并，比单次 search_knowledge_base 召回更全。当问题涉及多个概念、需要综述/对比、或单次检索不够全面时优先用它。',
  parameters: { type: 'object', properties: {
    query: { type: 'string', description: '完整的研究问题（自然语言即可，工具会自动拆解）' },
  }, required: ['query'] },
}};

interface ToolCtx {
  serviceClient: any;
  user: { id: string };
  course_id: string | null;
  resolvedApiKey: string;
  tavilyKey?: string;
  userToken?: string;   // original "Bearer ..." header, forwarded to the code-interpreter backend
  apiUrl?: string;      // resolved provider endpoint (for deep_search sub-query decomposition)
  model?: string;       // resolved model
  attachedFile?: { name: string; b64: string };  // a data file the student uploaded → written to /data/ for run_python
}
type ToolResult = { content: string; sources: any[]; artifacts?: { charts: string[]; files: { name: string; b64: string }[] } };

// extractJSON → ./pure.ts (pure + unit-tested)

async function executeTool(name: string, args: any, ctx: ToolCtx): Promise<ToolResult> {
  try {
    if (name === 'search_knowledge_base') {
      const vec = await embedQuery(String(args.query || ''), ctx.resolvedApiKey);
      if (!vec) return { content: '（知识库检索暂时不可用）', sources: [] };
      const { data: chunks } = await ctx.serviceClient.rpc('match_chunks', {
        query_embedding: `[${vec.join(',')}]`,
        p_user_id: ctx.user.id,
        p_course_id: ctx.course_id || null,
        p_layer_filter: Array.isArray(args.layers) ? args.layers : null,
        match_count: 6,
        similarity_threshold: 0.3,
      });
      const rows: any[] = chunks || [];
      const sources = rows.map((c) => ({ id: c.id, source_title: c.source_title, layer: c.layer }));
      const content = rows.length
        ? rows.map((c, i) => `[${i + 1}] ${c.source_title || '知识库'}：${String(c.content).slice(0, 500)}`).join('\n\n')
        : '知识库中未找到相关内容。';
      return { content, sources };
    }

    if (name === 'search_academic_papers') {
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
      const url = `${SS_API}/paper/search?query=${encodeURIComponent(String(args.query || ''))}&limit=${limit}&fields=title,authors,year,abstract,url,citationCount,externalIds`;
      const r = await ssFetch(url);
      if (!r.ok) return { content: '外部文献库暂时限流，未取到论文。请改用 search_knowledge_base 从平台知识库(已含多本教材与论文)检索，或稍后再试；不要编造文献。', sources: [] };
      const j = await r.json();
      const papers: any[] = j.data || [];
      const sources = papers.map((p) => ({ id: p.paperId || p.url || p.title, source_title: p.title, layer: 0, url: p.url }));
      const content = papers.length
        ? papers.map((p, i) => {
            const au = (p.authors || []).slice(0, 3).map((a: any) => a.name).join(', ');
            const etal = (p.authors || []).length > 3 ? ' et al.' : '';
            const cc = p.citationCount != null ? ` · 被引 ${p.citationCount}` : '';
            return `[${i + 1}] ${p.title}（${au}${etal}, ${p.year || 'n.d.'}）${cc}\n${String(p.abstract || '').slice(0, 280)}`;
          }).join('\n\n')
        : '未检索到相关论文。';
      return { content, sources };
    }

    if (name === 'get_paper_details') {
      const url = `${SS_API}/paper/${encodeURIComponent(String(args.paper_id || ''))}?fields=title,authors,year,abstract,citationCount,url,venue`;
      const r = await ssFetch(url);
      if (!r.ok) return { content: '外部文献库暂时限流，未获取到论文详情，请稍后再试。', sources: [] };
      const p = await r.json();
      const au = (p.authors || []).map((a: any) => a.name).join(', ');
      return {
        content: `${p.title}\n作者：${au}\n年份：${p.year || 'n.d.'} · 来源：${p.venue || '-'} · 被引：${p.citationCount ?? '-'}\n摘要：${String(p.abstract || '无').slice(0, 800)}`,
        sources: [{ id: p.paperId || args.paper_id, source_title: p.title, layer: 0, url: p.url }],
      };
    }

    if (name === 'recall_memory') {
      const vec = await embedQuery(String(args.query || ''), ctx.resolvedApiKey);
      if (!vec) return { content: '（记忆检索暂时不可用）', sources: [] };
      const { data: mems } = await ctx.serviceClient.rpc('match_memories', {
        query_embedding: `[${vec.join(',')}]`,
        p_user_id: ctx.user.id,
        match_count: 5,
        similarity_threshold: 0.3,
      });
      const rows: any[] = mems || [];
      const content = rows.length
        ? rows.map((m, i) => `[记忆${i + 1}·${m.memory_type}] ${String(m.content).slice(0, 400)}`).join('\n\n')
        : '没有找到相关的历史记忆。';
      return { content, sources: [] };
    }

    if (name === 'save_memory') {
      const vec = await embedQuery(String(args.content || ''), ctx.resolvedApiKey);
      const mtype = ['episodic', 'semantic', 'procedural'].includes(args.memory_type) ? args.memory_type : 'episodic';
      const ins: any = {
        owner_id: ctx.user.id,
        memory_type: mtype,
        content: String(args.content || ''),
        importance: Math.max(0, Math.min(1, Number(args.importance ?? 0.5))),
        visibility: 'private',
      };
      if (vec) ins.embedding = `[${vec.join(',')}]`;
      const { error } = await ctx.serviceClient.from('memories').insert(ins);
      return { content: error ? `保存记忆失败：${error.message}` : `已保存到${mtype}记忆。`, sources: [] };
    }

    if (name === 'web_search') {
      if (!ctx.tavilyKey) return { content: '（联网搜索未配置 API Key）', sources: [] };
      const r = await fetchWithTimeout('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ctx.tavilyKey}` },
        body: JSON.stringify({
          query: String(args.query || ''),
          search_depth: 'basic',
          max_results: 5,
          include_answer: 'advanced',
          topic: args.topic === 'news' ? 'news' : 'general',
        }),
      }, T_SS);
      if (!r.ok) return { content: '联网搜索暂时不可用，请稍后再试。', sources: [] };
      const j = await r.json();
      const rows: any[] = j.results || [];
      const sources = rows.map((x) => ({ id: x.url, source_title: x.title, layer: 0, url: x.url }));
      const ans = j.answer ? `【综合】${j.answer}\n\n` : '';
      const content = ans + (rows.length
        ? rows.map((x, i) => `[${i + 1}] ${x.title}\n${x.url}\n${String(x.content || '').slice(0, 320)}`).join('\n\n')
        : '未检索到结果。');
      return { content, sources };
    }

    if (name === 'deep_search') {
      const question = String(args.query || '');
      if (!question) return { content: '（缺少检索问题）', sources: [] };
      let subqs: string[] = [question];
      try {
        if (ctx.apiUrl && ctx.model) {
          const dec = await callProviderJSON(ctx.apiUrl, ctx.resolvedApiKey, {
            model: ctx.model, max_tokens: 300, temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: '把研究问题拆成 2-4 个互补的检索子问题(覆盖不同概念/角度)。只输出 JSON：{"queries":["...","..."]}' },
              { role: 'user', content: question },
            ],
          });
          const j = extractJSON(dec?.choices?.[0]?.message?.content || '');
          if (j && Array.isArray(j.queries) && j.queries.length) {
            subqs = [question, ...j.queries.map((x: any) => String(x))].slice(0, 4);
          }
        }
      } catch (_) { /* single-query fallback */ }
      const seen = new Set<string>();
      const hits: any[] = [];
      for (const q of subqs) {
        const vec = await embedQuery(q, ctx.resolvedApiKey);
        if (!vec) continue;
        const { data } = await ctx.serviceClient.rpc('match_chunks', {
          query_embedding: `[${vec.join(',')}]`, p_user_id: ctx.user.id,
          p_course_id: ctx.course_id || null, p_layer_filter: null,
          match_count: 5, similarity_threshold: 0.3,
        });
        for (const c of (data || [])) { if (!seen.has(String(c.id))) { seen.add(String(c.id)); hits.push(c); } }
      }
      const top = hits.slice(0, 10);
      const sources = top.map((c) => ({ id: c.id, source_title: c.source_title, layer: c.layer }));
      const content = top.length
        ? `（深度检索：${subqs.length} 个角度，合并 ${top.length} 段）\n\n` + top.map((c, i) => `[${i + 1}] ${c.source_title || '知识库'}：${String(c.content).slice(0, 500)}`).join('\n\n')
        : '知识库中未找到相关内容。';
      return { content, sources };
    }

    if (name === 'run_python') {
      if (!ctx.userToken) return { content: '（代码执行未授权）', sources: [] };
      const r = await fetchWithTimeout(`${CODE_INTERPRETER_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': ctx.userToken },
        body: JSON.stringify({
          code: String(args.code || ''),
          files: ctx.attachedFile ? [ctx.attachedFile] : [],
          return_files: Array.isArray(args.return_files) ? args.return_files.slice(0, 5) : [],
        }),
      }, 90_000);
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return { content: `代码执行服务出错（${r.status}）：${t.slice(0, 200)}`, sources: [] };
      }
      const j = await r.json();
      const charts: string[] = Array.isArray(j.charts) ? j.charts : [];
      const files = Array.isArray(j.files) ? j.files : [];
      const parts: string[] = [];
      if (j.stdout) parts.push(`输出：\n${String(j.stdout).slice(0, 6000)}`);
      if (j.error) parts.push(`运行错误：${String(j.error).slice(0, 600)}`);
      if (charts.length) parts.push(`（已生成 ${charts.length} 张图表并展示给用户）`);
      if (files.length) parts.push(`（已生成文件供用户下载：${files.map((f: any) => f.name).join('、')}）`);
      return {
        content: parts.join('\n\n') || '（代码已执行，无文本输出）',
        sources: [],
        artifacts: (charts.length || files.length) ? { charts, files } : undefined,
      };
    }
  } catch (e) {
    console.error('tool error', name, e);
    return { content: `工具 ${name} 执行出错。`, sources: [] };
  }
  return { content: `未知工具：${name}`, sources: [] };
}

// non-stream provider call returning parsed JSON (agent rounds)
async function callProviderJSON(apiUrl: string, key: string, params: any): Promise<any> {
  const r = await fetchWithTimeout(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ ...params, stream: false }),
  }, T_PROVIDER);
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`provider ${r.status}: ${t.slice(0, 200)}`);
  }
  return await r.json();
}

// ── Ch10 R-Judge-inspired safety self-check ───────────────────────────────────
// A second, independent pass that JUDGES the just-generated answer for academic-
// integrity / jailbreak risk BEFORE it streams to the student (R-Judge's finding:
// splitting "analyse risk" from "decide safe/unsafe" sharply improves judgement).
// Fail-OPEN on any error — the in-prompt EPISTEMIC_GUARDRAIL remains the first layer;
// only an EXPLICIT unsafe verdict rewrites the reply.
async function safetyCheck(apiUrl: string, key: string, model: string, userQuery: string, answer: string): Promise<{ safe: boolean; risk?: string; usage?: any }> {
  try {
    const r = await callProviderJSON(apiUrl, key, {
      model, temperature: 0, max_tokens: 220,
      messages: [
        { role: 'system', content: '你是学术诚信安全检查员。分两步:①分析下面这条「AI 回复」是否越过学术诚信边界——代写了可直接提交的受评成果(作业/论文正文/报告结论/完整作业代码)、编造了文献或数据、或配合了越狱/绕过安全守则的请求;②只输出 JSON:{"safe": true 或 false, "risk": 若 unsafe 用一句中文说明、safe 则为 null}。不要输出 JSON 以外的任何内容。' },
        { role: 'user', content: `学生问:\n${String(userQuery).slice(0, 700)}\n\nAI 回复:\n${String(answer).slice(0, 1800)}` },
      ],
    });
    const j = extractJSON(r?.choices?.[0]?.message?.content || '');
    if (j && j.safe === false) return { safe: false, risk: String(j.risk || '潜在学术诚信风险'), usage: r?.usage };
    return { safe: true, usage: r?.usage };
  } catch (_) {
    return { safe: true };   // a checker failure must never block a legitimate answer
  }
}

// stream a provider completion, emitting each content delta via onDelta; returns the full text.
// Used by the orchestrator's synthesis so content appears live (well within the edge time budget).
async function streamProviderContent(apiUrl: string, key: string, params: any, onDelta: (s: string) => void): Promise<string> {
  let r: Response;
  try {
    r = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ ...params, stream: true }),
    }, T_PROVIDER);
  } catch (_) { return ''; }
  if (!r.ok || !r.body) return '';
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = ''; let full = '';
  while (true) {
    let res: ReadableStreamReadResult<Uint8Array>;
    try { res = await reader.read(); } catch (_) { break; }
    if (res.done) break;
    buf += dec.decode(res.value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const d = t.slice(5).trim();
      if (d === '[DONE]' || !d) continue;
      try { const j = JSON.parse(d); const c = j.choices?.[0]?.delta?.content; if (typeof c === 'string' && c) { full += c; onDelta(c); } } catch (_) { /* skip */ }
    }
  }
  return full;
}

function buildBaseParams(model: string, provider: Provider, opts: any): any {
  const p: any = { model, max_tokens: 4096, temperature: 0.7 };
  if (provider === 'deepseek') {
    if (opts.thinking) p.thinking = opts.thinking;
    if (opts.reasoning_effort) p.reasoning_effort = opts.reasoning_effort;
  }
  if (opts.response_format) p.response_format = opts.response_format;
  return p;
}

// ── Agent streaming loop: runs tool rounds non-streamed, emits live SSE ─────
async function runAgentStream(controller: ReadableStreamDefaultController, opts: {
  apiUrl: string; key: string; baseParams: any; messages: any[]; ctx: ToolCtx; tools: any[];
}) {
  const enc = new TextEncoder();
  const send = (o: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
  const msgs: any[] = [...opts.messages];
  const allSources: any[] = [];
  // token-usage accounting for the AI-usage monitor — summed across every provider call this
  // turn (tool rounds + final + safety check), emitted as a _usage frame just before [DONE].
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, provider_calls: 0 };
  const toolsUsed = new Set<string>();
  let safetyBlocked = false;
  const addU = (r: any) => {
    const u = r?.usage;
    if (u) { usage.prompt_tokens += u.prompt_tokens || 0; usage.completion_tokens += u.completion_tokens || 0; usage.total_tokens += u.total_tokens || 0; }
    usage.provider_calls += 1;
  };

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const forceFinal = round === MAX_TOOL_ROUNDS;
      // #4: on the forced-final round OMIT tools entirely — DMXAPI/Zhipu proxies
      // often ignore tool_choice:'none' and keep emitting empty tool-call turns.
      const params: any = { ...opts.baseParams, messages: msgs };
      if (!forceFinal) { params.tools = opts.tools; params.tool_choice = 'auto'; }
      const resp = await callProviderJSON(opts.apiUrl, opts.key, params); addU(resp);
      const choice = resp.choices?.[0] || {};
      const m = choice.message || {};
      if (m.reasoning_content) send({ _reasoning: String(m.reasoning_content) });

      // #5: a length-truncated turn has malformed tool_calls JSON — don't run tools on it.
      const truncated = choice.finish_reason === 'length';
      const toolCalls = m.tool_calls || [];
      if (toolCalls.length && !forceFinal && !truncated) {
        msgs.push({ role: 'assistant', content: m.content || '', tool_calls: toolCalls });
        for (const tc of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || '{}'); } catch (_) { continue; /* skip malformed */ }
          if (tc.function?.name) toolsUsed.add(tc.function.name);
          send({ _agent_step: { tool: tc.function?.name, args, status: 'running' } });
          const res = await executeTool(tc.function?.name, args, opts.ctx);
          const { content, sources } = res;
          if (sources?.length) allSources.push(...sources);
          if (res.artifacts) send({ _artifacts: res.artifacts });   // charts/files → frontend
          send({ _agent_step: { tool: tc.function?.name, status: 'done', found: sources?.length || 0 } });
          msgs.push({ role: 'tool', tool_call_id: tc.id, content });
        }
        continue;
      }

      // Final answer
      const seen = new Set<string>();
      const sources = allSources.filter((s) => {
        const k = String(s.id || s.source_title);
        if (seen.has(k)) return false; seen.add(k); return true;
      });
      if (sources.length) send({ _rag_sources: sources });
      let clean = stripThinking(m.content || '');
      // #4: never close with a blank answer — retry once with tools omitted, then fall back.
      if (!clean) {
        try {
          const retry = await callProviderJSON(opts.apiUrl, opts.key, {
            ...opts.baseParams,
            messages: [...msgs, { role: 'user', content: '请基于以上信息，现在直接用中文文字给出完整回答，不要再调用任何工具。' }],
          });
          addU(retry);
          clean = stripThinking(retry.choices?.[0]?.message?.content || '');
        } catch (_) { /* ignore */ }
      }
      if (!clean) clean = '（抱歉，我没能生成有效回答，请换一种问法或重试。）';
      // ── Ch10 safety self-check: only substantial answers (long prose or code — where
      // ghost-writing / full-solution risk lives) get a second-pass judgement, so the
      // common short Socratic turns keep near-zero added latency. Fail-open. ──
      if (clean.length > 400 || clean.includes('```')) {
        const sc = await safetyCheck(opts.apiUrl, opts.key, opts.baseParams.model, lastUserText(opts.messages), clean);
        addU({ usage: sc.usage });
        if (!sc.safe) {
          safetyBlocked = true;
          send({ _safety: { blocked: true, risk: sc.risk } });   // frontend/research can capture the interception
          clean = '我重新想了一下：这样直接帮你，可能越过了学术诚信的边界（比如替你完成要提交、要评分的内容）。我更想帮你真正学会——把你卡在的那一步具体讲给我，我们一起拆解、用一个结构相似的例子带你走一遍，最后由你自己完成。这样你交出去的，才真正属于你。';
        }
      }
      for (let i = 0; i < clean.length; i += 60) {
        send({ choices: [{ index: 0, delta: { content: clean.slice(i, i + 60) } }] });
      }
      send({ _usage: { ...usage, model: opts.baseParams?.model, tools: [...toolsUsed], safety_blocked: safetyBlocked, mode: 'agent' } });
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
      controller.close();
      return;
    }
  } catch (e) {
    console.error('agent loop error:', e);
    try {
      send({ choices: [{ index: 0, delta: { content: '（智能体执行出错，请重试）' } }] });
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
    } catch (_) { /* ignore */ }
    controller.close();
  }
}

// ── Multi-agent orchestrator (research team) ──────────────────────────────────
//   Grounded in Liu et al. (2026) educational-agent role taxonomy: a LEAD agent plans
//   → specialists (cognitive-epistemic retriever/analyst, self-regulatory reasoner,
//   human-AI web) run in PARALLEL → the lead SYNTHESIZES with an epistemic-agency
//   guardrail (Liu 2026 cautions cognitive dependency). Reuses callProviderJSON +
//   executeTool; structured so it can later lift to the Cloud Run backend to break the
//   ~150s edge ceiling into minutes-long autonomous runs.
// extractCode → ./pure.ts (pure + unit-tested)

async function runOrchestrator(controller: ReadableStreamDefaultController, opts: {
  apiUrl: string; key: string; model: string; messages: any[]; ctx: ToolCtx; tavily: boolean;
}) {
  const enc = new TextEncoder();
  const send = (o: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
  const task = lastUserText(opts.messages);
  const allSources: any[] = [];
  try {
    const ROSTER: Record<string, { label: string; tool: string | null }> = {
      retriever: { label: '检索专员', tool: 'deep_search' },
      analyst:   { label: '数据分析师', tool: 'run_python' },
      reasoner:  { label: '推理顾问', tool: null },
      affective: { label: '学习伙伴', tool: null },
      ...(opts.tavily ? { web: { label: '联网调研员', tool: 'web_search' } } : {}),
    };
    const webLine = opts.tavily ? '\n- web（联网调研员）：联网搜索最新/实时信息，适合知识库可能没有的时效内容' : '';

    // ── Phase 1: PLAN (lead agent) ──
    send({ _team_step: { phase: 'plan', status: 'running' } });
    let plan: { role: string; subtask: string }[] = [];
    try {
      const pr = await callProviderJSON(opts.apiUrl, opts.key, {
        model: opts.model, max_tokens: 700, temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `你是多智能体学习辅导团队的"组长"。把学生任务拆成 2-4 个聚焦的子任务，分派给最合适的专科 agent。可用专科：\n- retriever（检索专员）：检索平台知识库（统计/学习科学教材与论文），适合要文献依据/概念/理论的子任务\n- analyst（数据分析师）：写并运行 Python 做计算/统计/画图/生成文件，适合涉及数据或可视化的子任务\n- reasoner（推理顾问）：纯推理/批判分析/方案设计，不需外部工具\n- affective（学习伙伴）：情感支持/动机调节，当任务涉及焦虑、压力、拖延、信心不足时${webLine}\n原则：只派真正需要的 agent（不凑数）；子任务聚焦、可独立完成；优先用 retriever/analyst 拿真实依据。\n只输出 JSON：{"plan":[{"role":"retriever","subtask":"…"}]}` },
          { role: 'user', content: task },
        ],
      });
      const j = extractJSON(pr?.choices?.[0]?.message?.content || '');
      if (j && Array.isArray(j.plan)) {
        plan = j.plan
          .map((x: any) => ({ role: String(x.role || '').toLowerCase(), subtask: String(x.subtask || '') }))
          .filter((x: any) => ROSTER[x.role] && x.subtask)
          .slice(0, 3);
      }
    } catch (_) { /* fall back below */ }
    if (!plan.length) plan = [{ role: 'retriever', subtask: task }, { role: 'reasoner', subtask: task }];
    send({ _team_step: { phase: 'plan', status: 'done', plan: plan.map((p) => ({ role: p.role, label: ROSTER[p.role].label, subtask: p.subtask })) } });

    // ── Phase 2: specialists run in PARALLEL ──
    const findings = await Promise.all(plan.map(async (step, idx) => {
      const spec = ROSTER[step.role];
      send({ _team_step: { phase: 'work', idx, role: step.role, agent: spec.label, subtask: step.subtask, status: 'running' } });
      let finding = '';
      try {
        if (step.role === 'analyst') {
          const fileNote = opts.ctx.attachedFile ? `\n（用户上传的数据在 /data/${opts.ctx.attachedFile.name}，可用 pandas 读取）` : '';
          const cg = await callProviderJSON(opts.apiUrl, opts.key, {
            model: opts.model, max_tokens: 1200, temperature: 0.3,
            messages: [{ role: 'system', content: `你是数据分析师。针对子任务写一段完整可独立运行的 Python（已装 pandas/numpy/matplotlib/openpyxl/python-docx）。用 print() 输出关键结论；需要图表就 plt.show()；要下载的文件存到 /data/。只输出代码。${fileNote}` }, { role: 'user', content: step.subtask }],
          });
          const code = extractCode(cg?.choices?.[0]?.message?.content || '');
          if (code) {
            const res = await executeTool('run_python', { code }, opts.ctx);
            finding = res.content;
            if (res.artifacts) send({ _artifacts: res.artifacts });
          } else finding = '（未能生成可运行代码）';
        } else if (spec.tool) {
          const res = await executeTool(spec.tool, { query: step.subtask }, opts.ctx);
          finding = res.content;
          if (res.sources?.length) allSources.push(...res.sources);
        } else {
          const sysByRole = step.role === 'affective'
            ? '你是学习伙伴（情感支持）。针对学生此刻的状态给予真诚共情、把困境正常化，并给一个现在就能做的最小一步与一个情绪/动机调节建议。温暖但不空洞、不说教；不代替学生完成学业任务。'
            : '你是推理顾问。对子任务做严谨的分析/推理/方案设计，给有条理的要点。不要编造具体文献或数据（那是其他专员的职责）。';
          const rr = await callProviderJSON(opts.apiUrl, opts.key, {
            model: opts.model, max_tokens: 1000, temperature: 0.6,
            messages: [{ role: 'system', content: sysByRole }, { role: 'user', content: step.subtask }],
          });
          finding = stripThinking(rr?.choices?.[0]?.message?.content || '');
        }
      } catch (_) { finding = `（${spec.label}未能完成该子任务）`; }
      send({ _team_step: { phase: 'work', idx, role: step.role, agent: spec.label, status: 'done' } });
      return { label: spec.label, subtask: step.subtask, finding };
    }));

    // ── Phase 2.5: REVIEW (lightweight critic — flags gaps for the synthesis; no extra round, to fit the edge time budget) ──
    let criticNotes = '';
    try {
      send({ _team_step: { phase: 'review', status: 'running' } });
      const findingsText = findings.map((f) => `【${f.label}】${f.subtask}\n${String(f.finding).slice(0, 1000)}`).join('\n\n');
      const cr = await callProviderJSON(opts.apiUrl, opts.key, {
        model: opts.model, max_tokens: 280, temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `你是团队"质检员"。快速审查各专科发现是否充分回答了学生任务：指出关键缺口、未被证据支持的说法、遗漏的角度，供组长综合时补强。只输出 JSON：{"notes":"质检要点(简短)"}` },
          { role: 'user', content: `学生任务：${task}\n\n各专科发现：\n${findingsText}` },
        ],
      });
      const cj = extractJSON(cr?.choices?.[0]?.message?.content || '');
      criticNotes = String(cj?.notes || '');
      send({ _team_step: { phase: 'review', status: 'done', notes: criticNotes } });
    } catch (_) { /* review best-effort */ }

    // ── Phase 3: SYNTHESIZE — streamed live so content appears well within the edge time budget ──
    const seen = new Set<string>();
    const sources = allSources.filter((s) => { const k = String(s.id || s.source_title); if (seen.has(k)) return false; seen.add(k); return true; });
    if (sources.length) send({ _rag_sources: sources });
    send({ _team_step: { phase: 'synth', status: 'running' } });
    const synthInput = `学生任务：${task}\n\n各专科 agent 的发现：\n\n` +
      findings.map((f) => `【${f.label}】子任务：${f.subtask}\n${f.finding}`).join('\n\n---\n\n') +
      (criticNotes ? `\n\n---\n\n【质检员意见】${criticNotes}` : '');
    let answer = await streamProviderContent(opts.apiUrl, opts.key, {
      model: opts.model, max_tokens: 6000, temperature: 0.6,
      messages: [
        { role: 'system', content: `你是学习辅导团队的"组长"，把各专科 agent 的发现整合成给学生的最终回答：\n1. 综合所有发现，结构清晰（小标题/列表），直接回应任务。\n2. 标注依据来源（书/论文/网址/计算结果），区分"有依据的结论"与"推理推测"。\n3. 【关键】保护学生认知主体性：不要代替学生思考或给可照抄的成品；用引导性问题、给方法与思路、指出如何自己验证下一步，培养而非削弱独立思考。\n4. 证据不足或冲突时如实说明不确定性。\n5. 若收到【质检员意见】，据此补齐缺口、对不确定处加注，并保持温暖、能维持学习动机的语气。\n用中文回答。` },
        { role: 'user', content: synthInput },
      ],
    }, (c) => send({ choices: [{ index: 0, delta: { content: c } }] }));
    if (!answer.trim()) {
      // synth produced nothing (upstream hiccup) — guarantee a non-empty result from the raw findings
      answer = findings.filter((f) => f.finding && !f.finding.startsWith('（')).map((f) => `**${f.label}**\n${f.finding}`).join('\n\n')
        || '（团队这次没能形成结论，请换个问法或稍后重试。）';
      for (let i = 0; i < answer.length; i += 80) send({ choices: [{ index: 0, delta: { content: answer.slice(i, i + 80) } }] });
    }
    send({ _team_step: { phase: 'synth', status: 'done' } });
    controller.enqueue(enc.encode('data: [DONE]\n\n'));
    controller.close();
  } catch (e) {
    console.error('orchestrator error:', e);
    try { send({ choices: [{ index: 0, delta: { content: '（研究团队执行出错，请重试）' } }] }); controller.enqueue(enc.encode('data: [DONE]\n\n')); } catch (_) { /* ignore */ }
    controller.close();
  }
}

// ── Guarded passthrough for the non-agent stream (R3): idle watchdog + error
//    closure so a stalled/broken upstream can't hang the client. Bytes are
//    passed through unchanged (frontend handles <thinking> strip + reasoning).
function guardedPassthrough(body: ReadableStream<Uint8Array>, prefix: Uint8Array | null): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) { if (prefix) controller.enqueue(prefix); },
    async pull(controller) {
      let timer: number | undefined;
      const idle = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('idle-timeout')), T_IDLE); });
      try {
        const { done, value } = await Promise.race([reader.read(), idle]) as ReadableStreamReadResult<Uint8Array>;
        clearTimeout(timer);
        if (done) { controller.close(); return; }
        controller.enqueue(value);
      } catch (_e) {
        clearTimeout(timer);
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: 'stream timeout' })}\n\ndata: [DONE]\n\n`));
        } catch (_) { /* ignore */ }
        try { reader.cancel(); } catch (_) { /* ignore */ }
        controller.close();
      }
    },
    cancel() { try { reader.cancel(); } catch (_) { /* ignore */ } },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // S3 fix: EVERYTHING (auth, rate limit, body) inside one try so no throw can
  // escape without CORS headers (which made the browser see a CORS error / hang).
  try {
    // ── 1. JWT auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 2. Rate limit (S1: Postgres-backed, best-effort) ──
    if (!(await rateLimitOk(serviceClient, user.id))) {
      return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试（每分钟最多 20 次）' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── 3. Parse + validate body ──
    const bodyJson = await req.json();
    const {
      messages, provider: rawProvider, model, stream = true,
      use_rag = false, use_agent = false, team = false, course_id, layer_filter,
      thinking, reasoning_effort, response_format, attached_file,
    } = bodyJson as any;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '消息格式无效' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (messages.length > MAX_MESSAGES_COUNT) {
      return new Response(JSON.stringify({ error: `消息数量超出限制（最多 ${MAX_MESSAGES_COUNT} 条）` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    for (const msg of messages) {
      if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(JSON.stringify({ error: `单条消息过长（最多 ${MAX_MESSAGE_LENGTH} 个字符）` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    // multimodal: cap image count + per-image dataURL size (~6MB)
    let _imgCount = 0;
    for (const msg of messages) {
      if (Array.isArray(msg.content)) for (const part of msg.content) {
        if (part?.type === 'image_url') {
          _imgCount++;
          if ((part.image_url?.url || '').length > 8_000_000) {
            return new Response(JSON.stringify({ error: '图片过大，请压缩后再试（≤6MB）' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      }
    }
    if (_imgCount > 4) {
      return new Response(JSON.stringify({ error: '一次最多上传 4 张图片' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normalise provider
    let provider: Provider;
    if (rawProvider === 'deepseek') provider = 'deepseek';
    else if (rawProvider === 'zhipu') provider = 'zhipu';
    else if (rawProvider === 'moonshot' || rawProvider === 'kimi') provider = 'moonshot';
    else if (rawProvider === 'google') provider = 'google';
    else if (rawProvider === 'minimax') provider = 'minimax';
    else provider = 'dmxapi';

    // ── 4a. Multimodal: if any message carries an image, force a vision-capable route
    //   (deepseek/text models 400 on image parts; glm-4v-flash is free vision; Claude is multimodal).
    const imagePresent = hasImage(messages);
    let effModel: string = model;
    if (model === 'auto') {
      // one DMXAPI key → router picks the best DMXAPI-served model for this task
      provider = 'dmxapi';
      effModel = pickModel(messages, { hasImage: imagePresent, reasoning_effort });
    } else if (imagePresent) {
      if (typeof model === 'string' && model.startsWith('claude')) { provider = 'dmxapi'; }
      else { provider = 'zhipu'; effModel = VISION_MODEL; }
    }

    // ── 4. Resolve API key (teacher class > own > platform admin > env) ──
    let resolvedApiKey = '';
    try {
      const { data: membership } = await serviceClient
        .from('class_members').select('class_id').eq('student_id', user.id).limit(5);
      if (membership?.length) {
        const classIds = membership.map((m: any) => m.class_id);
        const pf = provider === 'dmxapi' ? ['dmxapi', 'openai', 'anthropic']
          : provider === 'moonshot' ? ['moonshot', 'kimi'] : [provider];
        const { data: teacherKey } = await serviceClient
          .from('ai_api_configs').select('api_key')
          .in('provider', pf).eq('is_active', true).in('class_id', classIds).limit(1).maybeSingle();
        if (teacherKey?.api_key) resolvedApiKey = teacherKey.api_key;
        // 1b: a teacher's "all my classes" key (class_id NULL, scope=class) — owned by a teacher of
        //     one of the student's classes. Without this an "所有班级" key never resolves for students.
        if (!resolvedApiKey) {
          const { data: classRows } = await serviceClient
            .from('classes').select('teacher_id').in('id', classIds);
          const teacherIds = [...new Set((classRows || []).map((c: any) => c.teacher_id).filter(Boolean))];
          if (teacherIds.length) {
            const { data: allClassKey } = await serviceClient
              .from('ai_api_configs').select('api_key')
              .in('provider', pf).eq('is_active', true).is('class_id', null).in('owner_id', teacherIds).limit(1).maybeSingle();
            if (allClassKey?.api_key) resolvedApiKey = allClassKey.api_key;
          }
        }
      }
      if (!resolvedApiKey) {
        const pf = provider === 'dmxapi' ? ['dmxapi', 'openai', 'anthropic']
          : provider === 'moonshot' ? ['moonshot', 'kimi'] : [provider];
        const { data: ownKey } = await serviceClient
          .from('ai_api_configs').select('api_key')
          .in('provider', pf).eq('owner_id', user.id).eq('is_active', true).limit(1).maybeSingle();
        if (ownKey?.api_key) resolvedApiKey = ownKey.api_key;
      }
      if (!resolvedApiKey) {
        const pf = provider === 'dmxapi' ? ['dmxapi', 'openai', 'anthropic']
          : provider === 'moonshot' ? ['moonshot', 'kimi'] : [provider];
        const { data: adminKey } = await serviceClient
          .from('ai_api_configs').select('api_key')
          .in('provider', pf).eq('scope', 'platform').eq('is_active', true).limit(1).maybeSingle();
        if (adminKey?.api_key) resolvedApiKey = adminKey.api_key;
      }

      // Priority 4 (PILOT ONLY): ANY active key for this provider — lets a teacher's
      // class-scoped key serve students not yet enrolled. This is cross-tenant by design,
      // so it is gated behind PILOT_OPEN_KEYS (default off). Enable only for an open single-class pilot.
      if (!resolvedApiKey && Deno.env.get('PILOT_OPEN_KEYS') === 'true') {
        const pf = provider === 'dmxapi' ? ['dmxapi', 'openai', 'anthropic']
          : provider === 'moonshot' ? ['moonshot', 'kimi'] : [provider];
        const { data: anyKey } = await serviceClient
          .from('ai_api_configs').select('api_key')
          .in('provider', pf).eq('is_active', true).not('api_key', 'is', null).limit(1).maybeSingle();
        if (anyKey?.api_key) resolvedApiKey = anyKey.api_key;
      }
    } catch (_) { /* fall through to env key */ }
    if (!resolvedApiKey) resolvedApiKey = resolvePlatformKey(provider);
    if (!resolvedApiKey) {
      return new Response(JSON.stringify({ error: '该模型暂未配置 API Key，请联系教师或管理员添加' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiUrl = resolveEndpoint(provider);
    const baseParams = buildBaseParams(effModel, provider, { thinking, reasoning_effort, response_format });

    // ── 5a-team. MULTI-AGENT ORCHESTRATOR (research team) — plan → parallel specialists → synthesize ──
    if (team && !imagePresent) {
      let tavilyKey = Deno.env.get('TAVILY_API_KEY') || '';
      try {
        const { data: tv } = await serviceClient
          .from('ai_api_configs').select('api_key')
          .eq('provider', 'tavily').eq('is_active', true).not('api_key', 'is', null).limit(1).maybeSingle();
        if (tv?.api_key) tavilyKey = tv.api_key;
      } catch (_) { /* no tavily key */ }
      const ctx: ToolCtx = { serviceClient, user, course_id: course_id || null, resolvedApiKey, tavilyKey, userToken: authHeader || undefined, apiUrl, model: effModel, attachedFile: (attached_file && attached_file.name && attached_file.b64) ? { name: String(attached_file.name), b64: String(attached_file.b64) } : undefined };
      const streamOut = new ReadableStream({
        start: (controller) => runOrchestrator(controller, { apiUrl, key: resolvedApiKey, model: effModel, messages, ctx, tavily: !!tavilyKey }),
      });
      return new Response(streamOut, { headers: SSE_HEADERS });
    }

    // ── 5a. AGENT MODE (tool-calling) ── always streams its result ──
    //   (skipped when an image is present — the vision model glm-4v-flash has no tool-calling)
    if (use_agent && !imagePresent) {
      // Tavily web-search key — teacher-configurable via ai_api_configs(provider='tavily'). Best-effort.
      let tavilyKey = Deno.env.get('TAVILY_API_KEY') || '';
      try {
        const { data: tv } = await serviceClient
          .from('ai_api_configs').select('api_key')
          .eq('provider', 'tavily').eq('is_active', true).not('api_key', 'is', null).limit(1).maybeSingle();
        if (tv?.api_key) tavilyKey = tv.api_key;
      } catch (_) { /* no tavily key configured */ }

      const ctx: ToolCtx = { serviceClient, user, course_id: course_id || null, resolvedApiKey, tavilyKey, userToken: authHeader || undefined, apiUrl, model: effModel, attachedFile: (attached_file && attached_file.name && attached_file.b64) ? { name: String(attached_file.name), b64: String(attached_file.b64) } : undefined };
      const tools = [...TOOL_DEFS, DEEP_SEARCH_TOOL, ...(tavilyKey ? [WEB_SEARCH_TOOL] : []), CODE_INTERPRETER_TOOL];
      const webNote = tavilyKey ? '、web_search(联网搜索最新/实时信息，知识库没有时用)' : '';
      const note = `\n\n你具备工具能力：search_knowledge_base(单次检索平台知识库——已含多本统计/学习科学教材与论文)、deep_search(综合/多概念/综述类问题用它，自动把问题拆成多角度检索后合并，召回更全)${webNote}、run_python(需要对数据/表格做计算统计、画图表、或生成 Excel/Word 文件时，在隔离沙箱里跑 Python)、recall_memory(回忆该学生的分型记忆:经历/知识状态/学习偏好——想个性化或延续之前讨论时先回忆)、save_memory(把值得长期记住的内容按 episodic=经历/semantic=关于他的事实与误解/procedural=他怎么学最有效 分型保存,并给 importance)。需要依据或计算时优先调用工具，绝不编造文献或数据。调用工具后，请在回答中自然地说明你查阅了哪些来源（书名/论文/网址）或做了什么计算，便于学生核对。${ctx.attachedFile ? `\n\n注意：用户刚上传了数据文件，已放在沙箱 /data/${ctx.attachedFile.name}，需要分析它时用 run_python 读取（如 pandas.read_csv/read_excel("/data/${ctx.attachedFile.name}")）。` : ''}`;
      const sysIdx = messages.findIndex((m: any) => m.role === 'system');
      const agentMsgs = sysIdx >= 0
        ? messages.map((m: any, i: number) => i === sysIdx ? { ...m, content: m.content + note } : m)
        : [{ role: 'system', content: `你是一位学术研究辅导助手。${note}` }, ...messages];

      const streamOut = new ReadableStream({
        start: (controller) => runAgentStream(controller, { apiUrl, key: resolvedApiKey, baseParams, messages: agentMsgs, ctx, tools }),
      });
      return new Response(streamOut, { headers: SSE_HEADERS });
    }

    // ── 5b. RAG retrieval (non-agent, optional) ──
    let ragContext = '';
    let ragSources: any[] = [];
    if (use_rag) {
      try {
        const queryText = lastUserText(messages);
        if (queryText.length > 5) {
          const vec = await embedQuery(queryText, resolvedApiKey);
          if (vec) {
            const { data: chunks } = await serviceClient.rpc('match_chunks', {
              query_embedding: `[${vec.join(',')}]`, p_user_id: user.id,
              p_course_id: course_id || null, p_layer_filter: layer_filter || null,
              match_count: 6, similarity_threshold: 0.3,
            });
            const { data: memories } = await serviceClient.rpc('match_memories', {
              query_embedding: `[${vec.join(',')}]`, p_user_id: user.id,
              match_count: 3, similarity_threshold: 0.3,
            });
            const allResults = [
              ...(chunks || []).map((c: any) => ({ ...c, origin: 'knowledge' })),
              ...(memories || []).map((m: any) => ({ ...m, source_title: `[过程记忆·${m.memory_type}]`, layer: 4, origin: 'memory' })),
            ].sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, 8);
            if (allResults.length > 0) {
              ragContext = allResults.map((r, i) => `[参考${i + 1}] ${r.source_title || '知识库'}\n${r.content}`).join('\n\n---\n\n');
              ragSources = allResults.map((r) => ({ id: r.id, source_title: r.source_title, layer: r.layer }));
            }
          }
        }
      } catch (ragErr) {
        console.error('RAG retrieval error:', ragErr); // best-effort
      }
    }

    // ── 6. Build final messages with RAG context ──
    let finalMessages = messages;
    if (ragContext) {
      const sysIdx = messages.findIndex((m: any) => m.role === 'system');
      const ragBlock = `\n\n## 相关知识库内容（仅在相关时使用）\n\n${ragContext}\n\n请基于以上参考内容辅助回答，如参考内容与问题不相关则忽略。`;
      finalMessages = sysIdx >= 0
        ? messages.map((m: any, i: number) => i === sysIdx ? { ...m, content: m.content + ragBlock } : m)
        : [{ role: 'system', content: `你是一位学术研究辅导助手。${ragBlock}` }, ...messages];
    }

    // ── 7. Call provider (R2: timeout) ──
    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resolvedApiKey}` },
      body: JSON.stringify({ ...baseParams, messages: finalMessages, stream, ...(stream ? { stream_options: { include_usage: true } } : {}) }),
    }, T_CONNECT);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`AI API Error ${response.status}: ${errText.slice(0, 200)}`);
      return new Response(JSON.stringify({ error: 'AI 服务暂时不可用，请稍后重试' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (stream) {
      const enc = new TextEncoder();
      const prefix = ragSources.length ? enc.encode(`data: ${JSON.stringify({ _rag_sources: ragSources })}\n\n`) : null;
      return new Response(guardedPassthrough(response.body!, prefix), { headers: SSE_HEADERS });
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message && typeof data.choices[0].message.content === 'string') {
      data.choices[0].message.content = stripThinking(data.choices[0].message.content);
    }
    if (ragSources.length > 0 && data && typeof data === 'object' && !Array.isArray(data)) {
      data._rag_sources = ragSources;
    }
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
