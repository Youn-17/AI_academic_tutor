-- ============================================================================
-- 20260603000006_rate_limit.sql
-- S1 fix: cross-isolate rate limiting backed by Postgres (the edge function's
-- in-memory Map resets per isolate, so it cannot actually bound abuse/cost).
-- Adds a tiny hits table + a SECURITY DEFINER check function the chat edge
-- function calls best-effort (falls back to in-memory if this RPC is absent).
-- Idempotent.
-- ============================================================================

create table if not exists public.rate_limit_hits (
  id      bigint generated always as identity primary key,
  user_id uuid not null,
  hit_at  timestamptz not null default now()
);
create index if not exists idx_rate_limit_hits_user_time
  on public.rate_limit_hits (user_id, hit_at);

-- Only the SECURITY DEFINER function (service_role) ever touches this table.
alter table public.rate_limit_hits enable row level security;

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_max     integer default 20,
  p_window  integer default 60
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cnt integer;
begin
  -- prune this user's old hits
  delete from public.rate_limit_hits
    where user_id = p_user_id
      and hit_at < now() - make_interval(secs => p_window);

  select count(*) into cnt from public.rate_limit_hits
    where user_id = p_user_id
      and hit_at > now() - make_interval(secs => p_window);

  if cnt >= p_max then
    return false;
  end if;

  insert into public.rate_limit_hits (user_id) values (p_user_id);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(uuid, integer, integer) from public;
grant execute on function public.check_rate_limit(uuid, integer, integer) to service_role;

-- ============================================================================
-- Summary: rate_limit_hits (RLS on, no policies = locked to service_role) +
-- check_rate_limit(user, max, window) returns false when over limit, else logs
-- the hit and returns true. Pruning is per-user and incremental.
-- ============================================================================
