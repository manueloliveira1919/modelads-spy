// Pontuação de relevância de categoria — puro, sem I/O.
// A categoria da oferta deixa de vir do termo pesquisado e passa a ser decidida
// pelo texto completo do anúncio comparado ao vocabulário de cada categoria.

export function normalizeText(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeCategoryKey(s: string): string {
  return normalizeText(s).replace(/[^a-z0-9]/g, "");
}

// Palavras genéricas: sozinhas não qualificam uma oferta (peso baixo).
export const GENERIC_WORDS = new Set(
  [
    "metodo",
    "historia",
    "segredo",
    "guia",
    "manual",
    "sistema",
    "conteudo",
    "resultado",
    "formula",
    "novo",
    "nova",
    "dica",
    "dicas",
    "passo",
    "curso",
    "aula",
    // Chamadas de venda / urgência — não dizem nada sobre o nicho.
    "vaga",
    "vagas",
    "disponivel",
    "disponiveis",
    "clique",
    "saiba",
    "saiba mais",
    "veja",
    "acesse",
    "acesso",
    "agora",
    "aqui",
    "link",
    "oferta",
    "promocao",
    "desconto",
    "gratis",
    "gratuito",
    "gratuita",
    "exclusivo",
    "exclusiva",
    "limitado",
    "limitada",
    "ultimas",
    "poucas",
    "garanta",
    "comece",
    "aprenda",
    "aprender",
    "descubra",
    "conheca",
    "completo",
    "completa",
    "melhor",
    "sobre",
    "mais",
    "vida",
    "voce",
  ].map(normalizeText),
);


export type CategoryVocabulary = Map<string, { canonical: string; words: string[] }>;

export interface CategoryScore {
  category: string | null;
  score: number;
  strongMatches: number;
  matches: string[];
}

function wordRegex(word: string): RegExp | null {
  const w = normalizeText(word).trim();
  if (w.length < 3) return null;
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  try {
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  } catch {
    return null;
  }
}

// Pontua o texto contra uma categoria. Palavras genéricas valem 0.5 e nunca
// contam como "match forte".
export function scoreCategory(text: string, words: string[]): { score: number; strong: number; matches: string[] } {
  const haystack = normalizeText(text);
  const seen = new Set<string>();
  let score = 0;
  let strong = 0;
  const matches: string[] = [];
  for (const word of words) {
    const key = normalizeText(word);
    if (!key || seen.has(key)) continue;
    const re = wordRegex(key);
    if (!re || !re.test(haystack)) continue;
    seen.add(key);
    matches.push(key);
    if (GENERIC_WORDS.has(key)) {
      score += 0.5;
    } else {
      score += 1;
      strong += 1;
    }
  }
  return { score, strong, matches };
}

export interface RelevanceInput {
  text: string;
  searchCategory: string | null;
  vocabulary: CategoryVocabulary;
  /** sinais de apoio para o caso "suspeito" (2 correspondências) */
  hasPrice?: boolean;
  hasLanding?: boolean;
  activeDays?: number;
}

// Escolhe a melhor categoria pelo texto. Retorna null quando nenhuma atinge
// relevância mínima (descartar por baixa relevância).
export function pickCategory(input: RelevanceInput): CategoryScore {
  const { text, searchCategory, vocabulary } = input;
  let best: CategoryScore = { category: null, score: 0, strongMatches: 0, matches: [] };

  for (const [, entry] of vocabulary) {
    const { score, strong, matches } = scoreCategory(text, entry.words);
    if (score > best.score) {
      best = { category: entry.canonical, score, strongMatches: strong, matches };
    }
  }

  if (!best.category) return best;

  // Empate técnico: preferimos a categoria do termo pesquisado quando ela
  // pontua igual à melhor.
  if (searchCategory) {
    const entry = vocabulary.get(normalizeCategoryKey(searchCategory));
    if (entry && entry.canonical !== best.category) {
      const s = scoreCategory(text, entry.words);
      if (s.score >= best.score) {
        best = { category: entry.canonical, score: s.score, strongMatches: s.strong, matches: s.matches };
      }
    }
  }

  const bestName: string = best.category ?? "";
  const isInfo = normalizeCategoryKey(bestName) === "info";

  // "Info" é a categoria mais ruidosa: exige 3 correspondências específicas.
  if (isInfo) {
    if (best.strongMatches < 3) return { ...best, category: null };
    return best;
  }

  // Relevância consistente: uma única correspondência não aprova mais.
  if (best.strongMatches >= 2) return best;
  return { ...best, category: null };
}

// ---------------------------------------------------------------------------
// Incompatibilidade temática: entretenimento / dorama / novela / streaming.
// Roda antes de aceitar a categoria — o sinal de entretenimento supera
// qualquer pontuação de nicho.
// ---------------------------------------------------------------------------

const ENTERTAINMENT_WORDS = [
  "dorama",
  "doramas",
  "novela",
  "novelas",
  "serie",
  "series",
  "filme",
  "filmes",
  "anime",
  "animes",
  "iptv",
  "streaming",
  "temporada",
  "episodio",
  "episodios",
  "capitulo",
  "capitulos",
  "legendado",
  "dublado",
  "dublagem",
  "assistir",
  "assista agora",
  "catalogo completo",
  "todos os episodios",
  "canais de tv",
  "tv ao vivo",
  "futebol ao vivo",
  "netflix",
  "globoplay",
  "prime video",
  "disney plus",
  "hbo max",
  "reelshort",
  "dramabox",
  "shortmax",
  "curta drama",
  "flickreels",
  "stardusttv",
  "keep watching",
  "curtas-metragens",
];

// 1) Marcador entre parênteses/colchetes: "(Dublagem)", "[Dublado]",
//    "(Episódio 3)", "(Cap. 12)", "(Temporada 2)". Reprova sempre.
export const BRACKET_MARKER =
  /[([]\s*(dublagem|dublado|dublada|legendado|legendada|dub\s*pt[- ]?br|pt[- ]?br|epis[oó]dio|epis[oó]dios|cap[ií]tulo|cap\.?\s*\d+|temporada)\b[^)\]]*[)\]]/i;

