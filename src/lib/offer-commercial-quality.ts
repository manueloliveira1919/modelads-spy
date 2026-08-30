// Classificação de qualidade comercial da OFERTA — pura, determinística, sem I/O.
// Roda DEPOIS do agrupamento/qualificação: não influencia mineração, coleta,
// categorias, blacklist nem a régua 5+ dias E 10+ anúncios.
//
// 3 estados:
//   commercial    — oferta comercial legítima (padrão conservador)
//   suspicious    — 1 sinal forte OU 2+ sinais fracos/ambíguos
//   entertainment — 1 sinal decisivo OU 2+ sinais fortes
//   null          — sem evidência suficiente para analisar

import {
  BRACKET_MARKER,
  hasDramaHook,
  isCtaOnlyFromGenericPage,
  isWatchAppPromo,
  normalizeText,
} from "./category-scoring";

export type CommercialQuality = "commercial" | "suspicious" | "entertainment";

export interface OfferAdEvidence {
  headline: string | null;
  description: string | null;
  linkUrl: string | null;
}

export interface OfferQualityInput {
  pageName: string | null;
  productTitle: string | null;
  landingKey: string | null;
  category: string | null;
  language: string | null;
  adsCount: number;
  activeDays: number;
  ads: OfferAdEvidence[];
}

