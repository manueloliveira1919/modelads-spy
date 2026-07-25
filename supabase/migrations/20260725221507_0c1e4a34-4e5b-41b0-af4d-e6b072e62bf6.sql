
-- Restrict mining_settings reads to admins only (admin policy already covers writes/reads for admins)
DROP POLICY IF EXISTS "authenticated read mining_settings" ON public.mining_settings;

-- Convert has_role to SECURITY INVOKER so no SECURITY DEFINER function is executable by end users.
-- user_roles has a SELECT policy allowing users to read their own rows, so has_role(auth.uid(), ...) still works under INVOKER.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$function$;
