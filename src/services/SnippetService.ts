import { supabase } from '@/lib/supabase';

/**
 * SnippetService — let a student save a highlighted passage (e.g. part of an AI
 * answer) into their PERSONAL RAG knowledge base, with a required reason.
 *
 * Flow (all client-side; reuses the already-deployed `embed` edge function +
 * the owner-scoped RLS on documents/resource_chunks):
 *   1. embed the text  → 1536-d vector (text-embedding-3-small)
 *   2. insert a `documents` row (owner = student, visibility 'private',
 *      can_use_for_training = true, description = the student's reason)
 *   3. insert a `resource_chunks` row with the embedding
 * The student's own `search_knowledge_base` (match_chunks, owner_id = self)
 * then retrieves it in future conversations.
 */

const EDGE_FN = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string)
  || 'https://oztozjwngekmqtuylypt.supabase.co/functions/v1';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface SavedSnippet { documentId: string; title: string }

export async function saveSnippetToKnowledgeBase(rawText: string, reason: string): Promise<SavedSnippet> {
  const text = (rawText || '').trim();
  const why = (reason || '').trim();
  if (text.length < 4) throw new Error('选中的内容太短了');
  if (text.length > 8000) throw new Error('选中的内容过长，请缩短到 8000 字以内');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const uid = session?.user?.id;
  if (!token || !uid) throw new Error('请先登录');

  // 1. embed via the existing edge function
  let vec: number[] | null = null;
  try {
    const r = await fetch(`${EDGE_FN}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(`嵌入服务返回 ${r.status}`);
    const j = await r.json();
    const v = j?.embeddings?.[0];
    if (Array.isArray(v) && v.length) vec = v;
  } catch (e) {
    throw new Error(`生成向量失败：${(e as Error).message}`);
  }
  if (!vec) throw new Error('未能生成向量，请稍后重试');

  const title = (text.replace(/\s+/g, ' ').slice(0, 40) + (text.length > 40 ? '…' : '')) || '收藏片段';

  // 2. document (owner-scoped → RLS allows the student to insert their own)
  const { data: doc, error: de } = await supabase
    .from('documents')
    .insert({
      owner_id: uid,
      title,
      description: why || null,
      layer: 2,
      visibility: 'private',
      created_by_role: 'student',
      resource_type: 'annotation',
      source_type: 'ai_generated',
      processing_status: 'completed',
      chunk_count: 1,
      embed_model: 'text-embedding-3-small',
      can_use_for_training: true,
    })
    .select('id')
    .single();
  if (de || !doc) throw new Error(`保存失败：${de?.message || '无法创建文档'}`);

  // 3. chunk with the embedding (pgvector accepts the bracketed string form)
  const { error: ce } = await supabase.from('resource_chunks').insert({
    document_id: doc.id,
    owner_id: uid,
    content: text,
    chunk_index: 0,
    embedding: `[${vec.join(',')}]`,
    source_title: title,
    layer: 2,
    visibility: 'private',
  });
  if (ce) {
    // best-effort cleanup so we don't leave an empty document behind
    await supabase.from('documents').delete().eq('id', doc.id);
    throw new Error(`保存失败：${ce.message}`);
  }

  return { documentId: doc.id, title };
}
