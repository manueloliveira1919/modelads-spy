import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const testAiConnection = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {data,error}=await context.supabase.rpc("mcp_execute",{p_command:"ver_conta",p_test:true});
  if(error) throw new Error("Não foi possível testar a conexão.");
  return data as {ok:boolean;message?:string;data?:{plan:string}};
});