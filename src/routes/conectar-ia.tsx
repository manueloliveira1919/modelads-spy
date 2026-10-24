import { createFileRoute,Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plug,Copy,Unplug,ShieldCheck,Lock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { copyText } from "@/lib/clipboard";
import { testAiConnection } from "@/lib/connect-ai.functions";

export const Route=createFileRoute("/conectar-ia")({head:()=>({meta:[{title:"Conectar IA — Modelads"},{name:"description",content:"Conecte seu assistente aos rascunhos do Modelads com autorização segura."},{property:"og:title",content:"Conectar IA — Modelads"},{property:"og:description",content:"Gerencie autorizações e comandos dos seus assistentes."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:ConnectAi});
const MCP_URL="https://modelads-spy.lovable.app/mcp";
function ConnectAi(){
 const {user,isPro,loading}=useAuth();
 const test=useServerFn(testAiConnection);
 const [busy,setBusy]=useState(false); const [status,setStatus]=useState("");
 const query=useQuery({queryKey:["mcp-connections",user?.id],enabled:!!user&&isPro,queryFn:async()=>{
  const [connections,logs]=await Promise.all([supabase.from("mcp_connections").select("client_id,client_name,revoked_at,approved_at").order("approved_at",{ascending:false}),supabase.from("mcp_command_logs").select("id,command,outcome,reason,review_path,created_at").order("created_at",{ascending:false}).limit(50)]);
  if(connections.error||logs.error) throw new Error("Não foi possível carregar suas conexões.");
  return {connections:connections.data??[],logs:logs.data??[]};
 }});
 async function disconnect(id:string){
  setBusy(true);
  try{
   const {data,error}=await supabase.rpc("mcp_manage_connection",{p_client_id:id,p_revoke:true});
   if(error||!(data as {ok?:boolean})?.ok) throw new Error("Não foi possível desconectar.");
   const provider=await supabase.auth.oauth.revokeGrant({clientId:id});
   if(provider.error) toast.warning("Acesso ao Modelads revogado; a autorização do assistente ainda precisa ser removida.");
   else toast.success("Acesso revogado.");
   await query.refetch();
  }catch(e){toast.error(e instanceof Error?e.message:"Falha ao desconectar.");}finally{setBusy(false);}
 }
 return <AppShell><div className="space-y-8"><header className="space-y-2"><div className="flex items-center gap-3"><Plug className="h-7 w-7 text-brand"/><h1 className="font-display text-3xl font-bold">Conectar IA</h1></div><p className="text-muted-foreground">Seu assistente, seus rascunhos. Sem créditos do Modelads.</p></header>{loading?<p>Carregando sua conta…</p>:!user?<Button asChild><Link to="/auth" search={{redirect:"/conectar-ia"}}>Entrar para conectar</Link></Button>:!isPro?<section className="space-y-4 border-y border-border py-8"><Lock className="h-6 w-6"/><h2 className="text-xl font-semibold">Disponível nos planos Pro e Premium</h2><p className="text-muted-foreground">Conecte Claude, ChatGPT ou outro assistente para criar páginas e quizzes em rascunho.</p><Button asChild><Link to="/upgrade">Ver planos</Link></Button></section>:<><section className="space-y-4"><h2 className="text-lg font-semibold">Link do conector</h2><div className="flex flex-wrap items-center gap-3 border border-border p-4"><code className="min-w-0 flex-1 break-all text-sm">{MCP_URL}</code><Button variant="outline" size="icon" aria-label="Copiar link do MCP" onClick={async()=>{const r=await copyText(MCP_URL);if(r.ok)toast.success("Link copiado.");else toast.error("Selecione e copie o link acima.");}}><Copy className="h-4 w-4"/></Button></div><div className="flex flex-wrap items-center gap-4"><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await test();setStatus(r.ok?(query.data?.connections.some(c=>!c.revoked_at)?"Conta e autorização verificadas. A conexão externa é confirmada quando seu assistente executar um comando.":"Conta habilitada. Ainda não há assistente autorizado."):r.message??"Teste recusado.");await query.refetch();}catch{setStatus("Não foi possível testar. Tente novamente.");}finally{setBusy(false);}}}><ShieldCheck className="h-4 w-4"/>Testar conexão</Button>{status&&<p role="status" className="text-sm">{status}</p>}</div></section><section className="grid gap-6 border-y border-border py-6 sm:grid-cols-2"><div className="space-y-3"><h2 className="font-semibold">Claude</h2><ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>Abra Configurações → Conectores e adicione um conector personalizado.</li><li>Cole o link acima e inicie a conexão.</li><li>Entre no Modelads e aprove o acesso à sua conta.</li></ol></div><div className="space-y-3"><h2 className="font-semibold">ChatGPT</h2><ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>Em Configurações → Apps ou Conectores, escolha adicionar um servidor MCP.</li><li>Cole o link e escolha autorização OAuth.</li><li>Aprove no Modelads e selecione o conector na conversa.</li></ol><p className="text-xs text-muted-foreground">As opções variam conforme plano e disponibilidade no seu assistente.</p></div></section><section className="space-y-4"><h2 className="text-lg font-semibold">Assistentes autorizados</h2>{query.isPending?<p>Carregando…</p>:query.isError?<><p role="alert">Não foi possível carregar.</p><Button variant="outline" onClick={()=>void query.refetch()}>Tentar novamente</Button></>:!query.data.connections.length?<p className="text-sm text-muted-foreground">Nenhum assistente autorizado.</p>:query.data.connections.map(c=><div key={c.client_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"><div><p className="font-medium">{c.client_name}</p><p className="text-xs text-muted-foreground">{c.revoked_at?"Revogado":"Autorizado"}</p></div><Button variant="outline" disabled={busy||!!c.revoked_at} onClick={()=>void disconnect(c.client_id)}><Unplug className="h-4 w-4"/>Desconectar</Button></div>)}</section><section className="space-y-4"><h2 className="text-lg font-semibold">Histórico de comandos</h2><p className="text-xs text-muted-foreground">Limites: 30 comandos por minuto, 1.000 por dia e 20 criações por dia (UTC).</p>{!query.data?.logs.length?<p className="text-sm text-muted-foreground">Nenhum comando registrado.</p>:query.data.logs.map(l=><div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm"><div><p>{l.command.replaceAll("_"," ")}</p><p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")} · {l.outcome==="success"?"Concluído":l.outcome==="denied"?"Recusado":l.outcome==="error"?"Erro":"Em execução"}</p>{l.reason&&<p className="text-xs text-destructive">{l.reason}</p>}</div>{l.review_path&&<Button asChild variant="outline" size="sm"><a href={l.review_path}>Revisar rascunho</a></Button>}</div>)}</section></>}</div></AppShell>;
}