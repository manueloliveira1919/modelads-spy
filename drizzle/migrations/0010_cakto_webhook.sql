ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS checkout_url text, ADD COLUMN IF NOT EXISTS cakto_offer_id text;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

CREATE TABLE public.cakto_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  event_key text NOT NULL,
  customer_email text,
  offer_id text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  user_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (event, event_key)
);
CREATE INDEX cakto_events_email_idx ON public.cakto_webhook_events (lower(customer_email)) WHERE status = 'unmatched';
GRANT SELECT ON public.cakto_webhook_events TO authenticated;
GRANT ALL ON public.cakto_webhook_events TO service_role;
ALTER TABLE public.cakto_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read cakto events" ON public.cakto_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.cakto_ts(p text) RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p IS NULL OR p = '' THEN RETURN NULL; END IF;
  RETURN p::timestamptz;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;

-- Canceled subscriptions keep access until the paid period ends.
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    WHERE s.user_id = _user_id
      AND (
        (s.subscription_status IN ('active','trialing')
          AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now()))
        OR (s.subscription_status = 'canceled' AND s.subscription_expires_at > now())
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.cakto_set_plan_role(p_user uuid, p_plan text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = p_user AND role IN ('plus','pro','premium');
  INSERT INTO public.user_roles(user_id, role) VALUES (p_user, 'starter') ON CONFLICT DO NOTHING;
  IF p_plan IN ('pro','premium') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user, p_plan::app_role) ON CONFLICT DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cakto_process_event(p_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev public.cakto_webhook_events;
  d jsonb; v_uid uuid; v_plan text; v_start timestamptz; v_end timestamptz;
  v_sub_id text; v_cust_id text; v_status text;
BEGIN
  SELECT * INTO ev FROM public.cakto_webhook_events WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  d := ev.payload;
  v_sub_id := COALESCE(d->'subscription'->>'id', d->>'subscription_id', d->>'subscriptionId');
  v_cust_id := d->'customer'->>'id';

  IF ev.event NOT IN ('purchase_approved','subscription_created','subscription_renewed','subscription_canceled',
      'refund','chargeback','subscription_late','subscription_renewal_refused','subscription_paused','subscription_resumed') THEN
    UPDATE public.cakto_webhook_events SET status='ignored', error_message='evento não utilizado', processed_at=now() WHERE id=p_id;
    RETURN 'ignored';
  END IF;

  SELECT p.id INTO v_uid FROM public.profiles p WHERE lower(p.email) = lower(ev.customer_email) LIMIT 1;
  IF v_uid IS NULL AND ev.customer_email IS NOT NULL THEN
    SELECT u.id INTO v_uid FROM auth.users u WHERE lower(u.email) = lower(ev.customer_email) LIMIT 1;
  END IF;

  IF ev.event IN ('purchase_approved','subscription_created','subscription_renewed') THEN
    SELECT code INTO v_plan FROM public.plans WHERE cakto_offer_id = ev.offer_id LIMIT 1;
    IF v_plan IS NULL THEN
      UPDATE public.cakto_webhook_events SET status='ignored', error_message='oferta '||COALESCE(ev.offer_id,'(vazia)')||' não corresponde a nenhum plano', processed_at=now() WHERE id=p_id;
      RETURN 'ignored';
    END IF;
    IF v_uid IS NULL THEN
      UPDATE public.cakto_webhook_events SET status='unmatched', error_message='nenhum usuário com este e-mail', processed_at=now() WHERE id=p_id;
      RETURN 'unmatched';
    END IF;
    v_start := COALESCE(public.cakto_ts(d->>'paidAt'), public.cakto_ts(d->>'paid_at'), public.cakto_ts(d->>'createdAt'), ev.received_at);
    v_end := v_start + interval '1 month';
    INSERT INTO public.user_subscriptions(user_id, plan_code, provider, provider_customer_id, provider_subscription_id,
      subscription_status, subscription_started_at, subscription_expires_at, current_period_start, current_period_end, canceled_at)
    VALUES (v_uid, v_plan, 'cakto', v_cust_id, v_sub_id, 'active', v_start, v_end, v_start, v_end, NULL)
    ON CONFLICT (user_id) DO UPDATE SET plan_code=EXCLUDED.plan_code, provider='cakto',
      provider_customer_id=COALESCE(EXCLUDED.provider_customer_id, user_subscriptions.provider_customer_id),
      provider_subscription_id=COALESCE(EXCLUDED.provider_subscription_id, user_subscriptions.provider_subscription_id),
      subscription_status='active',
      subscription_started_at=COALESCE(user_subscriptions.subscription_started_at, EXCLUDED.subscription_started_at),
      subscription_expires_at=GREATEST(EXCLUDED.subscription_expires_at, COALESCE(user_subscriptions.subscription_expires_at, EXCLUDED.subscription_expires_at)),
      current_period_start=EXCLUDED.current_period_start, current_period_end=EXCLUDED.current_period_end,
      canceled_at=NULL, updated_at=now();
    PERFORM public.cakto_set_plan_role(v_uid, v_plan);
  ELSE
    IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id=v_uid) THEN
      UPDATE public.cakto_webhook_events SET status='unmatched', error_message='nenhuma assinatura encontrada para este e-mail', processed_at=now() WHERE id=p_id;
      RETURN 'unmatched';
    END IF;
    v_status := CASE ev.event
      WHEN 'subscription_canceled' THEN 'canceled'
      WHEN 'refund' THEN 'refunded'
      WHEN 'chargeback' THEN 'chargeback'
      WHEN 'subscription_late' THEN 'past_due'
      WHEN 'subscription_renewal_refused' THEN 'past_due'
      WHEN 'subscription_paused' THEN 'paused'
      WHEN 'subscription_resumed' THEN 'active' END;
    UPDATE public.user_subscriptions SET subscription_status=v_status, updated_at=now(),
      canceled_at = CASE WHEN v_status='canceled' THEN now() ELSE canceled_at END,
      subscription_expires_at = CASE WHEN v_status IN ('refunded','chargeback') THEN now() ELSE subscription_expires_at END
    WHERE user_id=v_uid;
    IF v_status IN ('refunded','chargeback','past_due','paused') THEN
      PERFORM public.cakto_set_plan_role(v_uid, 'starter');
    ELSIF v_status = 'active' THEN
      PERFORM public.cakto_set_plan_role(v_uid, (SELECT plan_code FROM public.user_subscriptions WHERE user_id=v_uid));
    END IF;
  END IF;

  UPDATE public.cakto_webhook_events SET status='processed', user_id=v_uid, error_message=NULL, processed_at=now() WHERE id=p_id;
  RETURN 'processed';
