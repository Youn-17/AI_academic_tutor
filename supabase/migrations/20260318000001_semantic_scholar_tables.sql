-- =====================================================
-- Semantic Scholar Integration Tables
-- Version: 20260318000001
-- =====================================================

-- 1. Literature search logs
-- Records who searched for what, in which conversation
CREATE TABLE IF NOT EXISTS public.literature_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  source TEXT DEFAULT 'semantic_scholar',
  result_count INTEGER DEFAULT 0,
  selected_paper_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Saved papers
-- Records papers saved/bookmarked by users
CREATE TABLE IF NOT EXISTS public.saved_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID, -- Optional: link to future research_projects table
  semantic_scholar_paper_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors_json JSONB DEFAULT '[]'::jsonb,
  year INTEGER,
  abstract TEXT,
  venue TEXT,
  citation_count INTEGER,
  doi TEXT,
  paper_url TEXT,
  open_access_pdf_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  saved_from_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, semantic_scholar_paper_id)
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_literature_search_logs_user ON public.literature_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_literature_search_logs_conversation ON public.literature_search_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_literature_search_logs_created ON public.literature_search_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_papers_owner ON public.saved_papers(owner_id);
CREATE INDEX IF NOT EXISTS idx_saved_papers_project ON public.saved_papers(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_papers_semantic_id ON public.saved_papers(semantic_scholar_paper_id);
CREATE INDEX IF NOT EXISTS idx_saved_papers_tags ON public.saved_papers USING GIN(tags);

-- Enable RLS
ALTER TABLE public.literature_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_papers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: literature_search_logs
CREATE POLICY "Users can view own search logs"
  ON public.literature_search_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search logs"
  ON public.literature_search_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supervisors can view student search logs"
  ON public.literature_search_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE c.teacher_id = auth.uid()
      AND cm.student_id = literature_search_logs.user_id
    )
  );

-- RLS Policies: saved_papers
CREATE POLICY "Users can view own saved papers"
  ON public.saved_papers FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own saved papers"
  ON public.saved_papers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own saved papers"
  ON public.saved_papers FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own saved papers"
  ON public.saved_papers FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Supervisors can view student saved papers"
  ON public.saved_papers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE c.teacher_id = auth.uid()
      AND cm.student_id = saved_papers.owner_id
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_saved_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_papers_updated_at
  BEFORE UPDATE ON public.saved_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_papers_updated_at();

-- Helper function to log search (can be called from Edge Function)
CREATE OR REPLACE FUNCTION public.log_literature_search(
  p_user_id UUID,
  p_conversation_id UUID,
  p_query TEXT,
  p_result_count INTEGER,
  p_selected_paper_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.literature_search_logs (
    user_id, conversation_id, query, result_count, selected_paper_id
  ) VALUES (
    p_user_id, p_conversation_id, p_query, p_result_count, p_selected_paper_id
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
