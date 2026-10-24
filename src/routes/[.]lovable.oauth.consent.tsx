import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route=createFileRoute("/.lovable/oauth/consent")({
 ssr:false,
 validateSearch:(s:Record<string,unknown>)=>({authorization_id:typeof s.authorization_id==="string"?s.authorization_id:""}),
 head:()=>({meta:[{title:"Aprovar conexão de IA — Modelads"},{name:"description",content:"Autorize um assistente a usar seus rascunhos no Modelads."},{property:"og:title",content:"Aprovar conexão de IA — Modelads"},{property:"og:description",content:"Controle o acesso dos seus assistentes."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
 beforeLoad:async({search,location})=>{
   if(!search.authorization_id) throw new Error("Pedido de autorização ausente. Inicie a conexão pelo seu assistente.");
   const {data,error}=await supabase.auth.getSession();
   if(error) throw new Error("Não foi possível verificar sua conta.");
   if(!data.session) throw redirect({to:"/auth",search:{redirect:location.pathname+location.searchStr}});
 },
 loader:async({location})=>{
   const id=new URLSearchParams(location.search).get("authorization_id");
   if(!id) throw new Error("Pedido de autorização ausente.");
   const {data,error}=await supabase.auth.oauth.getAuthorizationDetails(id);
   if(error||!data) throw new Error("Este pedido expirou ou não é válido. Reinicie a conexão no seu assistente.");
   if("redirect_url" in data) {
     const {data:grants,error:gError}=await supabase.auth.oauth.listGrants();
     const {data:connections,error:cError}=await supabase.from("mcp_connections").select("client_id,revoked_at");
     if(gError||cError) throw new Error("Não foi possível confirmar a conexão.");
     // Never restore local revoked access from an auto-approved OAuth request.
     if(!grants?.some(g=>connections?.some(c=>c.client_id===g.client.id&&!c.revoked_at))) throw new Error("Conexão revogada. Remova a autorização anterior e conecte novamente.");
     throw redirect({href:data.redirect_url});
   }
   return data;
 },
 component:Consent,
 pendingComponent:()=> <main className="p-8 text-foreground">Carregando pedido de conexão…</main>,
 errorComponent:({error})=><main className="mx-auto max-w-lg space-y-4 px-6 py-16"><h1 className="text-xl font-semibold">Não foi possível conectar</h1><p role="alert">{error instanceof Error?error.message:"Reinicie o pedido de conexão."}</p><Button asChild variant="outline"><Link to="/conectar-ia">Voltar às conexões</Link></Button></main>,
});
function Consent(){
 const details=Route.useLoaderData();
 const {authorization_id}=Route.useSearch();
 const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 async function decide(approve:boolean){
  setBusy(true);setError("");
  try{
   if(approve){
    const {data,error}=await supabase.rpc("mcp_manage_connection",{p_client_id:details.client.id,p_name:details.client.name});
    const r=data as {ok?:boolean;message?:string}|null;
    if(error||!r?.ok) throw new Error(r?.message??"Não foi possível aprovar. Verifique seu plano.");
   }
   const {data,error}=approve?await supabase.auth.oauth.approveAuthorization(authorization_id,{skipBrowserRedirect:true}):await supabase.auth.oauth.denyAuthorization(authorization_id,{skipBrowserRedirect:true});
   if(error||!data?.redirect_url) throw new Error(approve?"Falha ao aprovar. Tente novamente.":"Falha ao cancelar. Tente novamente.");
   window.location.assign(data.redirect_url);
  }catch(e){setError(e instanceof Error?e.message:"Falha na conexão.");setBusy(false);}
 }
 return <main className="mx-auto max-w-xl space-y-6 px-6 py-16 text-foreground"><h1 className="font-display text-2xl font-bold">Conectar {details.client.name} ao Modelads</h1><p className="text-sm text-muted-foreground">Conta: {details.user.email}</p><p>{details.client.name} poderá consultar ofertas e criar ou editar seus rascunhos, sem publicar e sem gastar créditos.</p><div className="break-all border-y border-border py-4 text-sm">Destino: {details.redirect_uri}</div><ul className="space-y-2 text-sm">{details.scope.split(/\s+/).filter(Boolean).map(s=><li key={s}>{s==="email"?"Compartilhar seu e-mail":s==="profile"?"Compartilhar perfil básico":s==="openid"?"Confirmar sua identidade":`Permissão adicional solicitada: ${s}`}</li>)}</ul><p className="text-sm text-muted-foreground">Suas permissões e seu plano continuam valendo. Esta autorização é independente da extensão de mineração.</p>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex gap-3"><Button disabled={busy} onClick={()=>void decide(true)}>Aprovar conexão</Button><Button variant="outline" disabled={busy} onClick={()=>void decide(false)}>Cancelar conexão</Button></div></main>;
}