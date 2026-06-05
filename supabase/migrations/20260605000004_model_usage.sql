-- AI usage monitoring — one row per chat turn: which model/provider, which role/task,
-- token counts, mode, latency. Lets the admin see how each AI is used + spent, to better
-- route tasks to the model that handles them best.
-- RLS: students insert their OWN rows (token counts come from the edge fn via an SSE frame);
-- teachers/admins read only through the SECURITY DEFINER summary RPC (mirrors research_events).

create table if not exists public.model_usage (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  participant_id    uuid not null,                 -- auth user (the student)
  conversation_id   uuid,                          -- session
  message_id        uuid,                          -- the assistant message, if known
  provider          text,                          -- dmxapi | deepseek | zhipu | minimax | ...
  model             text,                          -- model id
  active_role       text,                          -- agent role / task (which AI for which job)
  mode              text,                          -- 'agent' | 'team' | 'direct'
  prompt_tokens     int default 0,
  completion_tokens int default 0,
  total_tokens      int default 0,
  provider_calls    int default 1,                 -- # of provider API calls this turn (tool rounds + final + safety)
  tools             text[] default '{}',           -- tools that ran this turn
  safety_blocked    boolean default false,         -- Ch10 safety self-check rewrote the answer
  duration_ms       int                            -- turn wall-clock
);

create index if not exists model_usage_created_idx on public.model_usage (created_at desc);
create index if not exists model_usage_model_idx   on public.model_usage (model, created_at desc);
create index if not exists model_usage_role_idx    on public.model_usage (active_role, created_at desc);

alter table public.model_usage enable row level security;
revoke all on public.model_usage from anon;
grant insert on public.model_usage to authenticated;     -- students log their own; no SELECT for them
drop policy if exists mu_insert_own on public.model_usage;
create policy mu_insert_own on public.model_usage
  for insert to authenticated with check (participant_id = auth.uid());

-- Admin/teacher read path: aggregated, role-gated. Returns everything a dashboard needs in one call.
create or replace function public.model_usage_summary(days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare caller_role text; result jsonb;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('admin', 'supervisor') then
    raise exception 'forbidden: model usage requires teacher/admin role';
  end if;
  with u as (
    select * from model_usage where created_at > now() - make_interval(days => days)
  )
  select jsonb_build_object(
    'by_model', (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select model, provider,
               count(*) as turns,
               coalesce(sum(total_tokens), 0) as tokens,
               coalesce(sum(prompt_tokens), 0) as prompt_tokens,
               coalesce(sum(completion_tokens), 0) as completion_tokens,
               round(avg(nullif(total_tokens, 0)))::int as avg_tokens
        from u group by model, provider order by tokens desc nulls last) r),
    'by_role', (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select active_role, model,
               count(*) as turns,
               coalesce(sum(total_tokens), 0) as tokens
        from u where active_role is not null
        group by active_role, model order by turns desc) r),
    'by_day', (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select to_char(date_trunc('day', created_at), 'MM-DD') as day,
               coalesce(sum(total_tokens), 0) as tokens,
               count(*) as turns
        from u group by 1 order by 1) r),
    'totals', (select jsonb_build_object(
        'turns', count(*),
        'tokens', coalesce(sum(total_tokens), 0),
        'safety_blocks', coalesce(sum(case when safety_blocked then 1 else 0 end), 0)
      ) from u)
  ) into result;
  return result;
end; $$;

grant execute on function public.model_usage_summary(int) to authenticated;
