// save-api-key Edge Function
// Saves teacher/admin AI API key securely. Frontend never receives full key back.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://techedu.icu';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.slice(7));
    if (authErr || !user) return new Response(JSON.stringify({ error: '认证失败' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check role
    const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { provider, model, api_key, scope, class_id, label, config_id } = body;

    if (!provider || !model || !api_key?.trim()) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Basic format check (no blocking network call — key is tested on first chat use)
    const trimmedKey = api_key.trim();
    if (trimmedKey.length < 16) {
      return new Response(JSON.stringify({ error: 'API Key 格式不正确，请检查密钥长度' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const owner_type = profile.role === 'admin' ? 'admin' : 'teacher';
    const effective_scope = owner_type === 'admin' ? 'platform' : (scope || 'class');

    const record = {
      owner_id: user.id,
      owner_type,
      provider,
      model,
      api_key: trimmedKey,  // stored server-side only
      scope: effective_scope,
      class_id: effective_scope === 'class' ? class_id : null,
      label: label || `${provider} / ${model}`,
      is_active: true,
    };

    let result;
    if (config_id) {
      // Update existing
      const { data, error } = await serviceClient.from('ai_api_configs').update(record).eq('id', config_id).eq('owner_id', user.id).select('id').single();
      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await serviceClient.from('ai_api_configs').insert(record).select('id').single();
      if (error) throw error;
      result = data;
    }

    // Return masked key — never return full key
    const masked = '••••••••' + trimmedKey.slice(-6);

    return new Response(JSON.stringify({ ok: true, id: result.id, masked_key: masked }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('save-api-key error:', err);
    return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
