-- =====================================================
-- Migration: Fix storage bucket security
-- 将 documents bucket 改为私有，添加 RLS 策略
-- =====================================================

-- 1. 将 documents bucket 设为私有（如果存在的话）
UPDATE storage.buckets
  SET public = false
  WHERE id = 'documents';

-- 如果 bucket 不存在，先创建
INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. 清理旧策略
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can read student documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- 3. 用户只能上传到自己 user_id 对应的目录下
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. 用户只能读取自己上传的文件
CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. 督导可以读取所有学生的文件
CREATE POLICY "Supervisors can read student documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

-- 6. 管理员可以读取所有文件
CREATE POLICY "Admin can read all documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 7. 用户可以删除自己的文件
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
