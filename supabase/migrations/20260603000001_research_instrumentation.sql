-- =====================================================
-- Migration: Research instrumentation + study consent
-- Purpose: 把平台变成可采集 epistemic-agency / authority 数据的研究工具
--          + per-user A/B(A=普通答题, B=苏格拉底+引用)+ 研究级同意
-- 设计原则: 纯新增表(不改动现有表),可安全 apply。
--          现有表的 RLS 班级隔离修复放在下一个 migration(会改变导师可见范围,需单独评审)。
-- Created: 2026-06-03
-- =====================================================

-- ---------- 0. 通用 helper(供 RLS 复用,security definer 避免递归 RLS)----------
create or replace function public.is_admin(p_uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_uid and role = 'admin');
$$;
-- 注:is_consented_student_of 引用下面才建的 study_participants,
--     SQL 函数建时即校验引用表存在,故定义在建表之后(见第 7.5 节)。

-- ---------- 1. study_participants:研究入组 + A/B 条件 + 当前同意状态 ----------
-- 每个参与者一行。condition 是你的自变量(因果对比的核心)。
create table if not exists public.study_participants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references public.profiles(id) on delete cascade,
  study_code     text not null default 'pilot_2026_fall',
  class_id       uuid references public.classes(id) on delete set null,  -- 用于"班级内随机"
  condition      text not null check (condition in ('A_direct','B_socratic')), -- A=普通答题AI / B=苏格拉底+引用
  enrolled_at    timestamptz not null default now(),
  consent_status text not null default 'pending' check (consent_status in ('pending','granted','withdrawn')),
  consent_version text,            -- 同意书版本(IRB 文本到位后填)
  consent_at     timestamptz,
  withdrawn_at   timestamptz,
  notes          text
);

-- ---------- 2. consent_records:同意/撤回的不可变审计流水(IRB 要的可追溯)----------
-- study_participants 存"当前状态";这张表存"每一次 grant/withdraw 动作"的留痕。
create table if not exists public.consent_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  consent_version text not null,
  action          text not null check (action in ('granted','withdrawn')),
  document_url    text,            -- 当时签署的同意书 URL
  document_hash   text,            -- 同意书内容哈希(防止文本被改后无法追溯)
  acted_at        timestamptz not null default now(),
  metadata        jsonb not null default '{}'
);

-- ---------- 3. interaction_events:轻量级行为埋点(高频、自动)----------
-- 学生/AI/导师的每一个动作。便宜的遥测,后续从中析出 authority_events。
-- 规范 event_type 词表(注释,不做 enum 以便加新事件不用迁移):
--   ai_answer_shown | citation_shown | citation_clicked | answer_copied
--   answer_accepted | answer_edited | prompt_reworded | help_requested
--   asked_supervisor | followup_question | session_start | session_end
create table if not exists public.interaction_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  actor_role      text not null check (actor_role in ('student','supervisor','ai','system')),
  event_type      text not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id      uuid references public.messages(id) on delete set null,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- ---------- 4. authority_events:研究的核心因变量(稀疏、高信号)----------
-- "认识权威/主体性"的关键时刻。可由规则即时打点,或由 LLM/人工事后编码。
--   event_type: accepted_ai_uncritically(无批判接受AI) | challenged_ai(质疑AI)
--              | sought_evidence(要证据/引用) | deferred_to_ai(转向AI而非自主判断)
--              | deferred_to_supervisor(转向导师) | reconciled_conflict(自主调和AI与导师分歧)
create table if not exists public.authority_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id      uuid references public.messages(id) on delete set null,
  event_type      text not null,
  actor_focus     text check (actor_focus in ('ai','supervisor','student','self')),
  evidence_basis  text check (evidence_basis in ('research_supported','method_advice','speculative','none')),
  severity        smallint check (severity between 1 and 5),
  detected_by     text not null default 'rule' check (detected_by in ('rule','llm','human')),
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- ---------- 5. survey_responses:前/中/后测量表(EA + 权威校准量表)----------
create table if not exists public.survey_responses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  instrument     text not null,   -- epistemic_agency | authority_calibration | ...
  wave           text not null check (wave in ('pre','mid','post')),
  item_code      text not null,
  response_value numeric,         -- Likert 数值
  response_text  text,            -- 开放题
  submitted_at   timestamptz not null default now(),
  unique (user_id, instrument, wave, item_code)
);

-- ---------- 6. 索引(外键 + 常用查询路径)----------
create index if not exists idx_sp_user            on public.study_participants(user_id);
create index if not exists idx_sp_condition        on public.study_participants(study_code, condition);
create index if not exists idx_consent_user        on public.consent_records(user_id, acted_at desc);
create index if not exists idx_ievents_user_time   on public.interaction_events(user_id, created_at desc);
create index if not exists idx_ievents_conv        on public.interaction_events(conversation_id);
create index if not exists idx_aevents_user_time   on public.authority_events(user_id, created_at desc);
create index if not exists idx_aevents_conv        on public.authority_events(conversation_id);
create index if not exists idx_survey_user         on public.survey_responses(user_id, instrument, wave);

