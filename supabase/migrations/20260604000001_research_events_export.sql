-- =====================================================
-- Migration: research_events log + anonymized export RPC  (audit T3 backfill)
-- Purpose:  version the research-event instrumentation + export that were applied LIVE via
--           the Management API this session, so a fresh environment reproduces them.
--           Idempotent (create if not exists / create or replace) → safe no-op on the live DB.
-- Note:     the earlier interaction_events / authority_events / survey_responses schema lives in
--           20260603000001; `research_events` is the table the live instrumentation + export use
--           (CONTEXT.md: Research event). See ADR-0006 (schema applied via Management API).
-- Created:  2026-06-04
-- =====================================================

-- ── Research event log: the ordered, codeable interaction stream ──────────────
create table if not exists public.research_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,                 -- = auth user id (anonymized at export)
  session_id uuid,                              -- conversation_id (nullable)
  condition text,                               -- A/B condition snapshot at event time
  active_role text,                             -- agent role active
  model text,
  event_type text not null,                     -- student_query|ai_response|tool_invoked|student_action|role_switched|model_switched
  event_subtype text,                           -- new_question|follow_up|socratic|run_python|deep_search|team|save_to_kb|edit|...
  message_id uuid,                              -- link to messages (nullable)
  payload jsonb not null default '{}'::jsonb,   -- extra (text length, tool name, reason, ...)
  created_at timestamptz not null default now()
);
create index if not exists idx_re_participant on public.research_events (participant_id, created_at);
create index if not exists idx_re_session on public.research_events (session_id, created_at);
create index if not exists idx_re_type on public.research_events (event_type);

alter table public.research_events enable row level security;
revoke all on public.research_events from anon;
grant insert on public.research_events to authenticated;     -- students log their own; no SELECT for them
drop policy if exists re_insert_own on public.research_events;
create policy re_insert_own on public.research_events
  for insert to authenticated with check (participant_id = auth.uid());

-- ── One-call research export (teacher/admin only, anonymized, withdrawn excluded) ──
create or replace function public.export_research_bundle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare caller_role text; out jsonb;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('admin','supervisor') then
    raise exception 'forbidden: research export requires teacher/admin role';
  end if;

  with parts as (
    select u.user_id,
      'P' || lpad(dense_rank() over (order by u.user_id)::text, 4, '0') as pid,
      sp.condition, sp.consent_status, sp.study_code, sp.enrolled_at
    from (select distinct user_id from conversations
          union select distinct participant_id from research_events) u
    left join study_participants sp on sp.user_id = u.user_id
    where sp.withdrawn_at is null                 -- non-enrolled kept; withdrawn excluded
  )
  select jsonb_build_object(
    'exported_at', now(),
    'n_participants', (select count(*) from parts),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object(
        'participant_id', pid, 'condition', condition, 'consent_status', consent_status,
        'study_code', study_code, 'enrolled_at', enrolled_at,
        'n_sessions', (select count(*) from conversations c where c.user_id = parts.user_id),
        'n_messages', (select count(*) from messages m join conversations c on c.id = m.conversation_id where c.user_id = parts.user_id),
        'n_events', (select count(*) from research_events re where re.participant_id = parts.user_id)
      ) order by pid), '[]'::jsonb) from parts),
    'sessions', (select coalesce(jsonb_agg(jsonb_build_object(
        'session_id', c.id, 'participant_id', parts.pid, 'status', c.status,
        'created_at', c.created_at, 'updated_at', c.updated_at,
        'n_messages', (select count(*) from messages m where m.conversation_id = c.id)
      ) order by parts.pid, c.created_at), '[]'::jsonb)
      from conversations c join parts on parts.user_id = c.user_id),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object(
        'message_id', m.id, 'session_id', m.conversation_id, 'participant_id', parts.pid,
        'sender', m.sender, 'content', m.content, 'content_type', m.content_type,
        'model_used', m.model_used, 'citations', m.citations, 'created_at', m.created_at
      ) order by m.conversation_id, m.created_at), '[]'::jsonb)
      from messages m join conversations c on c.id = m.conversation_id join parts on parts.user_id = c.user_id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
        'event_id', re.id, 'participant_id', parts.pid, 'session_id', re.session_id,
        'condition', re.condition, 'active_role', re.active_role, 'model', re.model,
        'event_type', re.event_type, 'event_subtype', re.event_subtype,
        'message_id', re.message_id, 'payload', re.payload, 'created_at', re.created_at
      ) order by parts.pid, re.created_at), '[]'::jsonb)
      from research_events re join parts on parts.user_id = re.participant_id)
  ) into out;
  return out;
end
$fn$;
grant execute on function public.export_research_bundle() to authenticated;
