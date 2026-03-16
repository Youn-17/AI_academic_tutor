-- =====================================================
-- Migration: Seed admin account
-- =====================================================
-- 操作步骤：
-- 1. 先在 Supabase Dashboard -> Authentication -> Users 中手动创建管理员账号
--    建议邮箱: admin@yourapp.com（改为实际管理员邮箱）
-- 2. 创建后，on_auth_user_created 触发器会将其 role 设为 'student'（默认）
-- 3. 运行本 migration，将该用户的 role 修正为 'admin'
--
-- ⚠️ 将下方的 email 替换为实际管理员邮箱后再执行
-- =====================================================

DO $$
DECLARE
  v_admin_email TEXT := 'admin@yourapp.com'; -- ← 修改为实际管理员邮箱
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE email = v_admin_email;

  IF v_count = 0 THEN
    RAISE EXCEPTION '管理员账号不存在：%。请先在 Supabase Dashboard 中创建该用户。', v_admin_email;
  END IF;

  UPDATE public.profiles
    SET role = 'admin'
    WHERE email = v_admin_email;

  RAISE NOTICE '管理员账号已成功设置：%', v_admin_email;
END
$$;