-- ---------- 7. 班级内平衡随机:把同一班级的学生尽量均分到 A/B ----------
-- 为什么"班级内"随机:5 个导师=5 个簇,班级内分到两臂,可平衡掉"导师/班级"混淆。
create or replace function public.assign_study_condition(p_class_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare n_a int; n_b int;
begin
  select
    count(*) filter (where sp.condition = 'A_direct'),
    count(*) filter (where sp.condition = 'B_socratic')
  into n_a, n_b
  from public.study_participants sp
  join public.class_members cm on cm.student_id = sp.user_id
  where cm.class_id = p_class_id;

  if    n_a < n_b then return 'A_direct';
  elsif n_b < n_a then return 'B_socratic';
  else  return (array['A_direct','B_socratic'])[1 + floor(random()*2)::int];  -- 持平时随机
  end if;
end;
$$;

-- ---------- 7.5 该学生是否为"查看者(导师)班级内、且已同意"的研究参与者 ----------
-- 用于 RLS 伦理闸门:导师只能看自己班级 + 已 consent 的学生。定义在建表之后。
create or replace function public.is_consented_student_of(p_student uuid, p_viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.class_members cm
    join public.classes c             on c.id = cm.class_id
    join public.study_participants sp on sp.user_id = cm.student_id
    where cm.student_id = p_student
      and c.teacher_id  = p_viewer
      and sp.consent_status = 'granted'
  );
$$;

-- =====================================================
-- 8. RLS:三类可见性 = 本人 / 导师(仅自己班级+已同意)/ admin
--    写入:本人可写自己的 consent 与 survey;事件由本人(自身)或服务端(service_role 绕过 RLS)写。
--    authority_events 一般由服务端/编码者写,学生不可读(避免影响行为)。
-- =====================================================
alter table public.study_participants enable row level security;
alter table public.consent_records    enable row level security;
alter table public.interaction_events enable row level security;
alter table public.authority_events   enable row level security;
alter table public.survey_responses   enable row level security;

-- study_participants:本人可读自己入组信息;导师读自己班级+同意者;admin 全读+管理
drop policy if exists sp_self_read on public.study_participants;
create policy sp_self_read on public.study_participants
  for select using ( user_id = (select auth.uid()) );
drop policy if exists sp_supervisor_read on public.study_participants;
create policy sp_supervisor_read on public.study_participants
  for select using ( public.is_consented_student_of(user_id, (select auth.uid())) );
drop policy if exists sp_admin_all on public.study_participants;
create policy sp_admin_all on public.study_participants
  for all using ( public.is_admin((select auth.uid())) ) with check ( public.is_admin((select auth.uid())) );

-- consent_records:本人可读/写自己的同意流水;admin 全读
drop policy if exists cr_self_rw on public.consent_records;
create policy cr_self_rw on public.consent_records
  for select using ( user_id = (select auth.uid()) );
drop policy if exists cr_self_insert on public.consent_records;
create policy cr_self_insert on public.consent_records
  for insert with check ( user_id = (select auth.uid()) );
drop policy if exists cr_admin_read on public.consent_records;
create policy cr_admin_read on public.consent_records
  for select using ( public.is_admin((select auth.uid())) );

-- interaction_events:本人写自己的;本人读自己的;导师读自己班级+同意者;admin 全读
drop policy if exists ie_self_insert on public.interaction_events;
create policy ie_self_insert on public.interaction_events
  for insert with check ( user_id = (select auth.uid()) );
drop policy if exists ie_self_read on public.interaction_events;
create policy ie_self_read on public.interaction_events
  for select using ( user_id = (select auth.uid()) );
drop policy if exists ie_supervisor_read on public.interaction_events;
create policy ie_supervisor_read on public.interaction_events
  for select using ( public.is_consented_student_of(user_id, (select auth.uid())) );
drop policy if exists ie_admin_read on public.interaction_events;
create policy ie_admin_read on public.interaction_events
  for select using ( public.is_admin((select auth.uid())) );

-- authority_events:学生不可读(避免影响行为);导师读自己班级+同意者;admin 全读+写
drop policy if exists ae_supervisor_read on public.authority_events;
create policy ae_supervisor_read on public.authority_events
  for select using ( public.is_consented_student_of(user_id, (select auth.uid())) );
drop policy if exists ae_admin_all on public.authority_events;
create policy ae_admin_all on public.authority_events
  for all using ( public.is_admin((select auth.uid())) ) with check ( public.is_admin((select auth.uid())) );

-- survey_responses:本人读写自己;导师读自己班级+同意者;admin 全读
drop policy if exists sr_self_insert on public.survey_responses;
create policy sr_self_insert on public.survey_responses
  for insert with check ( user_id = (select auth.uid()) );
drop policy if exists sr_self_read on public.survey_responses;
create policy sr_self_read on public.survey_responses
  for select using ( user_id = (select auth.uid()) );
drop policy if exists sr_supervisor_read on public.survey_responses;
create policy sr_supervisor_read on public.survey_responses
  for select using ( public.is_consented_student_of(user_id, (select auth.uid())) );
drop policy if exists sr_admin_read on public.survey_responses;
create policy sr_admin_read on public.survey_responses
  for select using ( public.is_admin((select auth.uid())) );

-- 注:edge function 用 service_role 调用时绕过 RLS,可代写 authority_events / 批量 enroll。
