// Camada de configuração da mineração — carregada do banco.
// Usada apenas em código server-side (server functions, server routes).
import { serverSupabaseAnon } from "@/lib/meta-mining.server";
// Config de mineração é lida com a chave pública (só leitura, liberada
// por policy) — não depende mais do service role.

export interface KeywordRow {
  word: string;
  category: string | null;
  niche: string | null;
  language: string;
  country: string;
  priority: number;
}

export interface BlacklistRow {
  word: string;
  kind: string | null;
  category: string | null;
}

export interface MiningSettings {
  languages: string[];
  countries: string[];
  ads_limit: number;
  page_size: number;
  per_keyword_limit: number;
  auto_refresh: boolean;
  max_pages: number;
}


export async function loadActiveKeywords(): Promise<KeywordRow[]> {
  const supabaseAdmin = await serverSupabaseAnon();
  const { data, error } = await supabaseAdmin
    .from("search_keywords")
    .select("word, category, niche, language, country, priority")
    .eq("is_active", true);
  if (error) throw new Error(`load search_keywords: ${error.message}`);
  return ((data ?? []) as KeywordRow[]).sort(
    (a, b) => (b.priority ?? 1) - (a.priority ?? 1),
  );
}

export async function loadActiveBlacklist(): Promise<BlacklistRow[]> {
  const supabaseAdmin = await serverSupabaseAnon();
  const { data, error } = await supabaseAdmin
    .from("blacklist_words")
    .select("word, kind, category")
    .eq("is_active", true);
  if (error) throw new Error(`load blacklist_words: ${error.message}`);
  return (data ?? []) as BlacklistRow[];
}

export async function loadActiveCategories(): Promise<Set<string>> {
  const supabaseAdmin = await serverSupabaseAnon();
  const { data } = await supabaseAdmin
    .from("keyword_categories")
    .select("name")
    .eq("is_active", true);
  return new Set(((data ?? []) as { name: string }[]).map((r) => r.name));
}

export async function loadMiningSettings(): Promise<MiningSettings> {
  const supabaseAdmin = await serverSupabaseAnon();
  const { data } = await supabaseAdmin
    .from("mining_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  const row = (data ?? {}) as Partial<MiningSettings>;
  return {
    languages: row.languages?.length ? row.languages : ["BR"],
    countries: row.countries?.length ? row.countries : ["BR"],
    ads_limit: row.ads_limit ?? 5000,
    page_size: row.page_size ?? 50,
    per_keyword_limit: row.per_keyword_limit ?? 50,
    auto_refresh: row.auto_refresh ?? true,
    max_pages: row.max_pages ?? 2,
  };
}


function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface BlacklistMatcher {
  (opts: { text: string; pageName?: string; link?: string | null }):
    | { kind: string; word: string }
    | null;
  size: number;
}

export function buildBlacklistMatcher(list: BlacklistRow[]): BlacklistMatcher {
  const compiled = list
    .map((b) => {
      const raw = (b.word ?? "").trim();
      if (!raw) return null;
      const kind = (b.kind ?? "contém").toLowerCase();
      let regex: RegExp;
      try {
        if (kind === "regex") regex = new RegExp(raw, "i");
        else if (kind === "exato" || kind === "palavra")
          regex = new RegExp(`\\b${escapeRegex(raw)}\\b`, "i");
        else regex = new RegExp(escapeRegex(raw), "i");
      } catch {
        return null;
      }
      return { regex, kind, word: raw };
    })
    .filter(Boolean) as { regex: RegExp; kind: string; word: string }[];

  const fn: BlacklistMatcher = (opts) => {
    for (const c of compiled) {
      const isPage =
        c.kind === "pagina" || c.kind === "página" || c.kind === "page";
      const isDomain =
        c.kind === "dominio" || c.kind === "domínio" || c.kind === "domain";
      const target = isPage
        ? (opts.pageName ?? "")
        : isDomain
          ? (opts.link ?? "")
          : opts.text; // exato, palavra, contém, expressao, regex → texto completo
      if (target && c.regex.test(target)) return { kind: c.kind, word: c.word };
    }
    return null;
  };

  fn.size = compiled.length;
  return fn;
}

export interface SearchPlanStep {
  term: string;
  category: string | null;
  language: string;
  country: string;
  priority: number;
}

// Monta o plano de busca a partir das palavras ativas + configurações globais.
// Cada palavra roda no seu próprio país; se `settings.countries` restringir,
// filtramos para respeitar a preferência do admin.
export function buildSearchPlan(
  keywords: KeywordRow[],
  settings: MiningSettings,
): SearchPlanStep[] {
  const allowedCountries = new Set(settings.countries);
  const allowedLangs = new Set(settings.languages);
  const plan: SearchPlanStep[] = [];
  for (const k of keywords) {
    if (allowedCountries.size && !allowedCountries.has(k.country)) continue;
    if (allowedLangs.size && !allowedLangs.has(k.language)) continue;
    plan.push({
      term: k.word,
      category: k.category,
      language: k.language,
      country: k.country,
      priority: k.priority ?? 1,
    });
  }
  return plan;
}
