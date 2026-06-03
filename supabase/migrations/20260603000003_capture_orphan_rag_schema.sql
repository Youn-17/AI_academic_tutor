-- ============================================================================
-- 20260603000003_capture_orphan_rag_schema.sql
-- FAITHFUL CAPTURE of objects hand-built directly on the live DB (no prior migration).
-- Generated from live catalogs (pg_get_functiondef / pg_get_constraintdef /
-- pg_get_indexdef / format_type). Idempotent:
--   * existing live DB -> no-op (IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS)
--   * fresh environment -> rebuilds tables, indexes, RLS, RPCs in dependency order.
-- Captured: documents, resource_chunks, memories, consent_requests (tables);
--          get_my_profile, match_chunks, match_memories (SECURITY DEFINER RPCs).
-- Capture-to-file only; does NOT change live behavior.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---- table: public.documents ----------------------------------------
create table if not exists public.documents (
  "id" uuid default gen_random_uuid() not null,
  "owner_id" uuid not null,
  "created_by_role" text,
  "layer" integer default 2,
  "visibility" text default 'private'::text,
  "course_id" uuid,
  "project_id" uuid,
  "title" text not null,
  "description" text,
  "resource_type" text,
  "source_type" text,
  "storage_path" text,
  "file_size" bigint,
  "page_count" integer,
  "mime_type" text,
  "saved_paper_id" uuid,
  "processing_status" text default 'pending'::text,
  "processing_error" text,
  "chunk_count" integer default 0,
  "embed_model" text,
  "is_sensitive" boolean default false,
  "can_use_for_training" boolean default false,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  constraint "documents_pkey" PRIMARY KEY (id),
  constraint "documents_course_id_fkey" FOREIGN KEY (course_id) REFERENCES classes(id) ON DELETE SET NULL,
  constraint "documents_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint "documents_project_id_fkey" FOREIGN KEY (project_id) REFERENCES research_projects(id) ON DELETE SET NULL,
  constraint "documents_saved_paper_id_fkey" FOREIGN KEY (saved_paper_id) REFERENCES saved_papers(id) ON DELETE SET NULL,
  constraint "documents_created_by_role_check" CHECK ((created_by_role = ANY (ARRAY['student'::text, 'supervisor'::text, 'admin'::text]))),
  constraint "documents_layer_check" CHECK (((layer >= 1) AND (layer <= 4))),
  constraint "documents_processing_status_check" CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))),
  constraint "documents_resource_type_check" CHECK ((resource_type = ANY (ARRAY['pdf'::text, 'docx'::text, 'txt'::text, 'note'::text, 'proposal'::text, 'journal_article'::text, 'annotation'::text, 'summary'::text, 'guideline'::text, 'reading_note'::text, 'intervention_note'::text]))),
  constraint "documents_source_type_check" CHECK ((source_type = ANY (ARRAY['upload'::text, 'search_import'::text, 'ai_generated'::text, 'teacher_provided'::text, 'platform_preset'::text]))),
  constraint "documents_visibility_check" CHECK ((visibility = ANY (ARRAY['global'::text, 'course'::text, 'team'::text, 'private'::text, 'teacher_only'::text, 'admin_only'::text, 'teacher_and_owner'::text])))
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_layer ON public.documents USING btree (layer);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON public.documents USING btree (visibility);
CREATE INDEX IF NOT EXISTS idx_documents_course ON public.documents USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents USING btree (processing_status);
alter table public.documents enable row level security;
drop policy if exists "course_documents_readable" on public.documents;
create policy "course_documents_readable" on public.documents as permissive for select to public
  using (((visibility = 'course'::text) AND ((EXISTS ( SELECT 1
   FROM class_members
  WHERE ((class_members.class_id = documents.course_id) AND (class_members.student_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = documents.course_id) AND (classes.teacher_id = auth.uid())))))));
drop policy if exists "global_documents_readable" on public.documents;
create policy "global_documents_readable" on public.documents as permissive for select to public
  using ((visibility = 'global'::text));
drop policy if exists "owner_manage_documents" on public.documents;
create policy "owner_manage_documents" on public.documents as permissive for all to public
  using ((owner_id = auth.uid()));
drop policy if exists "supervisor_read_all_documents" on public.documents;
create policy "supervisor_read_all_documents" on public.documents as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['supervisor'::text, 'admin'::text]))))));

