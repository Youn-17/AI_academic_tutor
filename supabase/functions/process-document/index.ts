// Process Document Edge Function
// Reads a document from Storage, chunks it, generates embeddings, stores in resource_chunks
// Called asynchronously after document upload
// Deployment: supabase functions deploy process-document --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DMXAPI_URL  = 'https://www.dmxapi.cn/v1/embeddings';
const ZHIPU_URL   = 'https://open.bigmodel.cn/api/paas/v4/embeddings';

const DMXAPI_API_KEY = Deno.env.get('DMXAPI_API_KEY') || '';
const ZHIPU_API_KEY  = Deno.env.get('ZHIPU_API_KEY')  || '';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EMBED_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE  = 800;   // tokens approx (chars / 4 ~ tokens)
const CHUNK_OVERLAP = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Text chunking ──────────────────────────────────────────────────────
function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const sentences = text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.。！？!?\n])\s*/g)
    .filter(s => s.trim().length > 0);

  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize * 4) {
      if (current.trim()) chunks.push(current.trim());
      // Overlap: keep last `overlap` chars
      current = current.slice(-overlap * 4) + sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length >= 20);
}

// ── Generate embeddings (batch) ────────────────────────────────────────
async function embedTexts(texts: string[], apiKey: string, provider = 'dmxapi'): Promise<number[][]> {
  const url   = provider === 'zhipu' ? ZHIPU_URL : DMXAPI_URL;
  const model = provider === 'zhipu' ? 'embedding-3' : EMBED_MODEL;

  // Batch in groups of 20 to avoid token limits
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += 20) {
    const batch = texts.slice(i, i + 20);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: batch }),
    });
    if (!resp.ok) throw new Error(`Embedding API ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    all.push(...data.data.map((d: { embedding: number[] }) => d.embedding));
  }
  return all;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { document_id, text_content }: { document_id: string; text_content?: string } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load document metadata
    const { data: doc, error: docErr } = await serviceClient
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (doc.owner_id !== user.id) {
      // Allow supervisors/admins
      const { data: profile } = await serviceClient
        .from('profiles').select('role').eq('id', user.id).single();
      if (!profile || !['supervisor', 'admin'].includes(profile.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Mark processing
    await serviceClient.from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    // ── Get text ────────────────────────────────────────────────────────
    let fullText = text_content || '';

    // If no text provided but there's a storage_path, fetch from Storage
    if (!fullText && doc.storage_path) {
      const { data: fileData } = await serviceClient.storage
        .from('documents')
        .download(doc.storage_path);
      if (fileData) {
        // For plain text/markdown files; PDF parsing would need a separate service
        fullText = await fileData.text();
      }
    }

    if (!fullText || fullText.trim().length < 20) {
      await serviceClient.from('documents')
        .update({ processing_status: 'failed', processing_error: 'No text content extracted' })
        .eq('id', document_id);
      return new Response(JSON.stringify({ error: 'No extractable text' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Chunk ──────────────────────────────────────────────────────────
    const chunks = chunkText(fullText);
    if (chunks.length === 0) {
      await serviceClient.from('documents')
        .update({ processing_status: 'failed', processing_error: 'Chunking produced no content' })
        .eq('id', document_id);
      return new Response(JSON.stringify({ error: 'No chunks produced' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Resolve embedding API key ──────────────────────────────────────
    let apiKey = DMXAPI_API_KEY;
    if (!apiKey) {
      const { data: ownKey } = await serviceClient
        .from('ai_api_configs')
        .select('api_key')
        .in('provider', ['dmxapi', 'openai'])
        .eq('owner_id', doc.owner_id)
        .eq('is_active', true)
        .limit(1)
        .single();
      if (ownKey?.api_key) apiKey = ownKey.api_key;
    }

    if (!apiKey) {
      await serviceClient.from('documents')
        .update({ processing_status: 'failed', processing_error: 'No embedding API key' })
        .eq('id', document_id);
      return new Response(JSON.stringify({ error: 'No embedding API key configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Generate embeddings ────────────────────────────────────────────
    const embeddings = await embedTexts(chunks, apiKey);

    // ── Delete old chunks for this document ────────────────────────────
    await serviceClient.from('resource_chunks').delete().eq('document_id', document_id);

    // ── Insert new chunks ──────────────────────────────────────────────
    const rows = chunks.map((content, i) => ({
      document_id,
      owner_id:    doc.owner_id,
      layer:       doc.layer,
      visibility:  doc.visibility,
      course_id:   doc.course_id,
      content,
      chunk_index: i,
      embedding:   `[${embeddings[i].join(',')}]`,
      source_title: doc.title,
      token_count: Math.round(content.length / 4),
    }));

    const { error: insertErr } = await serviceClient.from('resource_chunks').insert(rows);
    if (insertErr) throw insertErr;

    // ── Update document status ─────────────────────────────────────────
    await serviceClient.from('documents').update({
      processing_status: 'completed',
      chunk_count:       chunks.length,
      embed_model:       EMBED_MODEL,
    }).eq('id', document_id);

    return new Response(
      JSON.stringify({ ok: true, chunk_count: chunks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('process-document error:', error);
    // Mark failed
    try {
      const body = await req.json().catch(() => ({})) as { document_id?: string };
      if (body.document_id) {
        await serviceClient.from('documents').update({
          processing_status: 'failed',
          processing_error: String(error),
        }).eq('id', body.document_id);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
