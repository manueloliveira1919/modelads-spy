
-- 1) Grants for admin tables so PostgREST + authenticated Data API can reach them
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_keywords TO authenticated;
GRANT ALL ON public.search_keywords TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blacklist_words TO authenticated;
GRANT ALL ON public.blacklist_words TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyword_categories TO authenticated;
GRANT ALL ON public.keyword_categories TO service_role;

GRANT SELECT, INSERT ON public.mining_logs TO authenticated;
GRANT ALL ON public.mining_logs TO service_role;

GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT SELECT ON public.plans TO anon;
GRANT ALL ON public.plans TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credits TO authenticated;
GRANT ALL ON public.credits TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_offers TO authenticated;
GRANT ALL ON public.meta_offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_refresh_runs TO authenticated;
GRANT ALL ON public.meta_refresh_runs TO service_role;

-- 2) Missing INSERT / UPDATE / DELETE policies for admin management
DROP POLICY IF EXISTS "admins insert mining_logs" ON public.mining_logs;
CREATE POLICY "admins insert mining_logs" ON public.mining_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins insert system_logs" ON public.system_logs;
CREATE POLICY "admins insert system_logs" ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- 3) Admin can read all profiles, user_roles and refresh runs; admin can update profiles + user_roles
DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update profiles" ON public.profiles;
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read user_roles" ON public.user_roles;
CREATE POLICY "admins read user_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage user_roles" ON public.user_roles;
CREATE POLICY "admins manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read refresh runs" ON public.meta_refresh_runs;
CREATE POLICY "admins read refresh runs" ON public.meta_refresh_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Suspend flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- 5) Extra fields for blacklist (tipo) and search_keywords (kept minimal)
ALTER TABLE public.blacklist_words ADD COLUMN IF NOT EXISTS kind text;

-- 6) Platform settings (singleton)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'Modelads',
  logo_url text,
  domain text,
  support_email text,
  support_whatsapp text,
  version text NOT NULL DEFAULT 'v0.1.0',
  status text NOT NULL DEFAULT 'online',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT SELECT ON public.platform_settings TO anon;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read platform settings" ON public.platform_settings;
CREATE POLICY "public read platform settings" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins manage platform settings" ON public.platform_settings;
CREATE POLICY "admins manage platform settings" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON public.platform_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (platform_name, domain)
VALUES ('Modelads', 'modelads-spy.lovable.app')
ON CONFLICT (singleton) DO NOTHING;

-- 7) Seed default keyword_categories (idempotent)
INSERT INTO public.keyword_categories(name, color, icon) VALUES
  ('Info',            '#60a5fa', 'Tag'),
  ('Nutra',           '#34d399', 'Leaf'),
  ('Saúde',           '#f472b6', 'Heart'),
  ('Finanças',        '#fbbf24', 'DollarSign'),
  ('Relacionamento',  '#f87171', 'Heart'),
  ('Religião',        '#a78bfa', 'BookOpen'),
  ('Cursos',          '#38bdf8', 'GraduationCap'),
  ('Mentorias',       '#fb923c', 'Users'),
  ('Aplicativos',     '#22d3ee', 'Smartphone')
ON CONFLICT (name) DO NOTHING;
