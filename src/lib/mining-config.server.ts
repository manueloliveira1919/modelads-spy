// Camada de configuração da mineração — carregada do banco.
// Usada apenas em código server-side (server functions, server routes).
import { serverSupabaseAnon } from "@/lib/meta-mining.server";
import { normalizeCategoryKey, type CategoryVocabulary } from "@/lib/category-scoring";
// Config de mineração é lida com a chave pública (só leitura, liberada
// por policy) — não depende mais do service role.

export interface KeywordRow {
  id: string;
  word: string;
  category: string | null;
  niche: string | null;
  language: string;
  country: string;
  priority: number;
  last_mined_at: string | null;
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
  keywords_per_run: number;
}

export async function loadActiveKeywords(): Promise<KeywordRow[]> {
  const supabaseAdmin = await serverSupabaseAnon();
  const { data, error } = await supabaseAdmin
    .from("search_keywords")
    .select("id, word, category, niche, language, country, priority, last_mined_at")
    .eq("is_active", true);
  if (error) throw new Error(`load search_keywords: ${error.message}`);
  return ((data ?? []) as KeywordRow[]).sort((a, b) => {
    // Palavras nunca mineradas primeiro; depois as mais antigas.
    const aNull = a.last_mined_at ? 1 : 0;
    const bNull = b.last_mined_at ? 1 : 0;
    if (aNull !== bNull) return aNull - bNull;
    if (a.last_mined_at && b.last_mined_at) {
      return new Date(a.last_mined_at).getTime() - new Date(b.last_mined_at).getTime();
    }
    return (b.priority ?? 1) - (a.priority ?? 1);
  });
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

// Mapa: nome normalizado (sem acento/caixa/pontuação) -> nome canônico.
// Necessário porque as categorias cadastradas usam acento ("Saúde") enquanto
// as palavras-chave usam a versão sem acento ("Saude").
export async function loadActiveCategories(): Promise<Map<string, string>> {
  const supabaseAdmin = await serverSupabaseAnon();
  const { data } = await supabaseAdmin
    .from("keyword_categories")
    .select("name")
    .eq("is_active", true);
  const map = new Map<string, string>();
  for (const r of (data ?? []) as { name: string }[]) {
    if (r.name) map.set(normalizeCategoryKey(r.name), r.name);
  }
  return map;
}

// Vocabulário por categoria a partir das palavras-chave ativas do admin.
export async function loadCategoryVocabulary(): Promise<CategoryVocabulary> {
  const [keywords, categories] = await Promise.all([
    loadActiveKeywords(),
    loadActiveCategories(),
  ]);
  const vocab: CategoryVocabulary = new Map();
  for (const k of keywords) {
    const raw = (k.category ?? "").trim();
    if (!raw) continue;
    const key = normalizeCategoryKey(raw);
    if (!key) continue;
    const canonical = categories.get(key) ?? raw;
    const entry = vocab.get(key) ?? { canonical, words: [] };
    entry.words.push(k.word);
    if (k.niche) entry.words.push(k.niche);
    vocab.set(key, entry);
  }
  return vocab;
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
    keywords_per_run: row.keywords_per_run ?? 60,
  };
}

export async function markKeywordsMined(
  supabase: Awaited<ReturnType<typeof serverSupabaseAnon>>,
  keywordIds: string[],
) {
  if (!keywordIds.length) return;
  const { error } = await supabase
    .from("search_keywords")
    .update({ last_mined_at: new Date().toISOString() })
    .in("id", keywordIds);
  if (error) {
    console.error("markKeywordsMined error", error.message);
  }
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
  id: string;
  term: string;
  category: string | null;
  language: string;
  country: string;
  priority: number;
}

// Monta o plano de busca a partir das palavras ativas + configurações globais.
// Cada palavra roda no seu próprio país; se `settings.countries` restringir,
// filtramos para respeitar a preferência do admin.
// Aplica rotação: limita a fatia de palavras por run (`keywords_per_run`).
export function buildSearchPlan(
  keywords: KeywordRow[],
  settings: MiningSettings,
  category?: string | null,
): SearchPlanStep[] {
  const allowedCountries = new Set(settings.countries);
  const allowedLangs = new Set(settings.languages);
  const wanted = category?.trim().toLowerCase() || null;
  const plan: SearchPlanStep[] = [];
  for (const k of keywords) {
    if (allowedCountries.size && !allowedCountries.has(k.country)) continue;
    if (allowedLangs.size && !allowedLangs.has(k.language)) continue;
    if (wanted && (k.category ?? "").trim().toLowerCase() !== wanted) continue;
    plan.push({
      id: k.id,
      term: k.word,
      category: k.category,
      language: k.language,
      country: k.country,
      priority: k.priority ?? 1,
    });
  }
  const limit = Math.max(8, settings.keywords_per_run ?? 60);
  return plan.slice(0, limit);
}
