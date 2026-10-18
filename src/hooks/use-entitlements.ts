import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  fetchEntitlements,
  fetchPlans,
  freeEntitlements,
  type Entitlements,
  type FeatureKey,
} from "@/lib/entitlements";

export const entitlementsKey = ["entitlements"] as const;

export function useEntitlements() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<Entitlements | null>({
    queryKey: [...entitlementsKey, user?.id ?? "anon"],
    queryFn: fetchEntitlements,
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: false,
  });

  const ent = query.isError ? freeEntitlements(user?.id ?? "") : query.data ?? freeEntitlements(user?.id ?? "");

  return {
    entitlements: ent,
    loading: query.isLoading,
    error: query.error,
    planCode: ent.planCode,
    unlimited: ent?.unlimited ?? false,
    balance: ent?.balance ?? 0,
    hasFeature: (key: FeatureKey) => Boolean(ent?.unlimited) || Boolean(ent?.features.includes(key)),
    costOf: (operationKey: string) => ent?.costs[operationKey]?.cost ?? null,
    usageToday: (operationKey: string) => ent?.usageToday[operationKey] ?? 0,
    dailyLimitOf: (operationKey: string) => ent?.costs[operationKey]?.daily_limit ?? null,
    refresh: () => qc.invalidateQueries({ queryKey: entitlementsKey }),
  };
}

export function usePlans() {
  return useQuery({ queryKey: ["plans"], queryFn: fetchPlans, staleTime: 5 * 60_000, retry: false });
}
