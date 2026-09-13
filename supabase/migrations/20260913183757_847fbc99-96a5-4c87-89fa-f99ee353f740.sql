CREATE TABLE public.quiz_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  name text,
  email text,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, session_id)
);

GRANT SELECT, DELETE ON public.quiz_leads TO authenticated;
GRANT ALL ON public.quiz_leads TO service_role;

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own quiz leads"
ON public.quiz_leads FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_leads.quiz_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners can delete own quiz leads"
ON public.quiz_leads FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_leads.quiz_id AND q.user_id = auth.uid()));

CREATE INDEX quiz_leads_quiz_created_idx ON public.quiz_leads (quiz_id, created_at DESC);

CREATE TRIGGER quiz_leads_set_updated_at
BEFORE UPDATE ON public.quiz_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leitura pública apenas de quizzes publicados (sem expor user_id)
CREATE OR REPLACE FUNCTION public.get_public_quiz(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', q.id,
    'name', q.name,
    'slug', q.slug,
    'settings', q.settings,
    'sections', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'type', s.type,
        'title', s.title,
        'position', s.position,
        'settings', s.settings,
        'elements', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', e.id,
            'type', e.type,
            'position', e.position,
            'content', e.content,
            'settings', e.settings
          ) ORDER BY e.position)
          FROM public.quiz_elements e WHERE e.section_id = s.id
        ), '[]'::jsonb)
      ) ORDER BY s.position)
      FROM public.quiz_sections s WHERE s.quiz_id = q.id
    ), '[]'::jsonb)
  )
  FROM public.quizzes q
  WHERE q.slug = p_slug AND q.status = 'published'
  ORDER BY q.updated_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_quiz(text) TO anon, authenticated;

-- Inserção pública controlada de leads (um registro por quiz + sessão)
CREATE OR REPLACE FUNCTION public.submit_quiz_lead(
  p_quiz_id uuid,
  p_session_id text,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = p_quiz_id AND q.status = 'published') THEN
    RAISE EXCEPTION 'quiz indisponivel';
  END IF;
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RAISE EXCEPTION 'sessao invalida';
  END IF;

  INSERT INTO public.quiz_leads (quiz_id, session_id, name, email, whatsapp)
  VALUES (p_quiz_id, left(trim(p_session_id), 80), left(nullif(trim(p_name), ''), 120),
          left(nullif(trim(p_email), ''), 200), left(nullif(trim(p_whatsapp), ''), 40))
  ON CONFLICT (quiz_id, session_id) DO UPDATE
    SET name = EXCLUDED.name, email = EXCLUDED.email,
        whatsapp = EXCLUDED.whatsapp, updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_lead(uuid, text, text, text, text) TO anon, authenticated;