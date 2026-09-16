-- 1. Enum: novo papel premium
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium';

COMMIT;

-- 2. Planos
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS monthly_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_price text,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS plans_code_key ON public.plans (code);

INSERT INTO public.plans (code, name, price_cents, monthly_credits, display_price, availability, sort_order, description, is_active)
VALUES
  ('starter', 'Starter', 5990, 0, 'R$ 59,90/mês', 'available', 1, 'Mineração de ofertas vencedoras.', true),
  ('pro', 'Pro', 8990, 150, 'Em breve', 'coming_soon', 2, 'Tudo do Starter + ferramentas de IA de modelagem.', true),
  ('premium', 'Premium', 13990, 400, 'Em breve', 'coming_soon', 3, 'Tudo do Pro + criadores de criativos, áudios, VSL e páginas.', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  monthly_credits = EXCLUDED.monthly_credits,
  display_price = EXCLUDED.display_price,
  availability = EXCLUDED.availability,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

-- 3. Matriz de permissões
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_code, feature_key)
);

GRANT SELECT ON public.plan_features TO anon, authenticated;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read plan features" ON public.plan_features;
CREATE POLICY "public read plan features" ON public.plan_features FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins manage plan features" ON public.plan_features;
CREATE POLICY "admins manage plan features" ON public.plan_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plan_features (plan_code, feature_key)
SELECT p.code, f.key
FROM (VALUES
  ('dashboard'), ('ofertas_do_dia'), ('favoritos'), ('vitrine_ofertas'),
  ('extensao_chrome'), ('minha_conta'), ('suporte'), ('configuracoes')
) AS f(key)
CROSS JOIN (VALUES ('starter'), ('pro'), ('premium')) AS p(code)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

INSERT INTO public.plan_features (plan_code, feature_key)
SELECT p.code, f.key
FROM (VALUES
  ('modelads_spy_ia'), ('modelar_oferta'), ('modelar_whatsapp'), ('modelar_quiz')
) AS f(key)
CROSS JOIN (VALUES ('pro'), ('premium')) AS p(code)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

INSERT INTO public.plan_features (plan_code, feature_key)
SELECT 'premium', f.key
FROM (VALUES
  ('criador_criativos'), ('criador_audios'), ('criador_vsl'), ('criador_paginas')
) AS f(key)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

-- 4. Custos de IA configuráveis
CREATE TABLE IF NOT EXISTS public.ai_operation_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  label text NOT NULL,
  feature_key text,
  credit_cost integer NOT NULL DEFAULT 0 CHECK (credit_cost >= 0),
  daily_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_operation_costs TO anon, authenticated;
GRANT ALL ON public.ai_operation_costs TO service_role;
ALTER TABLE public.ai_operation_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read ai costs" ON public.ai_operation_costs;
CREATE POLICY "public read ai costs" ON public.ai_operation_costs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins manage ai costs" ON public.ai_operation_costs;
CREATE POLICY "admins manage ai costs" ON public.ai_operation_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_operation_costs (operation_key, label, feature_key, credit_cost, daily_limit)
VALUES
  ('modelads_spy_ia', 'ModelAds Spy IA', 'modelads_spy_ia', 5, 4),
  ('modelar_oferta', 'Modelar Oferta', 'modelar_oferta', 5, NULL),
  ('modelar_whatsapp', 'Modelar Funil WhatsApp', 'modelar_whatsapp', 8, NULL),
  ('modelar_quiz_ia', 'Modelar Quiz com IA', 'modelar_quiz', 8, NULL),
  ('criador_criativos', 'Criador de Criativos', 'criador_criativos', 10, NULL),
  ('criador_audios', 'Criador de Áudios', 'criador_audios', 15, NULL),
  ('criador_paginas_ia', 'Criador de Páginas de Vendas com IA', 'criador_paginas', 20, NULL),
  ('criador_vsl', 'Criador de VSL', 'criador_vsl', 50, NULL)
ON CONFLICT (operation_key) DO UPDATE SET
  label = EXCLUDED.label,
  feature_key = EXCLUDED.feature_key,
  credit_cost = EXCLUDED.credit_cost,
  daily_limit = EXCLUDED.daily_limit,
  updated_at = now();

-- 5. Assinaturas (preparado para Cakto)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_code text NOT NULL DEFAULT 'starter' REFERENCES public.plans(code),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  subscription_status text NOT NULL DEFAULT 'none',
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own subscription" ON public.user_subscriptions;
CREATE POLICY "users read own subscription" ON public.user_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "admins manage subscriptions" ON public.user_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Histórico de créditos
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('subscription_credit','purchased_credit','admin_adjustment','ai_consumption','credit_reversal')),
  amount integer NOT NULL,
  balance_after integer,
  tool_key text,
  operation_key text,
  source text,
  description text,
  reference_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_created_idx ON public.credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_ledger_op_day_idx ON public.credit_ledger (user_id, operation_key, created_at DESC);

GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own ledger" ON public.credit_ledger;
CREATE POLICY "users read own ledger" ON public.credit_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage ledger" ON public.credit_ledger;
CREATE POLICY "admins manage ledger" ON public.credit_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- credits: garantir unicidade por usuário
CREATE UNIQUE INDEX IF NOT EXISTS credits_user_id_key ON public.credits (user_id);

-- triggers updated_at
DROP TRIGGER IF EXISTS plan_features_updated_at ON public.plan_features;
CREATE TRIGGER plan_features_updated_at BEFORE UPDATE ON public.plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS ai_operation_costs_updated_at ON public.ai_operation_costs;
CREATE TRIGGER ai_operation_costs_updated_at BEFORE UPDATE ON public.ai_operation_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Plano efetivo do usuário
CREATE OR REPLACE FUNCTION public.current_plan_code(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = 'premium') THEN 'premium'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role IN ('pro','plus')) THEN 'pro'
    ELSE 'starter'
  END