-- ---- table: public.resource_chunks ----------------------------------------
create table if not exists public.resource_chunks (
  "id" uuid default gen_random_uuid() not null,
  "document_id" uuid not null,
  "owner_id" uuid not null,
  "layer" integer,
  "visibility" text,
  "course_id" uuid,
  "content" text not null,
  "chunk_index" integer not null,
  "embedding" vector(1536),
  "source_title" text,
  "page_number" integer,
  "token_count" integer,
  "created_at" timestamp with time zone default now(),
  constraint "resource_chunks_pkey" PRIMARY KEY (id),
  constraint "resource_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  constraint "resource_chunks_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  constraint "resource_chunks_layer_check" CHECK (((layer >= 1) AND (layer <= 4)))
);
CREATE INDEX IF NOT EXISTS idx_resource_chunks_embedding ON public.resource_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX IF NOT EXISTS idx_resource_chunks_document ON public.resource_chunks USING btree (document_id);
CREATE INDEX IF NOT EXISTS idx_resource_chunks_owner ON public.resource_chunks USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_resource_chunks_layer ON public.resource_chunks USING btree (layer);
alter table public.resource_chunks enable row level security;
drop policy if exists "course_chunks_readable" on public.resource_chunks;
create policy "course_chunks_readable" on public.resource_chunks as permissive for select to public
  using (((visibility = 'course'::text) AND ((EXISTS ( SELECT 1
   FROM class_members
  WHERE ((class_members.class_id = resource_chunks.course_id) AND (class_members.student_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = resource_chunks.course_id) AND (classes.teacher_id = auth.uid())))))));
drop policy if exists "global_chunks_readable" on public.resource_chunks;
create policy "global_chunks_readable" on public.resource_chunks as permissive for select to public
  using ((visibility = 'global'::text));
drop policy if exists "owner_manage_chunks" on public.resource_chunks;
create policy "owner_manage_chunks" on public.resource_chunks as permissive for all to public
  using ((owner_id = auth.uid()));
drop policy if exists "supervisor_read_all_chunks" on public.resource_chunks;
create policy "supervisor_read_all_chunks" on public.resource_chunks as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['supervisor'::text, 'admin'::text]))))));

-- ---- table: public.memories ----------------------------------------
create table if not exists public.memories (
  "id" uuid default gen_random_uuid() not null,
  "owner_id" uuid not null,
  "memory_type" text not null,
  "conversation_id" uuid,
  "document_id" uuid,
  "course_id" uuid,
  "project_id" uuid,
  "content" text not null,
  "embedding" vector(1536),
  "visibility" text default 'private'::text,
  "is_teacher_feedback" boolean default false,
  "created_by_role" text,
  "created_at" timestamp with time zone default now(),
  constraint "memories_pkey" PRIMARY KEY (id),
  constraint "memories_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  constraint "memories_course_id_fkey" FOREIGN KEY (course_id) REFERENCES classes(id) ON DELETE SET NULL,
  constraint "memories_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  constraint "memories_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint "memories_project_id_fkey" FOREIGN KEY (project_id) REFERENCES research_projects(id) ON DELETE SET NULL,
  constraint "memories_memory_type_check" CHECK ((memory_type = ANY (ARRAY['conversation_summary'::text, 'teacher_intervention'::text, 'reading_progress'::text, 'research_progress'::text, 'decision_log'::text, 'pain_point'::text, 'todo'::text])))
);
CREATE INDEX IF NOT EXISTS idx_memories_owner ON public.memories USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON public.memories USING btree (memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_course ON public.memories USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON public.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists='50');
alter table public.memories enable row level security;
drop policy if exists "owner_manage_memories" on public.memories;
create policy "owner_manage_memories" on public.memories as permissive for all to public
  using ((owner_id = auth.uid()));
drop policy if exists "supervisor_view_memories" on public.memories;
create policy "supervisor_view_memories" on public.memories as permissive for select to public
  using (((visibility <> 'private'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['supervisor'::text, 'admin'::text])))))));

-- ---- table: public.consent_requests ----------------------------------------
create table if not exists public.consent_requests (
  "id" uuid default gen_random_uuid() not null,
  "admin_id" uuid not null,
  "teacher_id" uuid not null,
  "student_id" uuid not null,
  "class_id" uuid not null,
  "teacher_token" uuid default gen_random_uuid() not null,
  "student_token" uuid default gen_random_uuid() not null,
  "teacher_consent" boolean,
  "student_consent" boolean,
  "status" text default 'pending'::text not null,
  "reason" text not null,
  "expires_at" timestamp with time zone default (now() + '7 days'::interval) not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "consent_requests_pkey" PRIMARY KEY (id),
  constraint "consent_requests_admin_id_teacher_id_student_id_class_id_key" UNIQUE (admin_id, teacher_id, student_id, class_id),
  constraint "consent_requests_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint "consent_requests_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  constraint "consent_requests_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint "consent_requests_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint "consent_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'both_approved'::text, 'teacher_rejected'::text, 'student_rejected'::text, 'expired'::text])))
);
CREATE INDEX IF NOT EXISTS idx_consent_teacher_token ON public.consent_requests USING btree (teacher_token);
CREATE INDEX IF NOT EXISTS idx_consent_student_token ON public.consent_requests USING btree (student_token);
CREATE INDEX IF NOT EXISTS idx_consent_teacher_id ON public.consent_requests USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_consent_student_id ON public.consent_requests USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_consent_admin_id ON public.consent_requests USING btree (admin_id);
alter table public.consent_requests enable row level security;
drop policy if exists "Admin can create consent requests" on public.consent_requests;
create policy "Admin can create consent requests" on public.consent_requests as permissive for insert to public
  with check ((is_admin() AND (admin_id = auth.uid())));
