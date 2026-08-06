// Fonte única das categorias: a tabela do admin (keyword_categories).
// Qualquer tela que precise listar/colorir categorias usa este hook, para que
// criar/editar/remover no painel reflita imediatamente em todo o app.
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export const categoriesQueryOptions = queryOptions({
  queryKey: CATEGORIES_QUERY_KEY,
  queryFn: async (): Promise<CategoryRow[]> => {
    const { data, error } = await supabase
      .from("keyword_categories")
      .select("id, name, color, icon, is_active")
      .order("name");
    if (error) throw error;
    return (data ?? []) as CategoryRow[];
  },
  staleTime: 60_000,
});

/** Todas as categorias cadastradas (ativas e inativas). */
export function useCategories() {
  return useQuery(categoriesQueryOptions);
}

/** Somente as categorias ativas — é o que aparece em filtros e formulários. */
export function useActiveCategories(): CategoryRow[] {
  const { data } = useCategories();
  return (data ?? []).filter((c) => c.is_active);
}

export function useActiveCategoryNames(): string[] {
  return useActiveCategories().map((c) => c.name);
}

const FALLBACK_COLOR = "#64748B";

function normalize(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Cor cadastrada no admin para a categoria (com fallback neutro). */
export function useCategoryColor(name: string | null | undefined): string {
  const cats = useCategories().data ?? [];
  if (!name) return FALLBACK_COLOR;
  const key = normalize(name);
  const found = cats.find((c) => normalize(c.name) === key);
  return found?.color || FALLBACK_COLOR;
}

/** Estilo inline do badge derivado da cor cadastrada. */
export function categoryBadgeStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `${color}26`,
    color,
    boxShadow: `inset 0 0 0 1px ${color}4D`,
  };
}
