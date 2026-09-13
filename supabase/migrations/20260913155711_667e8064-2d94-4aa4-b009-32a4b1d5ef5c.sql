CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Novo Quiz',
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quizzes_status_check CHECK (status IN ('draft','published')),
  CONSTRAINT quizzes_user_slug_unique UNIQUE (user_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quizzes" ON public.quizzes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quiz_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'content',
  title text NOT NULL DEFAULT 'Seção',
  position integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_sections_type_check CHECK (type IN ('cover','content','question','result','capture'))
);
CREATE INDEX quiz_sections_quiz_id_idx ON public.quiz_sections(quiz_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sections TO authenticated;
GRANT ALL ON public.quiz_sections TO service_role;
ALTER TABLE public.quiz_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quiz sections" ON public.quiz_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.user_id = auth.uid()));

CREATE TABLE public.quiz_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.quiz_sections(id) ON DELETE CASCADE,
  type text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_elements_type_check CHECK (type IN ('text','image','video','button','options','progress','percentage','fields'))
);
CREATE INDEX quiz_elements_section_id_idx ON public.quiz_elements(section_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_elements TO authenticated;
GRANT ALL ON public.quiz_elements TO service_role;
ALTER TABLE public.quiz_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quiz elements" ON public.quiz_elements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quiz_sections s JOIN public.quizzes q ON q.id = s.quiz_id
    WHERE s.id = section_id AND q.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_sections s JOIN public.quizzes q ON q.id = s.quiz_id
    WHERE s.id = section_id AND q.user_id = auth.uid()));

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_sections_updated_at BEFORE UPDATE ON public.quiz_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_elements_updated_at BEFORE UPDATE ON public.quiz_elements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();