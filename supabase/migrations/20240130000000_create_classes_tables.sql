-- =====================================================
-- AI Academic Tutor - Database Schema Migration
-- Version: 002_class_management
-- Created: 2026-01-30
-- =====================================================

-- 1. 班级表
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 班级成员表 (学生与班级的关联)
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id) -- Prevent duplicate joining
);

-- =====================================================
-- RLS Policies (Row Level Security)
-- =====================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- 1. Classes Policies
-- 教师可以创建班级
CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- 教师可以查看自己创建的班级
CREATE POLICY "Teachers can view own classes" ON public.classes
  FOR SELECT USING (auth.uid() = teacher_id);

-- 学生可以查看所有班级 (为了验证 ID 加入)
-- 或者更严格：只能根据 ID 查找特定的班级
CREATE POLICY "Students can view all classes" ON public.classes
  FOR SELECT USING (true); 

-- 教师可以删除自己的班级
CREATE POLICY "Teachers can delete own classes" ON public.classes
  FOR DELETE USING (auth.uid() = teacher_id);


-- 2. Class Members Policies
-- 学生可以加入班级 (Insert own membership)
CREATE POLICY "Students can join classes" ON public.class_members
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 学生可以查看自己加入的班级
CREATE POLICY "Students can view own memberships" ON public.class_members
  FOR SELECT USING (auth.uid() = student_id);

-- 教师可以查看自己班级的所有成员
CREATE POLICY "Teachers can view class memberships" ON public.class_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid()
    )
  );

-- 教师可以移除班级成员
CREATE POLICY "Teachers can remove class members" ON public.class_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid()
    )
  );