// 2) Gancho de reviravolta dramática: cláusula de humilhação/traição/segredo
//    + cláusula de reação dramática.
// Vocabulário ampliado com a "gramática" de dorama/mini-drama traduzido
// (apps tipo ReelShort/DramaBox): "Era Apenas a Babá... Até Virar a Esposa",
// "esconde um segredo mortal", "a rival a queria morta", "Taxado de X, volta pra...".
const DRAMA_TRIGGER =
  /\b(tra[ií]d[ao]|tra[ií][çc][ãa]o|humilhad[ao]|humilha[çc][ãa]o|abandonad[ao]|despreza[dr]|rejeitad[ao]|expulsa? de casa|descobri?(?:u)? que|ningu[ée]m sabia|todos riram|zombaram|me chamaram de|taxad[ao] de|era apenas a|esconde um segredo|guarda um segredo|segredo mortal|casamento for[çc]ado|casa perdida)\b/i;
const DRAMA_REACTION =
  /\b(deu o troco|dei o troco|vingan[çc]a|se vingou|me vinguei|virou (?:a mesa|o jogo)|voltou (?:milion[áa]ri[ao]|rica?|poderos[ao])|decidi|decido|ela (?:se tornou|virou)|ele (?:se tornou|virou)|herda?(?:ou|ram)? (?:uma )?fortuna|bilion[áa]ri[ao]|milion[áa]ri[ao]|ceo|a rival|o que (?:ela|ele) far[áa]|volta pra destruir|volta para destruir)\b/i;
const DRAMA_ROLE =
  /\b(ceo|bilion[áa]ri[ao]|milion[áa]ri[ao]|patr[ãa]o|patroa|marido|esposa|ex[- ]marido|ex[- ]esposa|madrasta|sogra|empregada|faxineira|bab[áa]|herdeir[ao]|noiv[ao]|amante|filho ingrato|filha ingrata|rival)\b/i;

export function hasDramaHook(headline: string): boolean {
  const t = headline || "";
  if (DRAMA_TRIGGER.test(t) && (DRAMA_REACTION.test(t) || DRAMA_ROLE.test(t))) return true;
  // "Traída por X, ela Y" — vírgula separando as duas cláusulas.
  if (/,/.test(t) && DRAMA_TRIGGER.test(t.split(",")[0] ?? "") && /\b(ela|ele|eu)\b/i.test(t)) return true;
  return false;
}

// 3) Nome de página genérico (pessoa comum ou identificador aleatório).
// Publishers de dorama/reels rotacionam nomes de página tipo "Srsz01-GGBoY-CX",
// "Ns-ZQlam-24", "Ai-RasterReels" — vários segmentos separados por hífen, com
// mistura de letra+número, sequência de maiúsculas sem cara de sigla, ou
// caractere fora do alfabeto latino básico (CJK, emoji no meio do nome).
function looksLikeRandomToken(tok: string): boolean {
  if (!tok) return false;
  if (/[^\x00-\x7F]/.test(tok)) return true;
  if (/\d/.test(tok) && /[a-z]/i.test(tok)) return true;
  if (/^\d{2,4}$/.test(tok)) return true;
  if (/^[A-Z]{4,}$/.test(tok)) return true;
  return false;
}

