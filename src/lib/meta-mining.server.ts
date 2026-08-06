// Funções puras de coleta/parsing usadas tanto pelo enfileirador
// (refresh-offers.ts) quanto pelo worker (refresh-worker.ts).
// Nenhuma lógica foi alterada em relação ao arquivo original — só
// movida pra um módulo compartilhado, pra não duplicar código entre
// os dois arquivos que agora dividem o trabalho que antes era 1 só.

export interface MetaAdItem {
  id?: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_captions?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  languages?: string[];
  publisher_platforms?: string[];
}

export interface MetaResponse {
  data?: MetaAdItem[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message?: string; code?: number };
}

export const META_API = "https://graph.facebook.com/v20.0/ads_archive";
export const SNAPSHOT_BATCH_SIZE = 8;
export const SNAPSHOT_TIMEOUT_MS = 8000;
export const SNAPSHOT_MAX_ATTEMPTS = 3;

export class MetaApiError extends Error {
  isRateLimit: boolean;
  constructor(message: string, isRateLimit = false) {
    super(message);
    this.isRateLimit = isRateLimit;
  }
}

export async function fetchMeta(url: string): Promise<MetaResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as MetaResponse;
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? "unknown";
    const isRateLimit = res.status === 400 && msg.includes("(#613)");
    throw new MetaApiError(`Meta API ${res.status}: ${msg}`, isRateLimit);
  }
  return json;
}

export function buildSearchUrl(opts: {
  token: string;
  term: string;
  country: string;
  limit: number;
}): string {
  const params = new URLSearchParams({
    access_token: opts.token,
    search_terms: opts.term,
    ad_reached_countries: JSON.stringify([opts.country]),
    ad_active_status: "ACTIVE",
    ad_type: "ALL",
    limit: String(opts.limit),
    fields: [
      "id",
      "page_id",
      "page_name",
      "ad_creative_bodies",
      "ad_creative_link_titles",
      "ad_creative_link_descriptions",
      // Domínio de destino do anúncio — única fonte de link fornecida pela API.
      "ad_creative_link_captions",
      "ad_snapshot_url",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "languages",
      "publisher_platforms",
    ].join(","),
  });
  return `${META_API}?${params.toString()}`;
}

export async function searchTermPaginated(opts: {
  token: string;
  term: string;
  country: string;
  limit: number;
  maxPages: number;
}): Promise<MetaAdItem[]> {
  const all: MetaAdItem[] = [];
  let url = buildSearchUrl(opts);
  for (let page = 0; page < Math.max(1, opts.maxPages); page++) {
    const json = await fetchMeta(url);
    all.push(...(json.data ?? []));
    const next = json.paging?.next;
    if (!next) break;
    url = next;
  }
  return all;
}

export function computeActiveDays(start?: string): number {
  if (!start) return 0;
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return 0;
  const diff = Date.now() - s;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function normalizeAdLanguage(langs: string[] | undefined, fallback: string): string {
  const first = (langs?.[0] || "").toLowerCase();
  if (first.startsWith("pt")) return "PT";
  if (first.startsWith("es")) return "ES";
  if (first.startsWith("en")) return "EN";
  if (!first) return fallback === "BR" ? "PT" : fallback;
  return first.slice(0, 2).toUpperCase();
}

export interface SnapshotMedia {
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
}

function decodeMetaJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\\//g, "/");
  }
}

function firstMatch(html: string, patterns: RegExp[]): string | null {
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m?.[1]) return decodeMetaJsonString(m[1]);
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchSnapshotOnce(snapshotUrl: string): Promise<SnapshotMedia> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS);
  try {
    const res = await fetch(snapshotUrl, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`snapshot http ${res.status}`);
    const html = await res.text();
    const videoUrl = firstMatch(html, [
      /"video_hd_url":"([^"]+)"/,
      /"video_sd_url":"([^"]+)"/,
    ]);
    const imageUrl = firstMatch(html, [
      /"original_image_url":"([^"]+)"/,
      /"resized_image_url":"([^"]+)"/,
      /"image_url":"([^"]+)"/,
    ]);
    const linkUrl = firstMatch(html, [
      /"link_url":"([^"]+)"/,
      /"snapshot_url":"([^"]+)".*?"link_url":"([^"]+)"/,
    ]);
    return { imageUrl, videoUrl, linkUrl };
  } finally {
    clearTimeout(timer);
  }
}

export interface SnapshotOutcome {
  media: SnapshotMedia;
  attempts: number;
  error: string | null;
}

export async function extractSnapshotMedia(
  snapshotUrl: string | null,
): Promise<SnapshotOutcome> {
  const empty: SnapshotMedia = { imageUrl: null, videoUrl: null, linkUrl: null };
  if (!snapshotUrl) return { media: empty, attempts: 0, error: null };
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= SNAPSHOT_MAX_ATTEMPTS; attempt++) {
    try {
      const media = await fetchSnapshotOnce(snapshotUrl);
      return { media, attempts: attempt, error: null };
    } catch (err) {
      lastErr = err;
      if (attempt < SNAPSHOT_MAX_ATTEMPTS) {
        await sleep(400 * 2 ** (attempt - 1));
      }
    }
  }
  return {
    media: empty,
    attempts: SNAPSHOT_MAX_ATTEMPTS,
    error: (lastErr as Error)?.message ?? "snapshot failed",
  };
}

// Executa `fn` em lotes paralelos de `size`. Erros individuais viram resultados nulos.
export async function runInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.allSettled(chunk.map((it, j) => fn(it, i + j)));
    results.forEach((r, j) => {
      out[i + j] = r.status === "fulfilled" ? r.value : null;
    });
  }
  return out;
}

export function computeQualityScore(inputs: {
  languageOk: boolean;
  categoryOk: boolean;
  hasPrice: boolean;
  hasLanding: boolean;
  activeAds: number;
  activeDays: number;
  hasCreative: boolean;
}): number {
  let score = 0;
  if (inputs.languageOk) score += 12;
  if (inputs.categoryOk) score += 14;
  if (inputs.hasPrice) score += 12;
  if (inputs.hasLanding) score += 14;
  if (inputs.hasCreative) score += 12;
  if (inputs.activeAds >= 30) score += 18;
  else if (inputs.activeAds >= 10) score += 12;
  else if (inputs.activeAds >= 4) score += 6;
  if (inputs.activeDays >= 30) score += 18;
  else if (inputs.activeDays >= 15) score += 12;
  else if (inputs.activeDays >= 7) score += 6;
  return Math.min(100, score);
}

// Tamanho de cada lote de palavras-chave por job de busca na Meta.
export const KEYWORDS_PER_SEARCH_JOB = 8;
// Tamanho de cada lote de anúncios por job de extração de snapshot.
export const ADS_PER_SNAPSHOT_JOB = 16;
// Tamanho de cada lote de anúncios por job de classificação/upsert.
export const ADS_PER_CLASSIFY_JOB = 150;

// Cliente público usado somente para validar tokens de usuário e para
// leituras autorizadas pelas políticas do banco. Operações internas da fila
// usam o cliente privilegiado carregado dentro dos handlers do servidor.
export async function serverSupabaseAnon() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
