// Fundação comercial (Fase 1): planos, permissões e créditos.
// Todos os valores (preços, créditos, custos e limites) vêm do banco — nada é fixo no código.
import { supabase } from "@/integrations/supabase/client";

export type PlanCode = "starter" | "pro" | "premium" | "admin";

export type FeatureKey =
  | "dashboard"
  | "ofertas_do_dia"
  | "favoritos"
  | "vitrine_ofertas"
  | "extensao_chrome"
  | "minha_conta"
  | "suporte"
  | "configuracoes"
  | "modelads_spy_ia"
  | "modelar_oferta"
  | "modelar_whatsapp"
  | "modelar_quiz"
  | "criador_criativos"
  | "criador_audios"
  | "criador_vsl"
  | "criador_paginas";

export type AiOperationKey =
  | "modelads_spy_ia"
  | "modelar_oferta"
  | "modelar_whatsapp"
  | "modelar_quiz_ia"
  | "criador_criativos"
  | "criador_audios"
  | "criador_paginas_ia"
  | "criador_vsl";

export interface AiCost {
  cost: number;
  daily_limit: number | null;
  label: string;
  feature_key: string | null;
}

export interface Entitlements {
  userId: string;
  planCode: PlanCode;
  isAdmin: boolean;
  unlimited: boolean;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  features: FeatureKey[];
  costs: Record<string, AiCost>;
  usageToday: Record<string, number>;
}

export interface Plan {
  code: string;
  name: string;
  price_cents: number;
  monthly_credits: number;
  display_price: string | null;
  availability: string;
  sort_order: number;
  description: string | null;
}

export interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  balance_after: number | null;
  operation_key: string | null;
  description: string | null;
  source: string | null;
  created_at: string;
}

export async function fetchEntitlements(): Promise<Entitlements | null> {
  const { data, error } = await supabase.rpc("get_my_entitlements");
  if (error) throw error;
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    userId: String(d["user_id"] ?? ""),
    planCode: (d["plan_code"] as PlanCode) ?? "starter",
    isAdmin: Boolean(d["is_admin"]),
    unlimited: Boolean(d["unlimited"]),
    balance: Number(d["balance"] ?? 0),
    totalEarned: Number(d["total_earned"] ?? 0),
    totalSpent: Number(d["total_spent"] ?? 0),
    features: ((d["features"] as FeatureKey[] | null) ?? []).filter(Boolean),
    costs: (d["costs"] as Record<string, AiCost> | null) ?? {},
    usageToday: (d["usage_today"] as Record<string, number> | null) ?? {},
  };
}

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("code, name, price_cents, monthly_credits, display_price, availability, sort_order, description")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function fetchMyLedger(limit = 50): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id, entry_type, amount, balance_after, operation_key, description, source, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LedgerEntry[];
}

export interface ConsumeResult {
  ok: boolean;
  reason?: string;
  message?: string;
  balance?: number | null;
  charged?: number;
  unlimited?: boolean;
  limit?: number;
}

/**
 * Debita os créditos de uma operação de IA. Toda chamada real de IA deve passar por aqui
 * ANTES de executar a geração. Administradores não são debitados nem limitados.
 */
export async function consumeAiCredits(
  operationKey: AiOperationKey,
  options?: { referenceId?: string; description?: string },
): Promise<ConsumeResult> {
  const { data, error } = await supabase.rpc("consume_ai_credits", {
    p_operation_key: operationKey,
    p_reference_id: options?.referenceId ?? undefined,
    p_description: options?.description ?? undefined,
  });
  if (error) return { ok: false, reason: "error", message: error.message };
  return (data ?? { ok: false }) as unknown as ConsumeResult;
}

/** Ajuste manual de créditos (somente administradores — validado no banco). */
export async function adminAdjustCredits(
  userId: string,
  amount: number,
  reason?: string,
): Promise<{ ok: boolean; balance?: number; message?: string }> {
  const { data, error } = await supabase.rpc("admin_adjust_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason ?? undefined,
  });
  if (error) return { ok: false, message: error.message };
  return (data ?? { ok: false }) as unknown as { ok: boolean; balance?: number; message?: string };
}

export function planLabel(code: PlanCode | string): string {
  switch (code) {
    case "admin":
      return "Admin";
    case "premium":
      return "Premium";
    case "pro":
      return "Pro";
    default:
      return "Starter";
  }
}