export function isGenericPageName(pageName: string): boolean {
  const name = (pageName || "").trim();
  if (!name) return false;
  const hyphenParts = name.split(/[-_]/).map((p) => p.trim()).filter(Boolean);
  if (hyphenParts.length >= 2 && hyphenParts.some(looksLikeRandomToken)) return true;
  // Identificador aleatório clássico: "NS-fhll0702", "New-reading", "abc_2201"
  if (/^[A-Za-z]{1,6}[-_][A-Za-z0-9]{3,}$/.test(name)) return true;
  if (/^[A-Za-z]+\d{3,}$/.test(name)) return true;
  // Nome próprio simples (2 palavras capitalizadas, sem marca/negócio)
  const words = name.split(/\s+/);
  if (words.length === 2 && words.every((w) => /^[A-Z][a-zà-ú]{2,}$/.test(w))) return true;
  return false;
}

// 3b) Headline que é só um CTA de vídeo ("Continuar", "Ver mais", "Saiba mais")
// sem nenhum texto de venda ao redor — típico de anúncio em vídeo de app de
// dorama/reels, onde a copy real está só no vídeo e o texto extraído é o botão.
// Só conta como sinal quando a página também é genérica (evita bloquear um
// anunciante real que usou "Saiba mais" como CTA de uma página de marca normal).
const CTA_ONLY_HEADLINE =
  /^(continuar|continue|ver mais|saiba mais|assista|assistir|clique aqui|toque aqui|abrir|baixe agora|baixar agora)[.…!]?$/i;

export function isCtaOnlyFromGenericPage(headline: string, pageName: string): boolean {
  const h = (headline || "").trim();
  if (!h || !CTA_ONLY_HEADLINE.test(h)) return false;
  return isGenericPageName(pageName);
}

const ROMANCE_WORDS =
  /\b(amor|romance|paix[ãa]o|casamento|div[óo]rcio|tra[ií][çc][ãa]o|amante|beijo|cora[çc][ãa]o partido|hist[óo]ria de amor)\b/i;

export interface EntertainmentInput {
  headline?: string | null;
  pageName?: string | null;
  text?: string | null;
}


// 4) Propaganda de APP que exibe conteúdo (não do conteúdo em si):
//    "assistir a todos os dramas curtos populares gratuitamente".
//    Verbo de assistir + grátis/gratuitamente + conteúdo seriado.
const WATCH_VERB = /\b(assistir|assista|assiste|ver|veja|maratonar)\b/;
const WATCH_FREE = /\b(gratis|gratuita|gratuitamente|gratuito|de graca|sem pagar|sem custo)\b/;
const WATCH_CONTENT =
  /\b(drama|dramas|dorama|doramas|novela|novelas|episodio|episodios|capitulo|capitulos|serie|series|filme|filmes|curta|curtas)\b/;

export function isWatchAppPromo(text: string): boolean {
  const t = normalizeText(text);
  return WATCH_VERB.test(t) && WATCH_FREE.test(t) && WATCH_CONTENT.test(t);
}

export function isEntertainmentNoise(input: EntertainmentInput | string): boolean {
  const norm: EntertainmentInput = typeof input === "string" ? { text: input } : input;
  const headline = norm.headline ?? "";
  const pageName = norm.pageName ?? "";
  const haystack = normalizeText(`${headline} ${pageName} ${norm.text ?? ""}`);

  // 1) Marcador entre parênteses — reprova sempre.
  if (BRACKET_MARKER.test(headline) || BRACKET_MARKER.test(norm.text ?? "")) return true;

  // 1b) Propaganda de app de dramas/novelas — reprova sempre.
  if (isWatchAppPromo(haystack)) return true;

  // 1c) Headline só de CTA ("Continuar") + página com nome de padrão gerado
  // automaticamente — reprova sempre. Não depende de nenhuma palavra de
  // entretenimento aparecer no texto (que muitas vezes está só no vídeo).
  if (isCtaOnlyFromGenericPage(headline, pageName)) return true;

  // Vocabulário clássico de entretenimento.
  let hits = 0;
  for (const w of ENTERTAINMENT_WORDS) {
    const re = wordRegex(w);
    if (re && re.test(haystack)) hits += 1;
    if (hits >= 2) return true;
  }

  // 2) Gancho de reviravolta dramática.
  const drama = hasDramaHook(headline) || hasDramaHook(norm.text ?? "");
  if (drama) return true;

  // 3) Página genérica + romance/drama.
  if (isGenericPageName(pageName) && (ROMANCE_WORDS.test(headline) || hits >= 1)) return true;

  return false;
}
