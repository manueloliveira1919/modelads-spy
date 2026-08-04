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

  const isInfo = normalizeCategoryKey(best.category) === "info";
  const support = !!input.hasPrice || !!input.hasLanding || (input.activeDays ?? 0) >= 4;

  // "Info" é a categoria mais ruidosa: exige 3 correspondências específicas.
  if (isInfo) {
    if (best.strongMatches < 3) return { ...best, category: null };
    return best;
  }

  if (best.strongMatches >= 3) return best;
  if (best.strongMatches === 2 && support) return best;
  return { ...best, category: null };
}
