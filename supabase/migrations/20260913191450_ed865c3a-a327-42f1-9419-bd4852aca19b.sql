
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_slug_unique ON public.quizzes (slug);

CREATE OR REPLACE FUNCTION public.quiz_slug_available(p_slug text, p_exclude_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_slug IS NOT NULL
     AND p_slug <> ''
     AND NOT EXISTS (
       SELECT 1 FROM public.quizzes q
       WHERE q.slug = p_slug
         AND (p_exclude_id IS NULL OR q.id <> p_exclude_id)
     );
$$;

REVOKE ALL ON FUNCTION public.quiz_slug_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quiz_slug_available(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.quiz_suggest_slug(p_slug text, p_exclude_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text := NULLIF(regexp_replace(lower(coalesce(p_slug,'')), '(^-+|-+$)', '', 'g'), '');
  candidate text;
  i int := 2;
BEGIN
  IF base IS NULL THEN base := 'quiz'; END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.slug = candidate AND (p_exclude_id IS NULL OR q.id <> p_exclude_id)
  ) LOOP
    candidate := base || '-' || i;
    i := i + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_suggest_slug(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quiz_suggest_slug(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_quiz(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
  WHERE q.slug = p_slug AND q.status = 'published';
$$;
