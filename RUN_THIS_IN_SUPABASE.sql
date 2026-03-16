-- RUN THIS IN SUPABASE SQL EDITOR

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
  UNIQUE(class_id, student_id)
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- 3. Policies

-- Classes: Teachers can create and manage their own
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can view own classes" ON public.classes FOR SELECT USING (auth.uid() = teacher_id);
-- Allow students to view classes to verify ID before joining (or we can restrict this if we want invite-only)
CREATE POLICY "Everyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Teachers can delete own classes" ON public.classes FOR DELETE USING (auth.uid() = teacher_id);

-- Class Members: Students join, Teachers manage
CREATE POLICY "Students can join classes" ON public.class_members FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own memberships" ON public.class_members FOR SELECT USING (auth.uid() = student_id);

-- Teachers can view members of their OWN classes
CREATE POLICY "Teachers can view class memberships" ON public.class_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid())
);
-- Teachers can remove members
CREATE POLICY "Teachers can remove class members" ON public.class_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid())
);
