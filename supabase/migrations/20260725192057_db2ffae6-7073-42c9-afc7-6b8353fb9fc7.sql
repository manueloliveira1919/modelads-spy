
-- Fase 2: score de qualidade + paginação + consultas compostas
ALTER TABLE public.meta_offers ADD COLUMN IF NOT EXISTS quality_score integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS meta_offers_quality_score_idx ON public.meta_offers (quality_score DESC);

ALTER TABLE public.mining_settings ADD COLUMN IF NOT EXISTS max_pages integer NOT NULL DEFAULT 2;

-- Seed de consultas compostas (exemplos pedidos)
INSERT INTO public.search_keywords (word, category, niche, language, country, priority, is_active)
VALUES
  ('curso tráfego pago', 'Cursos', 'Marketing', 'BR', 'BR', 2, true),
  ('curso marketing digital', 'Cursos', 'Marketing', 'BR', 'BR', 2, true),
  ('ebook emagrecimento', 'Ebooks', 'Emagrecimento', 'BR', 'BR', 2, true),
  ('chá diabetes', 'Saúde', 'Diabetes', 'BR', 'BR', 2, true),
  ('receitas fit', 'Saúde', 'Fit', 'BR', 'BR', 2, true),
  ('consultoria financeira', 'Finanças', 'Consultoria', 'BR', 'BR', 2, true),
  ('curso de inglês', 'Cursos', 'Idiomas', 'BR', 'BR', 2, true),
  ('curso para concurso', 'Cursos', 'Concursos', 'BR', 'BR', 2, true),
  ('mentoria vendas', 'Mentorias', 'Vendas', 'BR', 'BR', 2, true),
  ('gestão empresarial', 'Negócios', 'Gestão', 'BR', 'BR', 2, true)
ON CONFLICT DO NOTHING;
