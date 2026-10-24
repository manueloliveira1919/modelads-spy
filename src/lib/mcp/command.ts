import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";
import { untrustedData } from "./content";

export async function command(ctx: ToolContext, name: string, payload: Record<string, unknown> = {}) {
  const db = supabaseForUser(ctx);
  const { data,error } = await db.rpc("mcp_execute",{ p_command:name, p_payload: payload as import("@/integrations/supabase/types").Json }).abortSignal(ctx.signal);
  if (error) throw new ToolError("Não foi possível executar o comando.");
  const result = data as { ok?: boolean; data?: unknown; message?: string } | null;
  if (!result?.ok) throw new ToolError(result?.message ?? "Comando recusado.");
  return { content:[{ type:"text" as const,text:JSON.stringify(untrustedData(result.data)) }] };
}