// AI Chat Edge Function - DMXAPI / DeepSeek / Zhipu Proxy
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

// ── Rate limiting (per isolate lifecycle) ─────────────────
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX        = 20;
const RATE_LIMIT_WINDOW_MS  = 60_000;

function checkRateLimit(userId: string): boolean {
  const now   = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

const DMXAPI_EMBED_URL = 'https://www.dmxapi.cn/v1/embeddings';
const EMBED_MODEL      = 'text-embedding-3-small';

interface ChatRequest {
  messages: { role: string; content: string }[];
  provider: string;
  model: string;
  stream?: boolean;
  api_key?: string;   // Ignored — resolved server-side
  base_url?: string;  // Ignored — routing done server-side
  // RAG options
  use_rag?: boolean;
  course_id?: string;
  layer_filter?: number[];  // e.g. [1, 2, 3] — which knowledge layers to search
}

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_MESSAGES_COUNT = 50;

// ── Resolve provider endpoint & API key ───────────────────
function resolveEndpoint(provider: Provider): string {
  if (provider === 'deepseek')                       return DEEPSEEK_URL;
  if (provider === 'zhipu')                          return ZHIPU_URL;
  if (provider === 'moonshot' || provider === 'kimi') return MOONSHOT_URL;
  if (provider === 'google')                         return GOOGLE_URL;
  return DMXAPI_URL; // dmxapi + all others
}

function resolvePlatformKey(provider: Provider): string {
  if (provider === 'deepseek')                       return DEEPSEEK_API_KEY;
  if (provider === 'zhipu')                          return ZHIPU_API_KEY;
  if (provider === 'moonshot' || provider === 'kimi') return MOONSHOT_API_KEY;
  if (provider === 'google')                         return GOOGLE_API_KEY;
  return DMXAPI_API_KEY;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── 1. JWT authentication ─────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. Rate limit ─────────────────────────────────────
  if (!checkRateLimit(user.id)) {
    return new Response(
      JSON.stringify({ error: '请求过于频繁，请稍后再试（每分钟最多 20 次）' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages, provider: rawProvider, model, stream = true, use_rag = false, course_id, layer_filter }: ChatRequest = await req.json();

    // ── 3. Input validation ────────────────────────────
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: '消息格式无效' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (messages.length > MAX_MESSAGES_COUNT) {
      return new Response(
        JSON.stringify({ error: `消息数量超出限制（最多 ${MAX_MESSAGES_COUNT} 条）` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    for (const msg of messages) {
      if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: `单条消息过长（最多 ${MAX_MESSAGE_LENGTH} 个字符）` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Normalise provider
    let provider: Provider;
    if (rawProvider === 'deepseek') {
      provider = 'deepseek';
    } else if (rawProvider === 'zhipu') {
      provider = 'zhipu';
    } else if (rawProvider === 'moonshot' || rawProvider === 'kimi') {
      provider = 'moonshot';
    } else if (rawProvider === 'google') {
      provider = 'google';
    } else {
      // dmxapi, openai, anthropic, or anything else → use DMXAPI
      provider = 'dmxapi';
    }

    // ── 4. Resolve API key (teacher class > platform admin > env) ──
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let resolvedApiKey = '';
    try {
      // Priority 1: teacher's class-scoped key (student must be enrolled)
      const { data: membership } = await serviceClient
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id)
        .limit(5);

      if (membership?.length) {
        const classIds = membership.map((m: { class_id: string }) => m.class_id);

        // Match key by provider; dmxapi also catches openai/anthropic/google
        const providerFilter = provider === 'dmxapi'
          ? ['dmxapi', 'openai', 'anthropic', 'google']
          : provider === 'moonshot'
          ? ['moonshot', 'kimi']
          : [provider];

        const { data: teacherKey } = await serviceClient
          .from('ai_api_configs')
          .select('api_key')
          .in('provider', providerFilter)
          .eq('is_active', true)
          .in('class_id', classIds)
          .limit(1)
          .single();

        if (teacherKey?.api_key) resolvedApiKey = teacherKey.api_key;
      }

      // Priority 2: user's own configured key (teacher using their own AI chat)
      if (!resolvedApiKey) {
        const providerFilter2 = provider === 'dmxapi'
          ? ['dmxapi', 'openai', 'anthropic']
          : provider === 'moonshot'
          ? ['moonshot', 'kimi']
          : [provider];

        const { data: ownKey } = await serviceClient
          .from('ai_api_configs')
          .select('api_key')
          .in('provider', providerFilter2)
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (ownKey?.api_key) resolvedApiKey = ownKey.api_key;
      }

      // Priority 3: platform-wide admin key
      if (!resolvedApiKey) {
        const providerFilter = provider === 'dmxapi'
          ? ['dmxapi', 'openai', 'anthropic']
          : provider === 'moonshot'
          ? ['moonshot', 'kimi']
          : [provider];

        const { data: adminKey } = await serviceClient
          .from('ai_api_configs')
          .select('api_key')
          .in('provider', providerFilter)
          .eq('scope', 'platform')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (adminKey?.api_key) resolvedApiKey = adminKey.api_key;
      }
    } catch (_) { /* fall through to env key */ }

    // Priority 4: environment variable
    if (!resolvedApiKey) {
      resolvedApiKey = resolvePlatformKey(provider);
    }

    if (!resolvedApiKey) {
      return new Response(
        JSON.stringify({ error: '该模型暂未配置 API Key，请联系教师或管理员添加' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = resolveEndpoint(provider);

    // ── 5. RAG retrieval (optional) ────────────────────
    let ragContext = '';
    let ragSources: { id: string; source_title: string; layer: number }[] = [];

    if (use_rag) {
      try {
        // Get the last user message as the query
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        const queryText = lastUserMsg?.content || '';

        if (queryText.length > 5) {
          // Embed the query using DMXAPI (uses same key as chat if available)
          const embedKey = DMXAPI_API_KEY || resolvedApiKey;
          const embedResp = await fetch(DMXAPI_EMBED_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${embedKey}` },
            body: JSON.stringify({ model: EMBED_MODEL, input: [queryText] }),
          });

          if (embedResp.ok) {
            const embedData = await embedResp.json();
            const queryEmbedding: number[] = embedData.data?.[0]?.embedding;

            if (queryEmbedding?.length) {
              // Search chunks with permission filter
              const { data: chunks } = await serviceClient.rpc('match_chunks', {
                query_embedding: `[${queryEmbedding.join(',')}]`,
                p_user_id:       user.id,
                p_course_id:     course_id || null,
                p_layer_filter:  layer_filter || null,
                match_count:     6,
                similarity_threshold: 0.3,
              });

              // Search process memories
              const { data: memories } = await serviceClient.rpc('match_memories', {
                query_embedding:      `[${queryEmbedding.join(',')}]`,
                p_user_id:            user.id,
                match_count:          3,
                similarity_threshold: 0.3,
              });

              const allResults = [
                ...(chunks || []).map((c: { content: string; source_title: string; layer: number; id: string; similarity: number }) =>
                  ({ ...c, origin: 'knowledge' })),
                ...(memories || []).map((m: { content: string; memory_type: string; id: string; similarity: number }) =>
                  ({ ...m, source_title: `[过程记忆·${m.memory_type}]`, layer: 4, origin: 'memory' })),
              ].sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
               .slice(0, 8);

              if (allResults.length > 0) {
                ragContext = allResults
                  .map((r, i) => `[参考${i + 1}] ${r.source_title || '知识库'}\n${r.content}`)
                  .join('\n\n---\n\n');

                ragSources = allResults.map(r => ({
                  id: r.id, source_title: r.source_title, layer: r.layer
                }));
              }
            }
          }
        }
      } catch (ragErr) {
        // RAG is best-effort: log and continue without context
        console.error('RAG retrieval error:', ragErr);
      }
    }

    // ── 6. Build final message array with RAG context ──
    let finalMessages = messages;
    if (ragContext) {
      // Inject retrieved context into the system prompt
      const systemIdx = messages.findIndex(m => m.role === 'system');
      const ragBlock = `\n\n## 相关知识库内容（仅在相关时使用）\n\n${ragContext}\n\n请基于以上参考内容辅助回答，如参考内容与问题不相关则忽略。`;

      if (systemIdx >= 0) {
        finalMessages = messages.map((m, i) =>
          i === systemIdx ? { ...m, content: m.content + ragBlock } : m
        );
      } else {
        finalMessages = [
          { role: 'system', content: `你是一位学术研究辅导助手。${ragBlock}` },
          ...messages,
        ];
      }
    }

    // ── 7. Forward request to AI provider ─────────────
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolvedApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`AI API Error ${response.status}: ${errText.slice(0, 200)}`);
      return new Response(
        JSON.stringify({ error: 'AI 服务暂时不可用，请稍后重试' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    // Attach RAG sources to non-streaming response so client can show citations
    if (ragSources.length > 0) data._rag_sources = ragSources;
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
