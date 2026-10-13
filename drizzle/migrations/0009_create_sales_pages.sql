CREATE TABLE public.sales_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Nova página',
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_pages TO authenticated;
GRANT SELECT ON public.sales_pages TO anon;
GRANT ALL ON public.sales_pages TO service_role;
ALTER TABLE public.sales_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages pages" ON public.sales_pages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "published pages are public" ON public.sales_pages FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE INDEX sales_pages_user_idx ON public.sales_pages(user_id, updated_at DESC);
CREATE TRIGGER sales_pages_updated BEFORE UPDATE ON public.sales_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "sales page assets read" ON storage.objects FOR SELECT USING (bucket_id = 'sales-page-assets');
CREATE POLICY "sales page assets upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sales-page-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sales page assets delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sales-page-assets' AND (storage.foldername(name))[1] = auth.uid()::text);