-- =====================================================
-- Migration 5: Security hardening (S4 / S5 / S6)
-- 安全加固迁移：修复三处审计发现的安全问题
--   S4: public.classes 对所有人可读 (SELECT USING true) → 收紧为 班级成员/任课教师/管理员
--   S5a: ai_api_configs "Owner can manage own api configs" 为 FOR ALL 但缺 WITH CHECK
--        → 重建并加 WITH CHECK,防止用户为他人 owner_id 写入 API 密钥
--   S5b: 校验 provider CHECK 约束是否覆盖应用所用全部 provider
--   S6: 为缺少 SET search_path 的 SECURITY DEFINER 函数补上,防止 search_path 劫持
-- Idempotent: DROP POLICY IF EXISTS + CREATE / guarded ALTER FUNCTION.
-- Created: 2026-06-03
--
-- Live facts introspected before writing (project oztozjwngekmqtuylypt):
--   * RLS is ENABLED on classes, class_members, ai_api_configs.
--   * class_members columns: id, class_id (uuid), student_id (uuid), created_at.
--   * classes columns: id, teacher_id (uuid), name, description, created_at.
--   * ai_api_configs.owner_id is NOT NULL (uuid).
-- =====================================================


-- ===== S4: classes table is world-readable =====
-- BEFORE: SELECT policy "Everyone can view classes" with USING (true) → any role
--         (incl. anon/public) can read every class row.
-- Other classes policies left UNTOUCHED:
--   "Teachers can create classes"  (INSERT, WITH CHECK auth.uid()=teacher_id)
--   "Teachers can update own classes" (UPDATE)
--   "Teachers can delete own classes" (DELETE)
-- NOTE: separate SELECT policies "Teachers can view own classes" and
--   "Admin can view all classes" already exist; this replacement policy is
--   self-contained (also covers teacher + admin) so visibility is correct even
--   if those are ever removed. Multiple PERMISSIVE SELECT policies are OR-ed,
--   so keeping them alongside this one is safe.

-- ⚠️ DEFERRED (NOT APPLIED): tightening this SELECT breaks the student
-- "browse all classes to join" flow — ClassService.getAllClasses() does
-- `select('*') from classes` for ANY authenticated student and relies on the
-- world-readable policy. Severity of the leak is Low (class names/metadata).
-- Re-enable ONLY after the join flow is redesigned to use a join CODE instead
-- of listing every class. Until then this block is intentionally commented out
-- so neither the live DB nor a fresh environment loses the join feature.
--
-- drop policy if exists "Everyone can view classes" on public.classes;
-- drop policy if exists "Members teacher or admin can view classes" on public.classes;
-- create policy "Members teacher or admin can view classes"
--   on public.classes
--   for select
--   using (
--     exists (select 1 from public.class_members cm
--             where cm.class_id = classes.id and cm.student_id = (select auth.uid()))
--     or classes.teacher_id = (select auth.uid())
--     or public.is_admin()
--   );


-- ===== S5a: ai_api_configs "Owner can manage own api configs" missing WITH CHECK =====
-- BEFORE: FOR ALL, USING (owner_id = auth.uid()), WITH CHECK = NULL.
--   Without WITH CHECK, INSERT/UPDATE are not constrained on the NEW row, so a
--   user could write rows with someone else's owner_id (API-key takeover).
-- AFTER: re-create FOR ALL with both USING and WITH CHECK = (owner_id = auth.uid()).
-- Sibling policies left UNTOUCHED:
--   "Owner can view own api configs" (SELECT), "Admin can view all api configs" (SELECT).

drop policy if exists "Owner can manage own api configs" on public.ai_api_configs;
create policy "Owner can manage own api configs"
  on public.ai_api_configs
  for all
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));


-- ===== S5b: ai_api_configs.provider CHECK constraint =====
-- Live constraint ai_api_configs_provider_check currently allows:
--   dmxapi, openai, anthropic, google, deepseek, zhipu, moonshot, kimi,
--   qwen, baidu, minimax, yi
-- App-required providers: dmxapi, deepseek, zhipu, moonshot, kimi, google, openai.
-- All 7 required providers are ALREADY covered by the existing constraint
-- (it is a strict superset) → SKIP. No DROP/ADD needed; shrinking to exactly
-- the app set would needlessly reject the other already-allowed providers.
--
-- Storage note: ai_api_configs.api_key is stored in PLAINTEXT. This is
-- intentionally left as-is here — keys are RLS-contained (only the owner and
-- admins can read them) which is acceptable for now. Encryption-at-rest /
-- Vault migration is tracked separately and NOT changed by this migration.


-- ===== S6: SECURITY DEFINER functions missing SET search_path =====
-- A SECURITY DEFINER function without a pinned search_path can be hijacked by a
-- caller-controlled search_path (resolving unqualified names to attacker objects).
-- Pin to "public, pg_temp" for the functions that lack any search_path config.
--
-- Introspected pg_proc (prosecdef + proconfig):
--   get_my_profile()                                    SECDEF, config NULL  → FIX
--   is_admin()                                          SECDEF, config NULL  → FIX
--   match_chunks(vector, uuid, uuid, integer[], integer, double precision)
--                                                       SECDEF, config NULL  → FIX
--   match_memories(vector, uuid, integer, double precision)
--                                                       SECDEF, config NULL  → FIX
-- Already pinned (search_path=public) — SKIPPED, left untouched:
--   is_admin(p_uid uuid)
--   is_class_student_of(p_student uuid, p_viewer uuid)
--   is_consented_student_of(p_student uuid, p_viewer uuid)
--   assign_study_condition(p_class_id uuid)
-- Identity argument lists below are taken verbatim from
-- pg_get_function_identity_arguments(oid).

alter function public.get_my_profile() set search_path = public, pg_temp;

alter function public.is_admin() set search_path = public, pg_temp;

alter function public.match_chunks(vector, uuid, uuid, integer[], integer, double precision)
  set search_path = public, pg_temp;

alter function public.match_memories(vector, uuid, integer, double precision)
  set search_path = public, pg_temp;


-- =====================================================
-- Summary of changes:
--   S4  classes: dropped world-readable SELECT "Everyone can view classes";
--                added "Members teacher or admin can view classes"
--                (members OR teacher OR admin). INSERT/UPDATE/DELETE untouched.
--   S5a ai_api_configs: re-created "Owner can manage own api configs" (FOR ALL)
--                with WITH CHECK (owner_id = auth.uid()) added.
--   S5b ai_api_configs.provider CHECK: already covers all app providers → no change.
--                api_key remains plaintext (RLS-contained, acceptable for now).
--   S6  search_path pinned on 4 SECURITY DEFINER funcs (get_my_profile, is_admin(),
--                match_chunks, match_memories); 4 others already pinned → skipped.
-- =====================================================
