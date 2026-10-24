CREATE TABLE public.mcp_connections (
 user_id uuid NOT NULL, client_id text NOT NULL, client_name text NOT NULL DEFAULT 'IA',
 approved_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 PRIMARY KEY(user_id,client_id)
);
GRANT SELECT ON public.mcp_connections TO authenticated;
GRANT ALL ON public.mcp_connections TO service_role;
ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY mcp_connections_read_own ON public.mcp_connections FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.mcp_command_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, client_id text,
 command text NOT NULL, outcome text NOT NULL, reason text, review_path text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mcp_command_logs TO authenticated;
GRANT ALL ON public.mcp_command_logs TO service_role;
ALTER TABLE public.mcp_command_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY mcp_logs_read_own ON public.mcp_command_logs FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE INDEX mcp_logs_user_time ON public.mcp_command_logs(user_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.mcp_manage_connection(p_client_id text, p_name text DEFAULT 'IA', p_revoke boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL OR nullif(auth.jwt()->>'client_id','') IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'message','Entre na sua conta pelo Modelads.'); END IF;
 IF p_revoke THEN
  UPDATE public.mcp_connections SET revoked_at=clock_timestamp() WHERE user_id=u AND client_id=p_client_id;
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF public.is_user_suspended(u) OR public.current_plan_code(u) NOT IN ('pro','plus','premium','admin') THEN RETURN jsonb_build_object('ok',false,'message','Conectar IA exige Pro ou Premium.'); END IF;
 IF length(p_client_id)>100 OR p_client_id='' THEN RETURN jsonb_build_object('ok',false,'message','Cliente inválido.'); END IF;
 INSERT INTO public.mcp_connections(user_id,client_id,client_name,approved_at,revoked_at)
 VALUES(u,p_client_id,left(p_name,200),clock_timestamp(),NULL)
 ON CONFLICT(user_id,client_id) DO UPDATE SET approved_at=excluded.approved_at,revoked_at=NULL,client_name=excluded.client_name;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.mcp_manage_connection(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mcp_manage_connection(text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.mcp_execute(p_command text,p_payload jsonb DEFAULT '{}'::jsonb,p_test boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); c text:=nullif(auth.jwt()->>'client_id',''); con public.mcp_connections; log_id uuid; result jsonb; reason text; rid uuid; s jsonb; e jsonb; owner_id uuid; st text; n integer; countries text[];
BEGIN
 IF u IS NULL THEN RETURN jsonb_build_object('ok',false,'message','Autorização necessária.'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,913));
 IF public.is_user_suspended(u) THEN reason:='Conta suspensa.';
 ELSIF public.current_plan_code(u) NOT IN ('pro','plus','premium','admin') THEN reason:='Conectar IA exige Pro ou Premium.';
 ELSIF p_command NOT IN ('buscar_ofertas','ver_oferta','criar_pagina_de_venda','editar_pagina','listar_minhas_paginas','criar_quiz','editar_quiz','listar_meus_quiz','ver_conta') THEN reason:='Comando não permitido.';
 ELSIF p_test AND (c IS NOT NULL OR p_command<>'ver_conta') THEN reason:='Teste não permitido.';
 ELSIF NOT p_test THEN
  SELECT * INTO con FROM public.mcp_connections WHERE user_id=u AND client_id=c FOR UPDATE;
  IF c IS NULL OR con.user_id IS NULL OR con.revoked_at IS NOT NULL OR coalesce((auth.jwt()->>'iat')::numeric,0)<floor(extract(epoch FROM con.approved_at)) THEN reason:='Conexão revogada ou não aprovada. Conecte novamente.'; END IF;
 END IF;
 SELECT count(*) INTO n FROM public.mcp_command_logs WHERE user_id=u AND created_at>now()-interval '1 minute';
 IF reason IS NULL AND n>=30 THEN reason:='Limite de 30 comandos por minuto. Aguarde um minuto.'; END IF;
 IF reason IS NULL AND (SELECT count(*) FROM public.mcp_command_logs WHERE user_id=u AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=1000 THEN reason:='Limite diário de 1.000 comandos.'; END IF;
 IF reason IS NULL AND p_command IN ('criar_pagina_de_venda','criar_quiz') AND (SELECT count(*) FROM public.mcp_command_logs WHERE user_id=u AND command IN ('criar_pagina_de_venda','criar_quiz') AND outcome='success' AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=20 THEN reason:='Limite diário de 20 criações.'; END IF;
 INSERT INTO public.mcp_command_logs(user_id,client_id,command,outcome,reason) VALUES(u,c,left(p_command,80),CASE WHEN reason IS NULL THEN 'started' ELSE 'denied' END,reason) RETURNING id INTO log_id;
 IF reason IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'message',reason); END IF;
 BEGIN
 IF octet_length(p_payload::text)>1048576 THEN RAISE EXCEPTION 'Conteúdo excede 1 MB.'; END IF;
 CASE p_command
 WHEN 'ver_conta' THEN result:=jsonb_build_object('plan',public.current_plan_code(u),'modelads_ai',false,'credits_charged',0,'limits',jsonb_build_object('requests_per_minute',30,'requests_per_day',1000,'creations_per_day',20));
 WHEN 'listar_minhas_paginas' THEN SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'review_path','/criador-paginas/'||id)), '[]'::jsonb) INTO result FROM (SELECT id,name,status FROM public.sales_pages WHERE user_id=u ORDER BY updated_at DESC LIMIT 50) x;
 WHEN 'listar_meus_quiz' THEN SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'review_path','/modelar-quiz/'||id)), '[]'::jsonb) INTO result FROM (SELECT id,name,status FROM public.quizzes WHERE user_id=u ORDER BY updated_at DESC LIMIT 50) x;
 WHEN 'buscar_ofertas' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO result FROM (
   SELECT o.id,o.headline,o.description,o.category,o.product_type,o.active_days,o.active_ads_count,o.landing_price FROM public.list_active_offers() o
   WHERE (coalesce(p_payload->>'nicho','')='' OR o.category ILIKE '%'||replace(replace(p_payload->>'nicho','%','\\%'),'_','\\_')||'%')
   AND (coalesce(p_payload->>'subnicho','')='' OR o.headline ILIKE '%'||replace(replace(p_payload->>'subnicho','%','\\%'),'_','\\_')||'%')
   AND (coalesce(p_payload->>'pais','')='' OR EXISTS(SELECT 1 FROM public.meta_offers m WHERE m.offer_id=o.id AND upper(m.country)=upper(p_payload->>'pais')))
   LIMIT 30) x;
 WHEN 'ver_oferta' THEN SELECT jsonb_build_object('id',o.id,'headline',o.headline,'description',o.description,'category',o.category,'product_type',o.product_type,'active_days',o.active_days,'active_ads_count',o.active_ads_count,'landing_price',o.landing_price) INTO result FROM public.get_offer_row((p_payload->>'id')::uuid) o;
 IF result IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada.'; END IF;
 WHEN 'criar_pagina_de_venda','editar_pagina' THEN
  IF jsonb_typeof(p_payload->'sections') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'sections')>40 THEN RAISE EXCEPTION 'Seções inválidas.'; END IF;
  IF p_payload->'settings'->>'headScripts'<>'' OR p_payload->'settings'->>'bodyScripts'<>'' THEN RAISE EXCEPTION 'Scripts não permitidos.'; END IF;
  IF p_command='criar_pagina_de_venda' THEN
   INSERT INTO public.sales_pages(user_id,name,slug,status,settings,sections) VALUES(u,left(p_payload->>'name',200),'mcp-'||gen_random_uuid()::text,'draft',p_payload->'settings',p_payload->'sections') RETURNING id INTO rid;
  ELSE
   rid:=(p_payload->>'id')::uuid;
   SELECT user_id,status INTO owner_id,st FROM public.sales_pages WHERE id=rid FOR UPDATE;
   IF owner_id IS DISTINCT FROM u THEN RAISE EXCEPTION 'Página não encontrada.'; END IF;
   IF st<>'draft' THEN RAISE EXCEPTION 'A IA só pode editar rascunhos. Duplique a página publicada no editor.'; END IF;
   UPDATE public.sales_pages SET name=left(p_payload->>'name',200),sections=p_payload->'sections',settings=p_payload->'settings' WHERE id=rid AND user_id=u AND status='draft';
  END IF;
  result:=jsonb_build_object('id',rid,'status','draft','review_path','/criador-paginas/'||rid);
 WHEN 'criar_quiz','editar_quiz' THEN
  IF jsonb_typeof(p_payload->'sections') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'sections') NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Seções inválidas.'; END IF;
  IF p_command='criar_quiz' THEN
   rid:=(p_payload->>'id')::uuid;
   INSERT INTO public.quizzes(id,user_id,name,slug,status,settings) VALUES(rid,u,left(p_payload->>'name',200),'mcp-'||rid::text,'draft',p_payload->'settings');
  ELSE
   rid:=(p_payload->>'id')::uuid;
   SELECT user_id,status INTO owner_id,st FROM public.quizzes WHERE id=rid FOR UPDATE;
   IF owner_id IS DISTINCT FROM u THEN RAISE EXCEPTION 'Quiz não encontrado.'; END IF;
   IF st<>'draft' THEN RAISE EXCEPTION 'A IA só pode editar rascunhos. Duplique o quiz publicado no editor.'; END IF;
   UPDATE public.quizzes SET name=left(p_payload->>'name',200),settings=p_payload->'settings' WHERE id=rid AND user_id=u AND status='draft';
   DELETE FROM public.quiz_sections WHERE quiz_id=rid;
  END IF;
  FOR s IN SELECT value FROM jsonb_array_elements(p_payload->'sections') LOOP
   IF jsonb_array_length(s->'elements')>60 THEN RAISE EXCEPTION 'Máximo de 60 elementos por seção.'; END IF;
   INSERT INTO public.quiz_sections(id,quiz_id,type,title,position,settings) VALUES((s->>'id')::uuid,rid,s->>'type',s->>'title',(s->>'position')::integer,s->'settings');
   FOR e IN SELECT value FROM jsonb_array_elements(s->'elements') LOOP
    INSERT INTO public.quiz_elements(id,section_id,type,position,content,settings) VALUES((e->>'id')::uuid,(s->>'id')::uuid,e->>'type',(e->>'position')::integer,e->'content',e->'settings');
   END LOOP;
  END LOOP;
  result:=jsonb_build_object('id',rid,'status','draft','review_path','/modelar-quiz/'||rid);
 END CASE;
 UPDATE public.mcp_command_logs SET outcome='success',review_path=result->>'review_path' WHERE id=log_id;
 RETURN jsonb_build_object('ok',true,'data',result);
 EXCEPTION WHEN OTHERS THEN
  UPDATE public.mcp_command_logs SET outcome='error',reason='Conteúdo inválido ou recurso indisponível.' WHERE id=log_id;
  RETURN jsonb_build_object('ok',false,'message',CASE WHEN SQLERRM IN ('Página não encontrada.','Quiz não encontrado.','Oferta não encontrada.','A IA só pode editar rascunhos. Duplique a página publicada no editor.','A IA só pode editar rascunhos. Duplique o quiz publicado no editor.') THEN SQLERRM ELSE 'Conteúdo inválido ou recurso indisponível.' END);
 END;
END $$;
REVOKE ALL ON FUNCTION public.mcp_execute(text,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mcp_execute(text,jsonb,boolean) TO authenticated;
COMMENT ON FUNCTION public.mcp_execute(text,jsonb,boolean) IS 'Caller-scoped manual MCP commands only; atomic plan/revocation/quota checks, drafts and audit. No AI or credit debits.';