-- ai_api_configs table (if not exists)
CREATE TABLE IF NOT EXISTS public.ai_api_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type    text NOT NULL CHECK (owner_type IN ('admin', 'teacher')),
  scope         text NOT NULL CHECK (scope IN ('platform', 'class')),
  class_id      uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider IN ('deepseek', 'zhipu')),
  model         text NOT NULL,
  api_key       text NOT NULL,
  label         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_api_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage own configs" ON public.ai_api_configs;
CREATE POLICY "Owners can manage own configs"
  ON public.ai_api_configs FOR ALL
  USING (owner_id = auth.uid());

-- save_api_config RPC (SECURITY DEFINER — bypasses RLS for the insert/update)
CREATE OR REPLACE FUNCTION public.save_api_config(
  p_provider    text,
  p_model       text,
  p_api_key     text,
  p_class_id    uuid    DEFAULT NULL,
  p_label       text    DEFAULT NULL,
  p_config_id   uuid    DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role        text;
  v_owner_type  text;
  v_scope       text;
  v_id          uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

  IF v_role NOT IN ('admin', 'supervisor') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_role = 'admin' THEN
    v_owner_type := 'admin';
    v_scope      := 'platform';
  ELSE
    v_owner_type := 'teacher';
    v_scope      := 'class';
  END IF;

  IF length(trim(p_api_key)) < 16 THEN
    RAISE EXCEPTION 'API Key too short';
  END IF;

  IF p_config_id IS NOT NULL THEN
    -- Update existing
    UPDATE ai_api_configs SET
      provider   = p_provider,
      model      = p_model,
      api_key    = trim(p_api_key),
      class_id   = p_class_id,
      label      = p_label,
      is_active  = true,
      updated_at = now()
    WHERE id = p_config_id AND owner_id = auth.uid()
    RETURNING id INTO v_id;
  ELSE
    -- Insert new
    INSERT INTO ai_api_configs
      (owner_id, owner_type, scope, provider, model, api_key, class_id, label)
    VALUES
      (auth.uid(), v_owner_type, v_scope, p_provider, p_model, trim(p_api_key), p_class_id, p_label)
    RETURNING id INTO v_id;
  END IF;

  RETURN json_build_object(
    'ok',         true,
    'id',         v_id,
    'masked_key', repeat('•', 8) || right(trim(p_api_key), 6)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_api_config TO authenticated;
