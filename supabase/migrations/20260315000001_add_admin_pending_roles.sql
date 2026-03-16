-- =====================================================
-- Migration: Add admin & pending_supervisor roles
-- Fix: Registration trigger no longer trusts client role
-- Add: Admin RLS policies
-- =====================================================

-- 1. 扩展 profiles 表的 role 约束，支持新角色
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'supervisor', 'pending_supervisor', 'admin'));

-- 2. 修复 handle_new_user 触发器，不再信任客户端传入的 role
--    客户端只能通过 requested_role 字段表达意愿
--    服务端强制：requested_role='supervisor' -> 'pending_supervisor'（需等待审核）
--                其他 -> 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_requested_role TEXT;
  v_assigned_role TEXT;
BEGIN
  -- 读取客户端的角色申请（仅作参考，永远不直接信任）
  v_requested_role := NEW.raw_user_meta_data->>'requested_role';

  -- 只允许两种结果：待审核教师 或 学生
  -- admin 角色只能通过管理员手动赋予，永远不能自注册获得
  IF v_requested_role = 'supervisor' THEN
    v_assigned_role := 'pending_supervisor';
  ELSE
    v_assigned_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. Admin RLS Policies
-- =====================================================

-- Admin 可以查看所有用户 profile
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin 可以更新任意用户的 role（用于审批教师申请）
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
CREATE POLICY "Admin can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin 可以查看所有对话
DROP POLICY IF EXISTS "Admin can view all conversations" ON public.conversations;
CREATE POLICY "Admin can view all conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin 可以查看所有消息
DROP POLICY IF EXISTS "Admin can view all messages" ON public.messages;
CREATE POLICY "Admin can view all messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =====================================================
-- 4. 待审核教师申请视图（便于 Admin 查询）
-- =====================================================
CREATE OR REPLACE VIEW public.pending_teacher_applications AS
  SELECT id, email, full_name, department, created_at
  FROM public.profiles
  WHERE role = 'pending_supervisor'
  ORDER BY created_at ASC;