export interface OfferQualityResult {
  quality: CommercialQuality | null;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Domínios de entretenimento (decisivo quando aparecem como destino).
// ---------------------------------------------------------------------------
const ENTERTAINMENT_DOMAINS = [
  "reelshort",
  "dramabox",
  "shortmax",
  "goodshort",
  "netshort",
  "minishorts",
  "melolo",
  "stardusttv",
  "dramawave",
  "shorttv",
  "netflix",
  "globoplay",
  "primevideo",
  "disneyplus",
  "hbomax",
  "webtoon",
  "dreame",
  "goodnovel",
  "meganovel",
  "webnovel",
  "moboreader",
  "anystories",
  "flickreels",
  "reelstv",
  "dramanow",
  "dramacool",
  "netshort",
];

function hostLooksEntertainment(host: string): string | null {
  const h = normalizeText(host);
  if (!h) return null;
  if (h.includes("iptv")) return "iptv";
  for (const d of ENTERTAINMENT_DOMAINS) {
    if (h.includes(d)) return d;
  }
  return null;
}

// Normaliza uma URL/host no mesmo espírito de offer_norm_link (SQL):
// sem protocolo, sem query/fragmento, sem www., sem barra final.
export function normalizeLink(raw: string | null | undefined): string | null {
  let v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^[a-z]+:\/\//, "");
  v = v.split("?")[0] ?? "";
  v = v.split("#")[0] ?? "";
  v = v.replace(/^www\./, "");
  v = v.replace(/\/+$/, "");
  if (!v) return null;
  const host = v.split("/")[0] ?? "";
  if (!host || host.includes("facebook.com") || host.includes("fb.com")) return null;
  return v;
}

function hostOf(link: string | null): string {
  return (link ?? "").split("/")[0] ?? "";
}

function pathOf(link: string | null): string {
  const idx = (link ?? "").indexOf("/");
  return idx >= 0 ? (link ?? "").slice(idx) : "";
}

// ---------------------------------------------------------------------------
// Frases compostas de entretenimento (sinal forte). Texto normalizado.
// ---------------------------------------------------------------------------
const STRONG_PHRASES = [
  "assistir episodio completo",
  "assistir todos os episodios",
  "todos os episodios",
  "episodios completos",
  "capitulos completos",
  "temporada completa",
  "serie completa",
  "series completas",
  "filme completo",
  "filmes completos",
  "novelas completas",
  "doramas online",
  "assistir novela",
  "assistir dorama",
  "assistir serie",
  "assistir filme",
  "ver novela",
  "maratonar",
  "catalogo completo",
  "tv ao vivo",
  "canais de tv",
  "futebol ao vivo",
  "assista agora",
  "assista gratis",
  "assistir agora gratis",
];

function phraseRegex(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}
const STRONG_PHRASE_RES = STRONG_PHRASES.map((p) => ({ p, re: phraseRegex(p) }));

// Path de landing com cara de conteúdo seriado (sinal forte).
const ENTERTAINMENT_PATH =
  /\/(episodio|episodios|ep|capitulo|capitulos|cap|assistir|watch|episode|episodes|season|temporada|novela|novelas|dorama|doramas|serie|series|filme|filmes)(\/|$|\b)/i;

// Palavras ambíguas isoladas (sinal fraco — nunca reprovam sozinhas).
const WEAK_WORDS = [
  "filme",
  "filmes",
  "serie",
  "series",
  "episodio",
  "episodios",
  "capitulo",
  "capitulos",
  "novela",
  "novelas",
  "dorama",
  "doramas",
  "temporada",
  "dublado",
  "legendado",
  "anime",
];
const WEAK_WORD_RES = WEAK_WORDS.map((w) => ({ w, re: phraseRegex(w) }));

export function classifyOfferQuality(input: OfferQualityInput): OfferQualityResult {
  const decisive = new Set<string>();
  const strong = new Set<string>();
  const weak = new Set<string>();

  const texts: string[] = [];
  if (input.productTitle) texts.push(input.productTitle);
  if (input.pageName) texts.push(input.pageName);
  for (const ad of input.ads) {
    if (ad.headline) texts.push(ad.headline);
    if (ad.description) texts.push(ad.description);
  }
  const rawText = texts.join("\n");
  const normText = normalizeText(rawText);

  const links = new Set<string>();
  const landing = normalizeLink(input.landingKey);
  if (landing) links.add(landing);
  for (const ad of input.ads) {
    const l = normalizeLink(ad.linkUrl);
    if (l) links.add(l);
  }

  const hasEvidence = texts.some((t) => t.trim().length > 0) || links.size > 0;
  if (!hasEvidence) {
    return { quality: null, reasons: ["sem_evidencias"] };
  }

  // --- Sinais decisivos -----------------------------------------------------
  for (const link of links) {
    const hit = hostLooksEntertainment(hostOf(link));
    if (hit) decisive.add(`dominio_entretenimento:${hit}`);
  }
  const bracketMatch = rawText.match(BRACKET_MARKER);
  if (bracketMatch) decisive.add(`marcador_dublagem:${(bracketMatch[1] ?? "").toLowerCase()}`);
  if (isWatchAppPromo(rawText)) decisive.add("promo_app_assistir");
  if (isCtaOnlyFromGenericPage(input.productTitle ?? "", input.pageName ?? "")) {
    decisive.add("cta_generico_pagina_aleatoria");
  }

  // --- Sinais fortes --------------------------------------------------------
  for (const { p, re } of STRONG_PHRASE_RES) {
    if (re.test(normText)) strong.add(`frase:${p}`);
  }
  for (const ad of input.ads) {
    if (hasDramaHook(ad.headline ?? "") || hasDramaHook(ad.description ?? "")) {
      strong.add("gancho_dramatico");
      break;
    }
  }
  if (hasDramaHook(input.productTitle ?? "")) strong.add("gancho_dramatico");
  for (const link of links) {
    const p = pathOf(link);
    if (p && ENTERTAINMENT_PATH.test(p)) {
      strong.add(`path_entretenimento:${p.split("/")[1] ?? p}`);
    }
  }

  // --- Sinais fracos/ambíguos ----------------------------------------------
  for (const { w, re } of WEAK_WORD_RES) {
    if (re.test(normText)) weak.add(`palavra_ambigua:${w}`);
  }

  // --- Decisão conservadora -------------------------------------------------
  let quality: CommercialQuality;
  if (decisive.size >= 1 || strong.size >= 2) {
    quality = "entertainment";
  } else if (strong.size === 1 || weak.size >= 2) {
    quality = "suspicious";
  } else {
    quality = "commercial";
  }

  return {
    quality,
    reasons: [...decisive, ...strong, ...weak].sort(),
  };
}
