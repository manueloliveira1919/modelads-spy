CREATE TABLE public.user_plan_overrides (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('starter','pro','premium')),
  set_by uuid,
  set_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_plan_overrides TO authenticated;
GRANT ALL ON public.user_plan_overrides TO service_role;
ALTER TABLE public.user_plan_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read plan override" ON public.user_plan_overrides
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Backfill: planos Pro/Premium dados manualmente (sem assinatura Cakto ativa) viram plano manual.
INSERT INTO public.user_plan_overrides(user_id, plan_code)
SELECT r.user_id, CASE WHEN bool_or(r.role='premium') THEN 'premium' ELSE 'pro' END
FROM public.user_roles r
JOIN public.profiles p ON p.id = r.user_id
WHERE r.role IN ('premium','pro','plus')
  AND NOT public.has_role(r.user_id,'admin')
  AND NOT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=r.user_id
     AND s.subscription_status IN ('active','trialing','canceled')
     AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now()))
GROUP BY r.user_id
ON CONFLICT DO NOTHING;

-- Fonte única: admin > plano manual > assinatura Cakto ativa > free.
CREATE OR REPLACE FUNCTION public.get_effective_plan(_user_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN jsonb_build_object('plan','free','source','none')
    WHEN public.has_role(_user_id,'admin') THEN jsonb_build_object('plan','admin','source','admin')
    WHEN EXISTS (SELECT 1 FROM public.user_plan_overrides o WHERE o.user_id=_user_id) THEN
      (SELECT jsonb_build_object('plan',o.plan_code,'source','manual') FROM public.user_plan_overrides o WHERE o.user_id=_user_id)
    WHEN EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=_user_id
       AND ((s.subscription_status IN ('active','trialing') AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now()))
         OR (s.subscription_status='canceled' AND s.subscription_expires_at > now()))) THEN
      (SELECT jsonb_build_object('plan',COALESCE(s.plan_code,'starter'),'source','cakto') FROM public.user_subscriptions s WHERE s.user_id=_user_id LIMIT 1)
    ELSE jsonb_build_object('plan','free','source','none')
  END
$$;
REVOKE ALL ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO service_role;

-- Todos os pontos existentes (has_feature, can_view_offers, entitlements, RPCs de ofertas, IA) passam por aqui.
CREATE OR REPLACE FUNCTION public.current_plan_code(_user_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.get_effective_plan(_user_id)->>'plan' $$;

CREATE OR REPLACE FUNCTION public.get_my_plan()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.get_effective_plan(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.get_my_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;

-- Cakto nunca mexe nos papéis de quem tem plano manual.
CREATE OR REPLACE FUNCTION public.cakto_set_plan_role(p_user uuid, p_plan text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_plan_overrides WHERE user_id = p_user) THEN RETURN; END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user AND role IN ('plus','pro','premium');
  INSERT INTO public.user_roles(user_id, role) VALUES (p_user, 'starter') ON CONFLICT DO NOTHING;
  IF p_plan IN ('pro','premium') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user, p_plan::app_role) ON CONFLICT DO NOTHING;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.cakto_set_plan_role(uuid,text) FROM PUBLIC, anon, authenticated;

-- Única forma de alterar plano de outro usuário: admin verificado no servidor.
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(p_user_id uuid, p_plan text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar planos.' USING ERRCODE='42501';
  END IF;
  IF p_plan NOT IN ('starter','pro','premium','cakto') THEN
    RAISE EXCEPTION 'Plano inválido.';
  END IF;
  IF p_plan = 'cakto' THEN
    DELETE FROM public.user_plan_overrides WHERE user_id = p_user_id;
    PERFORM public.cakto_set_plan_role(p_user_id,
      COALESCE((SELECT plan_code FROM public.user_subscriptions WHERE user_id=p_user_id LIMIT 1),'starter'));
  ELSE
    INSERT INTO public.user_plan_overrides(user_id, plan_code, set_by, set_at)
    VALUES (p_user_id, p_plan, auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE SET plan_code=EXCLUDED.plan_code, set_by=EXCLUDED.set_by, set_at=now();
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role IN ('plus','pro','premium','starter');
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, p_plan::app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN public.get_effective_plan(p_user_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_set_user_plan(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid,text) TO authenticated;