$$;

CREATE OR REPLACE FUNCTION public.has_feature(_user_id uuid, _feature_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.plan_features f
      WHERE f.plan_code = public.current_plan_code(_user_id)
        AND f.feature_key = _feature_key
        AND f.enabled
    )
  END
$$;

-- 8. Entitlements do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  plan text;
  is_admin boolean;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  is_admin := public.has_role(uid, 'admin');
  plan := public.current_plan_code(uid);

  RETURN jsonb_build_object(
    'user_id', uid,
    'plan_code', plan,
    'is_admin', is_admin,
    'unlimited', is_admin,
    'balance', COALESCE((SELECT balance FROM public.credits WHERE user_id = uid), 0),
    'total_earned', COALESCE((SELECT total_earned FROM public.credits WHERE user_id = uid), 0),
    'total_spent', COALESCE((SELECT total_spent FROM public.credits WHERE user_id = uid), 0),
    'features', COALESCE(
      (SELECT jsonb_agg(f.feature_key) FROM public.plan_features f
        WHERE f.enabled AND (is_admin OR f.plan_code = plan)),
      '[]'::jsonb),
    'costs', COALESCE(
      (SELECT jsonb_object_agg(c.operation_key, jsonb_build_object(
          'cost', c.credit_cost, 'daily_limit', c.daily_limit, 'label', c.label, 'feature_key', c.feature_key))
        FROM public.ai_operation_costs c WHERE c.is_active),
      '{}'::jsonb),
    'usage_today', COALESCE(
      (SELECT jsonb_object_agg(l.operation_key, l.uses) FROM (
          SELECT operation_key, count(*) AS uses FROM public.credit_ledger
          WHERE user_id = uid AND entry_type = 'ai_consumption'
            AND operation_key IS NOT NULL
            AND created_at >= date_trunc('day', now())
          GROUP BY operation_key) l),
      '{}'::jsonb)
  );
END;
$$;

-- 9. Consumo de créditos de IA
CREATE OR REPLACE FUNCTION public.consume_ai_credits(
  p_operation_key text,
  p_reference_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  op public.ai_operation_costs%ROWTYPE;
  is_admin boolean;
  uses_today integer;
  bal integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated', 'message', 'Faça login para utilizar esta ferramenta.');
  END IF;

  SELECT * INTO op FROM public.ai_operation_costs WHERE operation_key = p_operation_key AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_operation', 'message', 'Operação de IA não configurada.');
  END IF;

  is_admin := public.has_role(uid, 'admin');

  IF op.feature_key IS NOT NULL AND NOT public.has_feature(uid, op.feature_key) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_required', 'message', 'Esta ferramenta não está incluída no seu plano atual.');
  END IF;

  IF is_admin THEN
    RETURN jsonb_build_object('ok', true, 'unlimited', true, 'charged', 0, 'balance', NULL);
  END IF;

  IF op.daily_limit IS NOT NULL THEN
    SELECT count(*) INTO uses_today FROM public.credit_ledger
    WHERE user_id = uid AND entry_type = 'ai_consumption'
      AND operation_key = p_operation_key
      AND created_at >= date_trunc('day', now());
    IF uses_today >= op.daily_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit', 'limit', op.daily_limit,
        'message', 'Limite diário atingido. O ModelAds Spy IA pode ser utilizado no máximo ' || op.daily_limit || ' vezes por dia. Tente novamente amanhã.');
    END IF;
  END IF;

  INSERT INTO public.credits (user_id, balance, total_earned, total_spent)
  VALUES (uid, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO bal FROM public.credits WHERE user_id = uid FOR UPDATE;

  IF bal < op.credit_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_credits', 'balance', bal, 'cost', op.credit_cost,
      'message', 'Créditos insuficientes para esta operação.');
  END IF;

  UPDATE public.credits
    SET balance = balance - op.credit_cost,
        total_spent = total_spent + op.credit_cost,
        updated_at = now()
  WHERE user_id = uid
  RETURNING balance INTO bal;

  INSERT INTO public.credit_ledger (user_id, entry_type, amount, balance_after, tool_key, operation_key, source, description, reference_id, created_by)
  VALUES (uid, 'ai_consumption', -op.credit_cost, bal, op.feature_key, p_operation_key, 'app',
          COALESCE(p_description, 'Consumo de IA: ' || op.label), p_reference_id, uid);

  RETURN jsonb_build_object('ok', true, 'unlimited', false, 'charged', op.credit_cost, 'balance', bal);
END;
$$;

-- 10. Ajuste manual pelo administrador
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Informe um valor diferente de zero.');
  END IF;

  INSERT INTO public.credits (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO bal FROM public.credits WHERE user_id = p_user_id FOR UPDATE;

  IF bal + p_amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'balance', bal, 'message', 'Saldo insuficiente para remover essa quantidade.');
  END IF;

  UPDATE public.credits
    SET balance = balance + p_amount,
        total_earned = total_earned + GREATEST(p_amount, 0),
        total_spent = total_spent + GREATEST(-p_amount, 0),
        updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO bal;

  INSERT INTO public.credit_ledger (user_id, entry_type, amount, balance_after, source, description, created_by)
  VALUES (p_user_id, 'admin_adjustment', p_amount, bal, 'admin',
          COALESCE(NULLIF(p_reason, ''), 'Créditos adicionados manualmente pelo administrador.'), auth.uid());

  RETURN jsonb_build_object('ok', true, 'balance', bal);
END;
$$;

REVOKE ALL ON FUNCTION public.current_plan_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_feature(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_entitlements() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_ai_credits(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_plan_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_feature(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_entitlements() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer, text) TO authenticated, service_role;