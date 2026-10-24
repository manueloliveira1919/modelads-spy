import { createClient } from "@supabase/supabase-js";
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token || !ctx.getClientId()) throw new ToolError("Conecte sua conta por autorização OAuth.");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new ToolError("Conexão indisponível.");
  return createClient<Database>(url,key,{ global:{ headers:{ Authorization: `Bearer ${token}` } }, auth:{ persistSession:false,autoRefreshToken:false } });
}