END $$;

CREATE OR REPLACE FUNCTION public.cakto_ingest_event(p_event text, p_key text, p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_res text;
BEGIN
  INSERT INTO public.cakto_webhook_events(event, event_key, customer_email, offer_id, payload)
  VALUES (p_event, p_key, NULLIF(lower(trim(COALESCE(p_data->'customer'->>'email', p_data->>'customerEmail'))), ''),
          COALESCE(p_data->'offer'->>'id', p_data->>'offerId'), p_data)
  ON CONFLICT (event, event_key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('status','duplicate'); END IF;
  BEGIN
    v_res := public.cakto_process_event(v_id);
  EXCEPTION WHEN others THEN
    UPDATE public.cakto_webhook_events SET status='error', error_message=SQLERRM, processed_at=now() WHERE id=v_id;
    v_res := 'error';
  END;
  RETURN jsonb_build_object('status', v_res, 'id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.cakto_claim_pending(p_user uuid, p_email text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.cakto_webhook_events
    WHERE status='unmatched' AND lower(customer_email)=lower(p_email) ORDER BY received_at
  LOOP
    BEGIN PERFORM public.cakto_process_event(r.id);
    EXCEPTION WHEN others THEN
      UPDATE public.cakto_webhook_events SET status='error', error_message=SQLERRM, processed_at=now() WHERE id=r.id;
    END;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.cakto_process_event(uuid), public.cakto_ingest_event(text,text,jsonb),
  public.cakto_claim_pending(uuid,text), public.cakto_set_plan_role(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cakto_ingest_event(text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  fname text := NEW.raw_user_meta_data->>'first_name';
  lname text := NEW.raw_user_meta_data->>'last_name';
  ph    text := NEW.raw_user_meta_data->>'phone';
  disp  text := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(trim(concat_ws(' ', fname, lname)), ''),
    split_part(NEW.email, '@', 1)
  );
BEGIN
  INSERT INTO public.profiles(id, email, display_name, first_name, last_name, phone)
  VALUES (NEW.id, NEW.email, disp, fname, lname, ph)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, 'starter')
  ON CONFLICT DO NOTHING;

  -- Activate Cakto purchases made before signup; never block signup.
  BEGIN
    IF NEW.email IS NOT NULL THEN PERFORM public.cakto_claim_pending(NEW.id, NEW.email); END IF;
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN NEW;
END;
$function$;