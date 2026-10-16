CREATE OR REPLACE FUNCTION public.current_plan_code(_user_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN 'free'
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = 'premium') THEN 'premium'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role IN ('pro','plus')) THEN 'pro'
    WHEN NOT public.has_active_subscription(_user_id) THEN 'free'
    ELSE 'starter'
  END
$$;