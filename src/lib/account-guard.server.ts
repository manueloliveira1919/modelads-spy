// Reusable server-side account guards. Use in any server function / route
// that grants access to protected resources.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function isUserSuspended(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_user_suspended", { _user_id: userId });
  if (error) throw new Error("Não foi possível verificar a conta.");
  return data !== false;
}

/** Throws 403 when the user is suspended (or has no profile). */
export async function assertNotSuspended(supabase: SupabaseClient<Database>, userId: string) {
  if (await isUserSuspended(supabase, userId)) {
    throw new Response("Conta suspensa", { status: 403 });
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
