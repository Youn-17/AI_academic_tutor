-- =====================================================
-- Migration 2: 收紧 RLS —— 修复致命的 allow_all=true 漏洞
-- ⚠️ 行为变更(安全):
--   1) 删除 profiles/conversations/messages/ai_settings 上 `allow_all (USING true)`
--      —— 现状是任何登录用户能读写所有人的资料/聊天(等于没有 RLS)。
--   2) 删除"导师可看全平台所有 conversations/messages/profiles"。
--   3) 改为:导师只能看/介入【自己班级】学生的数据。
--   保留:本人访问、admin 策略、以及已有的 "Admin can view consented ..."。
--   说明:导师对【自己班级】学生的可见性是【教学】功能(按班级成员判定),
--        不按研究 consent 门控;研究用途的 consent 门控在 migration 1 的研究表上。
-- Created: 2026-06-03
-- =====================================================

-- helper:该学生是否在"查看者(导师)所教的班级"里(仅班级成员,不含 consent)
create or replace function public.is_class_student_of(p_student uuid, p_viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    where cm.student_id = p_student
      and c.teacher_id  = p_viewer
  );
$$;

-- ===== 1. 删除危险/过宽策略 =====
drop policy if exists allow_all on public.profiles;
drop policy if exists allow_all on public.conversations;
drop policy if exists allow_all on public.messages;
drop policy if exists allow_all on public.ai_settings;
drop policy if exists "Supervisors can view all conversations" on public.conversations;
drop policy if exists "Supervisors can view all messages"      on public.messages;
drop policy if exists "Supervisors can view student profiles"  on public.profiles;

-- ===== 2. 班级范围的导师访问 =====

-- profiles:导师可看【自己班级】学生的 profile
drop policy if exists sup_view_class_profiles on public.profiles;
create policy sup_view_class_profiles on public.profiles
  for select using ( public.is_class_student_of(id, (select auth.uid())) );

-- conversations:导师可【查看】+【标记(flag=update status)】自己班级学生的对话
drop policy if exists sup_view_class_conversations on public.conversations;
create policy sup_view_class_conversations on public.conversations
  for select using ( public.is_class_student_of(user_id, (select auth.uid())) );
drop policy if exists sup_flag_class_conversations on public.conversations;
create policy sup_flag_class_conversations on public.conversations
  for update using ( public.is_class_student_of(user_id, (select auth.uid())) );

-- messages:导师可【查看】+【插入介入消息(sender='supervisor')】自己班级学生对话里的消息
drop policy if exists sup_view_class_messages on public.messages;
create policy sup_view_class_messages on public.messages
  for select using ( exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and public.is_class_student_of(c.user_id, (select auth.uid()))
  ) );
drop policy if exists sup_intervene_class_messages on public.messages;
create policy sup_intervene_class_messages on public.messages
  for insert with check ( sender = 'supervisor' and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and public.is_class_student_of(c.user_id, (select auth.uid()))
  ) );

-- 保留(不动):
--   profiles:  "Users can view own profile" / "Admin can view all profiles" / "Admin can update any profile"
--   conversations: "Users can view/create/update/delete own conversations" / "Admin can view consented conversations"
--   messages:  "Users can view/insert messages in own conversations" / "Admin can view consented messages"
--   ai_settings: "Users can manage own settings"
