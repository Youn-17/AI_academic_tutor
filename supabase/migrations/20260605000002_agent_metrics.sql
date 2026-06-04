-- =====================================================
-- Migration: educational-agent behaviour metrics (research ③)
-- Purpose:  compute epistemic-agency / scaffolding metrics from research_events for the npj
--           study — follow-up rate (active engagement), scaffold ratio (Socratic vs direct),
--           tools-per-response (evidence grounding), agency actions (edits/role switches),
--           split by A/B condition. Teacher/admin gated. Idempotent.
-- Created:  2026-06-05
-- =====================================================

create or replace function public.research_agent_metrics()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare caller_role text; out jsonb;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('admin', 'supervisor') then
    raise exception 'forbidden: research metrics require teacher/admin role';
  end if;

  select jsonb_build_object(
    'computed_at', now(),
    'note', 'Educational-agent behaviour metrics from research_events; fills as students interact.',
    'by_condition', coalesce((
      select jsonb_agg(jsonb_build_object(
        'condition', case when g = 1 then '(all)' else coalesce(cond, '(non-participant)') end,
        'n_participants', n_part,
        'n_sessions', n_sess,
        'n_queries', n_q,
        'follow_up_rate', round(case when n_q > 0 then n_fu::numeric / n_q else 0 end, 3),
        'n_ai_responses', n_ai,
        'scaffold_ratio', round(case when n_ai > 0 then n_scaffold::numeric / n_ai else 0 end, 3),
        'tools_per_response', round(case when n_ai > 0 then n_tool::numeric / n_ai else 0 end, 3),
        'n_edits', n_edit,
        'n_role_switches', n_role,
        'events_per_session', round(case when n_sess > 0 then n_ev::numeric / n_sess else 0 end, 2)
      ) order by g desc, cond nulls last)
      from (
        select
          grouping(condition) as g, condition as cond,
          count(distinct participant_id) n_part,
          count(distinct session_id) n_sess,
          count(*) n_ev,
          count(*) filter (where event_type = 'student_query') n_q,
          count(*) filter (where event_type = 'student_query' and event_subtype = 'follow_up') n_fu,
          count(*) filter (where event_type = 'ai_response') n_ai,
          count(*) filter (where event_type = 'ai_response' and coalesce(event_subtype, '') <> 'direct') n_scaffold,
          count(*) filter (where event_type = 'tool_invoked') n_tool,
          count(*) filter (where event_subtype = 'edit_resend') n_edit,
          count(*) filter (where event_type = 'role_switched') n_role
        from research_events
        group by grouping sets ((condition), ())
      ) s
    ), '[]'::jsonb)
  ) into out;
  return out;
end
$fn$;
grant execute on function public.research_agent_metrics() to authenticated;
