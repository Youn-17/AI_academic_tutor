// Embedding Edge Function
// Generates text embeddings via DMXAPI (OpenAI-compatible) or Zhipu
// Deployment: supabase functions deploy embed --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DMXAPI_URL   = 'https://www.dmxapi.cn/v1/embeddings';
const ZHIPU_URL    = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
const OPENAI_URL   = 'https://api.openai.com/v1/embeddings';

const DMXAPI_API_KEY  = Deno.env.get('DMXAPI_API_KEY')  || '';
const ZHIPU_API_KEY   = Deno.env.get('ZHIPU_API_KEY')   || '';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Default embedding model — 1536-dim, OpenAI compatible via DMXAPI
const DEFAULT_EMBED_MODEL    = 'text-embedding-3-small';
const DEFAULT_EMBED_PROVIDER = 'dmxapi';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmbedRequest {
  text: string | string[];
  provider?: 'dmxapi' | 'zhipu' | 'openai';
  model?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, provider = DEFAULT_EMBED_PROVIDER, model = DEFAULT_EMBED_MODEL }: EmbedRequest = await req.json();

    if (!text || (Array.isArray(text) && text.length === 0)) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve endpoint and key
    let apiUrl = DMXAPI_URL;
    let apiKey = DMXAPI_API_KEY;
    let embedModel = model;

    if (provider === 'zhipu') {
      apiUrl = ZHIPU_URL;
      apiKey = ZHIPU_API_KEY;
      embedModel = model || 'embedding-3';
    } else if (provider === 'openai') {
      apiUrl = OPENAI_URL;
      // Look up from DB (same pattern as chat function)
      apiKey = DMXAPI_API_KEY; // fallback to DMXAPI key which proxies OpenAI
    }

    // If no platform key, try resolving from owner's ai_api_configs
    if (!apiKey) {
      const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const providerFilter = provider === 'zhipu' ? ['zhipu'] : ['dmxapi', 'openai', 'anthropic'];
      const { data: ownKey } = await serviceClient
        .from('ai_api_configs')
        .select('api_key')
        .in('provider', providerFilter)
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();
      if (ownKey?.api_key) apiKey = ownKey.api_key;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No embedding API key configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call embedding API
    const input = Array.isArray(text) ? text : [text];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: embedModel, input }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`Embedding API error ${response.status}: ${errText.slice(0, 200)}`);
      return new Response(JSON.stringify({ error: 'Embedding service unavailable' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    // OpenAI-compatible response: data.data[i].embedding
    const embeddings: number[][] = data.data.map((d: { embedding: number[] }) => d.embedding);

    return new Response(
      JSON.stringify({
        embeddings,
        model: embedModel,
        dimensions: embeddings[0]?.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Embed function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
