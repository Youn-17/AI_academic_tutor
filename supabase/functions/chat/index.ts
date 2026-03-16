// AI Chat Edge Function - DeepSeek & 智谱 AI Proxy
// Deployment: supabase functions deploy chat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// API Keys from Supabase secrets (fallback platform keys)
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || '';
const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 速率限制：每个用户每分钟最多 20 次请求（在 isolate 生命周期内）
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

interface ChatRequest {
  messages: { role: string; content: string }[];
  provider: 'deepseek' | 'zhipu';
  model: string;
  stream?: boolean;
}

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_MESSAGES_COUNT = 50;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── 1. JWT 身份验证 ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

  // ── 2. 速率限制 ──────────────────────────────────────────
  if (!checkRateLimit(user.id)) {
    return new Response(
      JSON.stringify({ error: '请求过于频繁，请稍后再试（每分钟最多 20 次）' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages, provider, model, stream = true }: ChatRequest = await req.json();

    // ── 3. 输入校验 ──────────────────────────────────────────
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

    if (!['deepseek', 'zhipu'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: '不支持的 AI 提供商' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. 解析 API Key（优先顺序：教师班级 > 管理员平台 > 环境变量）──
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's class membership to find teacher's class API key
    let resolvedApiKey = '';
    try {
      // Check if user belongs to a class that has a teacher-configured key for this provider
      const { data: membership } = await serviceClient
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id)
        .limit(1);

      if (membership?.length) {
        const classIds = membership.map((m: { class_id: string }) => m.class_id);
        const { data: teacherKey } = await serviceClient
          .from('ai_api_configs')
          .select('api_key')
          .eq('scope', 'class')
          .eq('provider', provider)
          .eq('is_active', true)
          .in('class_id', classIds)
          .limit(1)
          .single();
        if (teacherKey?.api_key) resolvedApiKey = teacherKey.api_key;
      }

      // Fall back to admin platform key
      if (!resolvedApiKey) {
        const { data: adminKey } = await serviceClient
          .from('ai_api_configs')
          .select('api_key')
          .eq('scope', 'platform')
          .eq('provider', provider)
          .eq('is_active', true)
          .limit(1)
          .single();
        if (adminKey?.api_key) resolvedApiKey = adminKey.api_key;
      }
    } catch (_) { /* ignore, use env fallback */ }

    // Final fallback: environment variable secrets
    if (!resolvedApiKey) {
      resolvedApiKey = provider === 'deepseek' ? DEEPSEEK_API_KEY : ZHIPU_API_KEY;
    }

    const apiUrl = provider === 'deepseek' ? DEEPSEEK_API_URL : ZHIPU_API_URL;
    const apiKey = resolvedApiKey;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: '该模型暂未配置，请联系教师或管理员添加 API Key' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      // 不将 AI 服务的原始错误暴露给客户端
      console.error(`AI API Error: ${response.status}`);
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
