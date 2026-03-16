-- Add UPDATE policy for classes to allow teachers to modify their own classes (e.g. rename)
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
CREATE POLICY "Teachers can update own classes" ON public.classes 
  FOR UPDATE 
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);
