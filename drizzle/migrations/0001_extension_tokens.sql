CREATE TABLE public.extension_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);
CREATE INDEX extension_tokens_user_idx ON public.extension_tokens(user_id);
GRANT SELECT ON public.extension_tokens TO authenticated;
GRANT ALL ON public.extension_tokens TO service_role;
ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own tokens readable" ON public.extension_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all tokens" ON public.extension_tokens FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reusable: is the user suspended? (missing profile = treated as suspended)
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT p.is_suspended FROM public.profiles p WHERE p.id = _user_id), true)
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    WHERE s.user_id = _user_id
      AND s.subscription_status IN ('active','trialing')
      AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now())
  )
$$;

-- Combined access check for the extension
CREATE OR REPLACE FUNCTION public.extension_access_check(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_user_suspended(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'suspended', 'message', 'Sua conta está suspensa.');
  END IF;
  IF NOT public.has_active_subscription(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_subscription', 'message', 'Sua assinatura não está ativa.');
  END IF;
  IF NOT public.has_feature(_user_id, 'extensao_chrome') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_feature', 'message', 'Seu plano não inclui a extensão.');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.create_extension_token(p_token_hash text, p_prefix text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); chk jsonb; new_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized'); END IF;
  chk := public.extension_access_check(uid);
  IF NOT (chk->>'ok')::boolean THEN RETURN chk; END IF;
  INSERT INTO public.extension_tokens(user_id, token_hash, token_prefix)
  VALUES (uid, p_token_hash, p_prefix) RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok', true, 'id', new_id);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_extension_token(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  UPDATE public.extension_tokens SET revoked_at = now()
  WHERE id = p_id AND revoked_at IS NULL
    AND (user_id = uid OR public.has_role(uid, 'admin'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;

-- Called only by the server endpoint (service_role)
CREATE OR REPLACE FUNCTION public.validate_extension_token(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.extension_tokens; chk jsonb;
BEGIN
  SELECT * INTO t FROM public.extension_tokens WHERE token_hash = p_token_hash;
  IF NOT FOUND OR t.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token', 'message', 'Token inválido ou revogado.');
  END IF;
  UPDATE public.extension_tokens SET last_used_at = now() WHERE id = t.id;
  chk := public.extension_access_check(t.user_id);
  IF NOT (chk->>'ok')::boolean THEN RETURN chk; END IF;
  RETURN jsonb_build_object('ok', true, 'user_id', t.user_id, 'plan_code', public.current_plan_code(t.user_id));
END $$;

REVOKE ALL ON FUNCTION public.is_user_suspended(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.extension_access_check(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_extension_token(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_extension_token(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_extension_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_suspended(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extension_access_check(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_extension_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_extension_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_extension_token(text) TO service_role;