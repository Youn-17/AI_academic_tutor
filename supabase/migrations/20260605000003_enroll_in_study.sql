-- =====================================================
-- Migration: in-app study enrollment / informed consent
-- Purpose:  let a student record informed consent AND get a balanced A/B condition in one atomic,
--           idempotent call. Replaces the missing enrollment step (consent was never collected in
--           app, so participants stayed consent_status='pending' and got no condition).
--           Agree  → consent_status='granted' + balanced condition (the arm with fewer granted wins).
--           Decline→ consent_status='declined' (condition still set to satisfy NOT NULL, but unused;
--                    getMyCondition only returns a condition when status='granted').
--           Idempotent: once a student has responded (granted/declined) the row is never
--           re-randomised or flipped.
-- Created:  2026-06-05
-- =====================================================

create or replace function public.enroll_in_study(p_consent boolean, p_consent_version text default 'v1')
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_uid      uuid := auth.uid();
  v_existing study_participants%rowtype;
  v_cond     text;
  v_status   text;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;

  select * into v_existing from study_participants where user_id = v_uid;

  -- already responded → return as-is, never re-randomise the assignment
  if found and v_existing.consent_status in ('granted', 'declined') then
    return jsonb_build_object('condition', v_existing.condition,
                             'consent_status', v_existing.consent_status, 'already', true);
  end if;

  v_status := case when p_consent then 'granted' else 'declined' end;

  if found then
    -- a 'pending' row exists (e.g. pre-seeded) → record the response, keep its condition
    update study_participants
      set consent_status = v_status, consent_at = now(), consent_version = p_consent_version
      where user_id = v_uid
      returning condition into v_cond;
  else
    -- assign the less-populated arm; tie → random
    select cond into v_cond
    from unnest(array['A_direct', 'B_socratic']) as cond
    left join lateral (
      select count(*) n from study_participants p
      where p.study_code = 'pilot_2026_fall' and p.condition = cond and p.consent_status = 'granted'
    ) cnt on true
    order by cnt.n asc, random()
    limit 1;
    v_cond := coalesce(v_cond, case when random() < 0.5 then 'A_direct' else 'B_socratic' end);

    insert into study_participants (user_id, condition, consent_status, consent_at, consent_version)
      values (v_uid, v_cond, v_status, now(), p_consent_version);
  end if;

  return jsonb_build_object('condition', v_cond, 'consent_status', v_status, 'already', false);
end
$fn$;

grant execute on function public.enroll_in_study(boolean, text) to authenticated;
