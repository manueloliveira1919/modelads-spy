// Configuração de palavras-chave por categoria e idioma.
// Para ativar novos idiomas/países, basta marcar `active: true` na entrada correspondente
// (ou adicionar novos itens) — a lógica de busca lê apenas o que estiver ativo.

export type MetaCategory =
  | "Info"
  | "Nutra"
  | "Relacionamento"
  | "Finanças"
  | "Saúde"
  | "Mentoria"
  | "Aplicativo/App";
export type MetaLanguage = "BR" | "ES";

export interface KeywordGroup {
  category: MetaCategory;
  language: MetaLanguage;
  terms: string[];
  active: boolean;
}

export const KEYWORD_GROUPS: KeywordGroup[] = [
  // === Português (Brasil) — ATIVO ===
  // Ordem importa: Mentoria e Aplicativo/App vêm antes de Info para não perder
  // termos como "mentoria" / "aplicativo" para o catch-all de Info.
  {
    category: "Mentoria",
    language: "BR",
    active: true,
    terms: [
      "mentoria individual",
      "mentoria em grupo",
      "acompanhamento personalizado",
      "consultoria",
    ],
  },
  {
    category: "Aplicativo/App",
    language: "BR",
    active: true,
    terms: [
      "baixe o app",
      "aplicativo grátis",
      "disponível na play store",
      "disponível na app store",
    ],
  },
  {
    category: "Info",
    language: "BR",
    active: true,
    terms: [
      "curso online",
      "mentoria",
      "método",
      "aprenda a",
      "transformação",
      "ebook",
      "e-book",
      "pdf",
      "apostila",
      "curso",
      "aula online",
      "treinamento",
      "workshop",
      "low ticket",
      "mini curso",
    ],
  },

  {
    category: "Nutra",
    language: "BR",
    active: true,
    terms: [
      "emagrecer",
      "dieta",
      "perder peso",
      "detox",
      "queima de gordura",
      "chá",
      "chá emagrecedor",
      "receitas",
      "receitas fit",
      "cardápio",
      "suplemento",
      "shake",
    ],
  },
  {
    category: "Relacionamento",
    language: "BR",
    active: true,
    terms: [
      "reconquistar",
      "conquistar homem",
      "conquistar mulher",
      "seu ex",
      "sedução",
      "mentoria de relacionamento",
      "terapia de casal",
      "texto que reconquista",
    ],
  },
  {
    category: "Finanças",
    language: "BR",
    active: true,
    terms: [
      "renda extra",
      "investir",
      "dinheiro online",
      "liberdade financeira",
      "ganhar dinheiro",
      "curso de investimento",
      "planilha financeira",
      "mentoria financeira",
      "aplicativo de finanças",
    ],
  },
  {
    category: "Saúde",
    language: "BR",
    active: true,
    terms: [
      "ansiedade",
      "sono",
      "bem-estar",
      "natural",
      "remédio caseiro",
      "remédio natural",
      "chá calmante",
      "suplemento natural",
      "receita caseira",
    ],
  },


  // === Español — INATIVO (pronto para expansão futura) ===
  {
    category: "Info",
    language: "ES",
    active: false,
    terms: ["curso online", "mentoría", "método", "aprende a", "transformación"],
  },
  {
    category: "Nutra",
    language: "ES",
    active: false,
    terms: ["adelgazar", "dieta", "perder peso", "detox", "quema de grasa"],
  },
  {
    category: "Relacionamento",
    language: "ES",
    active: false,
    terms: ["reconquistar", "conquistar hombre", "conquistar mujer", "tu ex", "seducción"],
  },
  {
    category: "Finanças",
    language: "ES",
    active: false,
    terms: [
      "ingreso extra",
      "invertir",
      "dinero online",
      "libertad financiera",
      "ganar dinero",
    ],
  },
  {
    category: "Saúde",
    language: "ES",
    active: false,
    terms: ["ansiedad", "sueño", "bienestar", "natural", "remedio casero"],
  },
  {
    category: "Mentoria",
    language: "ES",
    active: false,
    terms: [
      "mentoría individual",
      "mentoría en grupo",
      "acompañamiento personalizado",
      "consultoría",
    ],
  },
  {
    category: "Aplicativo/App",
    language: "ES",
    active: false,
    terms: [
      "descarga la app",
      "aplicación gratis",
      "disponible en play store",
      "disponible en app store",
    ],
  },
];

// Países ativos para a busca. Mapeia idioma → país da Meta Ad Library
// (ISO 3166-1 alfa-2). Adicione novos países aqui sem tocar na lógica de busca.
export interface CountryTarget {
  language: MetaLanguage;
  country: string; // ISO 3166-1 alpha-2
  active: boolean;
}

export const COUNTRY_TARGETS: CountryTarget[] = [
  { language: "BR", country: "BR", active: true },
  { language: "ES", country: "MX", active: false },
  { language: "ES", country: "CO", active: false },
  { language: "ES", country: "ES", active: false },
  { language: "ES", country: "AR", active: false },
];

export function getActiveSearchPlan() {
  const groups = KEYWORD_GROUPS.filter((g) => g.active);
  const countries = COUNTRY_TARGETS.filter((c) => c.active);
  const plan: {
    category: MetaCategory;
    language: MetaLanguage;
    country: string;
    term: string;
  }[] = [];
  for (const group of groups) {
    const targets = countries.filter((c) => c.language === group.language);
    for (const target of targets) {
      for (const term of group.terms) {
        plan.push({
          category: group.category,
          language: group.language,
          country: target.country,
          term,
        });
      }
    }
  }
  return plan;
}

// Se o anúncio foi trazido por um termo de busca de uma categoria, isso já é
// evidência suficiente — não exigimos que o corpo do texto repita a palavra.
// Só cai em "Sem categoria" quando não há hint E o texto não bate com nada.
export type CategoryOrUnclassified = MetaCategory | "Sem categoria";

export function classifyCategoryFromText(
  text: string,
  hinted?: MetaCategory,
): CategoryOrUnclassified {
  // Hint do termo de busca ganha por padrão — o anúncio veio dessa categoria.
  if (hinted) return hinted;
  const t = (text || "").toLowerCase();
  if (!t.trim()) return "Sem categoria";
  const brGroups = KEYWORD_GROUPS.filter((g) => g.language === "BR" && g.active);
  for (const g of brGroups) {
    if (g.terms.some((term) => t.includes(term.toLowerCase()))) return g.category;
  }
  return "Sem categoria";
}

