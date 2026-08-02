
-- 1) Ampliar search_keywords
ALTER TABLE public.search_keywords
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 1;

-- 2) Seed keywords (apenas se a tabela estiver vazia)
INSERT INTO public.search_keywords (word, category, language, country, priority, is_active)
SELECT w.word, w.category, 'BR', 'BR', 1, true
FROM (VALUES
  ('mentoria individual','Mentorias'),
  ('mentoria em grupo','Mentorias'),
  ('acompanhamento personalizado','Mentorias'),
  ('consultoria','Mentorias'),
  ('baixe o app','Aplicativos'),
  ('aplicativo grátis','Aplicativos'),
  ('disponível na play store','Aplicativos'),
  ('disponível na app store','Aplicativos'),
  ('curso online','Info'),
  ('mentoria','Info'),
  ('método','Info'),
  ('aprenda a','Info'),
  ('transformação','Info'),
  ('ebook','Info'),
  ('e-book','Info'),
  ('pdf','Info'),
  ('apostila','Info'),
  ('curso','Info'),
  ('aula online','Info'),
  ('treinamento','Info'),
  ('workshop','Info'),
  ('low ticket','Info'),
  ('mini curso','Info'),
  ('emagrecer','Nutra'),
  ('dieta','Nutra'),
  ('perder peso','Nutra'),
  ('detox','Nutra'),
  ('queima de gordura','Nutra'),
  ('chá','Nutra'),
  ('chá emagrecedor','Nutra'),
  ('receitas','Nutra'),
  ('receitas fit','Nutra'),
  ('cardápio','Nutra'),
  ('suplemento','Nutra'),
  ('shake','Nutra'),
  ('reconquistar','Relacionamento'),
  ('conquistar homem','Relacionamento'),
  ('conquistar mulher','Relacionamento'),
  ('seu ex','Relacionamento'),
  ('sedução','Relacionamento'),
  ('mentoria de relacionamento','Relacionamento'),
  ('terapia de casal','Relacionamento'),
  ('texto que reconquista','Relacionamento'),
  ('renda extra','Finanças'),
  ('investir','Finanças'),
  ('dinheiro online','Finanças'),
  ('liberdade financeira','Finanças'),
  ('ganhar dinheiro','Finanças'),
  ('curso de investimento','Finanças'),
  ('planilha financeira','Finanças'),
  ('mentoria financeira','Finanças'),
  ('aplicativo de finanças','Finanças'),
  ('ansiedade','Saúde'),
  ('sono','Saúde'),
  ('bem-estar','Saúde'),
  ('natural','Saúde'),
  ('remédio caseiro','Saúde'),
  ('remédio natural','Saúde'),
  ('chá calmante','Saúde'),
  ('suplemento natural','Saúde'),
  ('receita caseira','Saúde')
) AS w(word, category)
WHERE NOT EXISTS (SELECT 1 FROM public.search_keywords);

-- 3) Seed blacklist (apenas se vazia)
INSERT INTO public.blacklist_words (word, category, kind, is_active)
SELECT b.word, b.category, 'contém', true
FROM (VALUES
  ('vereador','Política'),
  ('deputado','Política'),
  ('prefeito','Política'),
  ('prefeitura','Política'),
  ('mandato','Política'),
  ('reeleição','Política'),
  ('candidato','Política'),
  ('senador','Política'),
  ('governador','Política'),
  ('câmara municipal','Política'),
  ('eleições','Política'),
  ('urnas','Política'),
  ('dramabox','Entretenimento'),
  ('drama box','Entretenimento'),
  ('short drama','Entretenimento'),
  ('webnovel','Entretenimento'),
  ('reelscene','Entretenimento'),
  ('goodshort','Entretenimento'),
  ('dublado','Entretenimento'),
  ('capítulos','Entretenimento'),
  ('novela','Entretenimento'),
  ('reencarnação','Entretenimento'),
  ('assista a série','Entretenimento'),
  ('clique para ler mais capítulos','Entretenimento')
) AS b(word, category)
WHERE NOT EXISTS (SELECT 1 FROM public.blacklist_words);

-- 4) Nova tabela mining_settings (singleton)
CREATE TABLE IF NOT EXISTS public.mining_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  languages text[] NOT NULL DEFAULT ARRAY['BR']::text[],
  countries text[] NOT NULL DEFAULT ARRAY['BR']::text[],
  ads_limit integer NOT NULL DEFAULT 5000,
  page_size integer NOT NULL DEFAULT 50,
  per_keyword_limit integer NOT NULL DEFAULT 50,
  auto_refresh boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mining_settings TO authenticated;
GRANT ALL    ON public.mining_settings TO service_role;

ALTER TABLE public.mining_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read mining_settings"
  ON public.mining_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage mining_settings"
  ON public.mining_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.mining_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mining_settings (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;