drop policy if exists "Admin can view own consent requests" on public.consent_requests;
create policy "Admin can view own consent requests" on public.consent_requests as permissive for select to public
  using (((admin_id = auth.uid()) AND is_admin()));
drop policy if exists "Student can view own consent requests" on public.consent_requests;
create policy "Student can view own consent requests" on public.consent_requests as permissive for select to public
  using ((student_id = auth.uid()));
drop policy if exists "Teacher can view own consent requests" on public.consent_requests;
create policy "Teacher can view own consent requests" on public.consent_requests as permissive for select to public
  using ((teacher_id = auth.uid()));

-- ====================== FUNCTIONS (SECURITY DEFINER RPCs) ======================
-- ---- function: public.get_my_profile ----------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS SETOF profiles
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$function$
;
grant execute on function public.get_my_profile() to PUBLIC;
grant execute on function public.get_my_profile() to anon;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.get_my_profile() to postgres;
grant execute on function public.get_my_profile() to service_role;

-- ---- function: public.match_chunks ----------------------------------------
CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding vector, p_user_id uuid, p_course_id uuid DEFAULT NULL::uuid, p_layer_filter integer[] DEFAULT NULL::integer[], match_count integer DEFAULT 6, similarity_threshold double precision DEFAULT 0.3)
 RETURNS TABLE(id uuid, document_id uuid, content text, source_title text, layer integer, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    rc.id,
    rc.document_id,
    rc.content,
    rc.source_title,
    rc.layer,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM public.resource_chunks rc
  WHERE
    rc.embedding IS NOT NULL
    AND (p_layer_filter IS NULL OR rc.layer = ANY(p_layer_filter))
    AND (
      rc.visibility = 'global'
      OR rc.owner_id = p_user_id
      OR (rc.visibility = 'course' AND rc.course_id = p_course_id)
    )
    AND 1 - (rc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
$function$
;
grant execute on function public.match_chunks(query_embedding vector, p_user_id uuid, p_course_id uuid, p_layer_filter integer[], match_count integer, similarity_threshold double precision) to PUBLIC;
grant execute on function public.match_chunks(query_embedding vector, p_user_id uuid, p_course_id uuid, p_layer_filter integer[], match_count integer, similarity_threshold double precision) to anon;
grant execute on function public.match_chunks(query_embedding vector, p_user_id uuid, p_course_id uuid, p_layer_filter integer[], match_count integer, similarity_threshold double precision) to authenticated;
grant execute on function public.match_chunks(query_embedding vector, p_user_id uuid, p_course_id uuid, p_layer_filter integer[], match_count integer, similarity_threshold double precision) to postgres;
grant execute on function public.match_chunks(query_embedding vector, p_user_id uuid, p_course_id uuid, p_layer_filter integer[], match_count integer, similarity_threshold double precision) to service_role;

-- ---- function: public.match_memories ----------------------------------------
CREATE OR REPLACE FUNCTION public.match_memories(query_embedding vector, p_user_id uuid, match_count integer DEFAULT 4, similarity_threshold double precision DEFAULT 0.3)
 RETURNS TABLE(id uuid, content text, memory_type text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    m.id,
    m.content,
    m.memory_type,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.memories m
  WHERE
    m.embedding IS NOT NULL
    AND m.owner_id = p_user_id
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$function$
;
grant execute on function public.match_memories(query_embedding vector, p_user_id uuid, match_count integer, similarity_threshold double precision) to PUBLIC;
grant execute on function public.match_memories(query_embedding vector, p_user_id uuid, match_count integer, similarity_threshold double precision) to anon;
grant execute on function public.match_memories(query_embedding vector, p_user_id uuid, match_count integer, similarity_threshold double precision) to authenticated;
grant execute on function public.match_memories(query_embedding vector, p_user_id uuid, match_count integer, similarity_threshold double precision) to postgres;
grant execute on function public.match_memories(query_embedding vector, p_user_id uuid, match_count integer, similarity_threshold double precision) to service_role;

