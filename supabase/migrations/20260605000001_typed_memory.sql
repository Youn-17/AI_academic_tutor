-- =====================================================
-- Migration: typed memory — importance + recency/importance-weighted retrieval
-- Purpose:  upgrade the flat memory store toward the Hello-Agents (Ch8) memory model.
--           A tutor should weight memories by recency AND importance, and retrieve by type
--           (episodic = past sessions/struggles, semantic = the student's knowledge state /
--           misconceptions, procedural = how they learn best). CONTEXT.md: Memory.
--           Idempotent — safe no-op on the live DB.
-- Created:  2026-06-05
-- =====================================================

alter table public.memories add column if not exists importance real not null default 0.5;

-- Retrieval score = similarity × time_decay × importance_weight  (Ch8 8.2.5).
-- time_decay: 1.0 (now) → 0.6 (old) over a ~45-day scale — recency boost without forgetting.
-- importance_weight: 0.8 (imp 0) → 1.2 (imp 1).
-- p_memory_types: optional type filter (null = all). Extra optional param keeps old call sites working.
drop function if exists public.match_memories(vector, uuid, integer, double precision);
create or replace function public.match_memories(
  query_embedding vector,
  p_user_id uuid,
  match_count integer default 4,
  similarity_threshold double precision default 0.3,
  p_memory_types text[] default null
)
returns table(id uuid, content text, memory_type text, importance real, created_at timestamptz,
              similarity double precision, score double precision)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    m.id, m.content, m.memory_type, coalesce(m.importance, 0.5)::real as importance, m.created_at,
    (1 - (m.embedding <=> query_embedding)) as similarity,
    (1 - (m.embedding <=> query_embedding))
      * (0.6 + 0.4 * exp(- extract(epoch from (now() - m.created_at)) / (45.0 * 86400)))
      * (0.8 + coalesce(m.importance, 0.5) * 0.4)
      as score
  from public.memories m
  where m.embedding is not null
    and m.owner_id = p_user_id
    and (p_memory_types is null or m.memory_type = any(p_memory_types))
    and (1 - (m.embedding <=> query_embedding)) > similarity_threshold
  order by score desc
  limit match_count;
$function$;
grant execute on function public.match_memories(vector, uuid, integer, double precision, text[])
  to authenticated, service_role;
