// AI Chat Edge Function — DMXAPI / DeepSeek / Zhipu / Moonshot / Google proxy
// Features: provider routing, server-resolved keys, RAG, A/B prompts (client-side),
//   tool-calling AGENT loop (search KB / papers / memory), DeepSeek thinking +
//   reasoning_content routing, JSON mode, robust timeouts & guarded streaming.
// Deployment: supabase functions deploy chat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── API Endpoints ─────────────────────────────────────────
const DMXAPI_URL    = 'https://www.dmxapi.cn/v1/chat/completions';
const DEEPSEEK_URL  = 'https://api.deepseek.com/v1/chat/completions';
const ZHIPU_URL     = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MOONSHOT_URL  = 'https://api.moonshot.cn/v1/chat/completions';
const GOOGLE_URL    = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// ── Platform API Keys (env fallbacks) ─────────────────────
const DMXAPI_API_KEY    = Deno.env.get('DMXAPI_API_KEY')    || '';
const DEEPSEEK_API_KEY  = Deno.env.get('DEEPSEEK_API_KEY')  || '';
const ZHIPU_API_KEY     = Deno.env.get('ZHIPU_API_KEY')     || '';
const MOONSHOT_API_KEY  = Deno.env.get('MOONSHOT_API_KEY')  || '';
const GOOGLE_API_KEY    = Deno.env.get('GOOGLE_API_KEY')    || '';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SUPPORTED_PROVIDERS = ['dmxapi', 'deepseek', 'zhipu', 'moonshot', 'kimi', 'google'] as const;
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
function hasImage(messages: any[]): boolean {
  return messages.some((m) => Array.isArray(m?.content) && m.content.some((p: any) => p?.type === 'image_url'));
}
function lastUserText(messages: any[]): string {
  const u = [...messages].reverse().find((m: any) => m.role === 'user');
  if (!u) return '';
  if (typeof u.content === 'string') return u.content;
  if (Array.isArray(u.content)) return u.content.filter((p: any) => p?.type === 'text').map((p: any) => p.text || '').join(' ');
  return '';
}

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

// strip leaked <thinking>/<think> blocks from a complete string (agent path).
function stripThinking(s: string): string {
  return (s || '')
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/^[\s\S]*?<\/think(?:ing)?>/i, (m) => (/<think/i.test(m) ? '' : m)) // dangling close
    .trim();
}

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
    description: '回忆该学生过往的对话摘要、研究进展、待办、痛点以及教师反馈。需要延续之前讨论或了解学生背景时调用。',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  }},
  { type: 'function', function: {
    name: 'save_memory',
    description: '当出现值得长期记住的内容（关键决策、研究进展、反复出现的困难、待办）时保存为过程记忆，便于后续辅导延续。',
    parameters: { type: 'object', properties: {
      content: { type: 'string' },
      memory_type: { type: 'string', enum: ['conversation_summary', 'research_progress', 'decision_log', 'pain_point', 'todo'] },
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

interface ToolCtx {
  serviceClient: any;
  user: { id: string };
  course_id: string | null;
  resolvedApiKey: string;
  tavilyKey?: string;
}
type ToolResult = { content: string; sources: any[] };

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
      const ins: any = {
        owner_id: ctx.user.id,
        memory_type: args.memory_type || 'conversation_summary',
        content: String(args.content || ''),
        visibility: 'private',
      };
      if (vec) ins.embedding = `[${vec.join(',')}]`;
      const { error } = await ctx.serviceClient.from('memories').insert(ins);
      return { content: error ? `保存记忆失败：${error.message}` : '已保存到过程记忆。', sources: [] };
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

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const forceFinal = round === MAX_TOOL_ROUNDS;
      // #4: on the forced-final round OMIT tools entirely — DMXAPI/Zhipu proxies
      // often ignore tool_choice:'none' and keep emitting empty tool-call turns.
      const params: any = { ...opts.baseParams, messages: msgs };
      if (!forceFinal) { params.tools = opts.tools; params.tool_choice = 'auto'; }
      const resp = await callProviderJSON(opts.apiUrl, opts.key, params);
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
          send({ _agent_step: { tool: tc.function?.name, args, status: 'running' } });
          const { content, sources } = await executeTool(tc.function?.name, args, opts.ctx);
          if (sources?.length) allSources.push(...sources);
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
          clean = stripThinking(retry.choices?.[0]?.message?.content || '');
        } catch (_) { /* ignore */ }
      }
      if (!clean) clean = '（抱歉，我没能生成有效回答，请换一种问法或重试。）';
      for (let i = 0; i < clean.length; i += 60) {
        send({ choices: [{ index: 0, delta: { content: clean.slice(i, i + 60) } }] });
      }
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
      use_rag = false, use_agent = false, course_id, layer_filter,
      thinking, reasoning_effort, response_format,
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
    else provider = 'dmxapi';

    // ── 4a. Multimodal: if any message carries an image, force a vision-capable route
    //   (deepseek/text models 400 on image parts; glm-4v-flash is free vision; Claude is multimodal).
    const imagePresent = hasImage(messages);
    let effModel: string = model;
    if (imagePresent) {
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

      // Priority 4: ANY active key for this provider (single-class/pilot fallback,
      // so a teacher's class-scoped key works even for students not yet enrolled).
      if (!resolvedApiKey) {
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

      const ctx: ToolCtx = { serviceClient, user, course_id: course_id || null, resolvedApiKey, tavilyKey };
      const tools = tavilyKey ? [...TOOL_DEFS, WEB_SEARCH_TOOL] : TOOL_DEFS;
      const webNote = tavilyKey ? '、web_search(联网搜索最新/实时信息，知识库没有时用)' : '';
      const note = `\n\n你具备工具能力：search_knowledge_base(检索平台知识库——已含多本统计/学习科学教材与论文，稳定可靠，概念或事实依据优先用它)${webNote}、recall_memory(回忆该学生过往)、save_memory(保存关键决策/进展/待办)。需要依据时优先调用工具，绝不编造文献或数据。调用工具后，请在回答中自然地说明你查阅了哪些来源（书名/论文/网址），便于学生核对。`;
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
      body: JSON.stringify({ ...baseParams, messages: finalMessages, stream }),
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
