CREATE OR REPLACE FUNCTION public.get_effective_plan(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT COALESCE(
   CASE
     WHEN _user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id)
       THEN jsonb_build_object('plan','free','source','none')
     WHEN public.has_role(_user_id,'admin') THEN jsonb_build_object('plan','admin','source','admin')
     WHEN EXISTS (SELECT 1 FROM public.user_plan_overrides WHERE user_id = _user_id)
       THEN (SELECT jsonb_build_object('plan', plan_code, 'source','manual') FROM public.user_plan_overrides WHERE user_id = _user_id)
     ELSE COALESCE(
       (SELECT jsonb_build_object('plan', s.plan_code, 'source','cakto')
        FROM public.user_subscriptions s
        WHERE s.user_id = _user_id AND s.plan_code IN ('starter','pro','premium')
          AND ((s.subscription_status IN ('active','trialing') AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now()))
            OR (s.subscription_status = 'canceled' AND s.subscription_expires_at > now()))
        ORDER BY s.updated_at DESC, s.id DESC LIMIT 1),
       jsonb_build_object('plan','free','source','none'))
   END,
   jsonb_build_object('plan','free','source','none'))
$$;
REVOKE ALL ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO service_role;
GRANT SELECT ON public.plans, public.plan_features, public.ai_operation_costs TO authenticated;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_operation_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read plan catalog" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read feature catalog" ON public.plan_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read cost catalog" ON public.ai_operation_costs FOR SELECT TO authenticated USING (true);
NOTIFY pgrst, 'reload schema';