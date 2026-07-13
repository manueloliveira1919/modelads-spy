export type OfferStatus = "escaladissima" | "crescendo";
export type OfferCategory = "Info" | "Nutra" | "Relacionamento" | "Finanças" | "Saúde";
export type OfferStructure = "VSL" | "Página de Vendas" | "Quiz";
export type OfferLanguage = "BR" | "Espanhol" | "Inglês";

export interface Offer {
  id: string;
  page: string;
  category: OfferCategory;
  structure: OfferStructure;
  language: OfferLanguage;
  status: OfferStatus;
  activeDays: number;
  activeAds: number;
  headline: string;
  description: string;
  creativeUrl: string;
  creativeType: "image" | "video";
  pageUrl: string;
  adLibraryUrl: string;
}

export const OFFERS: Offer[] = [
  {
    id: "1",
    page: "Método Emagreça Fácil",
    category: "Nutra",
    structure: "VSL",
    language: "BR",
    status: "escaladissima",
    activeDays: 47,
    activeAds: 128,
    headline: "Descubra o segredo que a indústria não quer que você saiba",
    description:
      "Você está cansada de tentar dietas que não funcionam? Descobri um método simples que me ajudou a perder peso sem passar fome. Assista o vídeo até o final e veja como mulheres reais estão transformando o corpo em casa.",
    creativeUrl:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop",
    creativeType: "image",
    pageUrl: "https://facebook.com/metodoemagrecafacil",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=123456789",
  },
  {
    id: "2",
    page: "Trader Iniciante Pro",
    category: "Finanças",
    structure: "Página de Vendas",
    language: "BR",
    status: "crescendo",
    activeDays: 9,
    activeAds: 12,
    headline: "R$ 300 por dia operando 15 minutos",
    description:
      "Chega de trabalhar 8 horas por dia. Aprenda a operar o mercado financeiro com um método validado por mais de 3 mil alunos. Sem precisar ficar grudado na tela. Acesso imediato.",
    creativeUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
    creativeType: "image",
    pageUrl: "https://facebook.com/traderiniciantepro",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=223456789",
  },
  {
    id: "3",
    page: "Reconquiste em 7 Dias",
    category: "Relacionamento",
    structure: "Quiz",
    language: "BR",
    status: "escaladissima",
    activeDays: 92,
    activeAds: 214,
    headline: "Responda 3 perguntas e descubra se ainda dá pra reconquistar",
    description:
      "Faça o teste rápido de 60 segundos e receba um plano personalizado para reconquistar seu ex. Já ajudamos mais de 40 mil pessoas a salvarem seus relacionamentos.",
    creativeUrl:
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop",
    creativeType: "video",
    pageUrl: "https://facebook.com/reconquisteem7dias",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=323456789",
  },
  {
    id: "4",
    page: "Curso Renda Extra Digital",
    category: "Info",
    structure: "VSL",
    language: "BR",
    status: "crescendo",
    activeDays: 14,
    activeAds: 22,
    headline: "Como faço R$ 5k/mês vendendo produto de outra pessoa",
    description:
      "Um passo a passo simples pra qualquer pessoa começar do zero no marketing digital, mesmo sem aparecer. Acesso ao grupo e ao meu método completo.",
    creativeUrl:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop",
    creativeType: "image",
    pageUrl: "https://facebook.com/rendaextradigital",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=423456789",
  },
  {
    id: "5",
    page: "Diabetes Sob Controle",
    category: "Saúde",
    structure: "VSL",
    language: "BR",
    status: "escaladissima",
    activeDays: 63,
    activeAds: 176,
    headline: "Novo protocolo natural ajuda a controlar a glicose",
    description:
      "Descubra o ritual matinal de 2 minutos que está ajudando milhares de brasileiros a manterem a glicose estável. Assista antes que saia do ar.",
    creativeUrl:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop",
    creativeType: "video",
    pageUrl: "https://facebook.com/diabetessobcontrole",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=523456789",
  },
  {
    id: "6",
    page: "Adelgaza Ya Latinas",
    category: "Nutra",
    structure: "Quiz",
    language: "Espanhol",
    status: "crescendo",
    activeDays: 6,
    activeAds: 8,
    headline: "Descubre tu tipo de metabolismo en 60 segundos",
    description:
      "Responde el test y recibe un plan personalizado para adelgazar sin dietas extremas. Miles de mujeres latinas ya lo están usando.",
    creativeUrl:
      "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=800&auto=format&fit=crop",
    creativeType: "image",
    pageUrl: "https://facebook.com/adelgazayalatinas",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=623456789",
  },
  {
    id: "7",
    page: "Passive Income Blueprint",
    category: "Finanças",
    structure: "VSL",
    language: "Inglês",
    status: "escaladissima",
    activeDays: 121,
    activeAds: 302,
    headline: "How I make $10k/month while I sleep",
    description:
      "Watch this short training to discover the exact system I use to generate passive income online. No experience required. Limited free access.",
    creativeUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop",
    creativeType: "video",
    pageUrl: "https://facebook.com/passiveincomeblueprint",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=723456789",
  },
  {
    id: "8",
    page: "Manual do Homem Alfa",
    category: "Relacionamento",
    structure: "Página de Vendas",
    language: "BR",
    status: "crescendo",
    activeDays: 21,
    activeAds: 34,
    headline: "O que as mulheres realmente querem (e ninguém te conta)",
    description:
      "Guia definitivo pra homens que querem parar de ser vistos como amigo. Estratégias práticas testadas por mais de 12 mil alunos.",
    creativeUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop",
    creativeType: "image",
    pageUrl: "https://facebook.com/manualdohomemalfa",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=823456789",
  },
  {
    id: "9",
    page: "Fórmula do Investidor",
    category: "Info",
    structure: "Quiz",
    language: "BR",
    status: "escaladissima",
    activeDays: 55,
    activeAds: 143,
    headline: "Descubra em 2 min qual investimento combina com você",
    description:
      "Faça o quiz e receba uma análise personalizada com o melhor caminho pra começar a investir em 2026 mesmo com pouco dinheiro.",
    creativeUrl:
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&auto=format&fit=crop",
    creativeType: "image",
    pageUrl: "https://facebook.com/formuladoinvestidor",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=923456789",
  },
];

export const CATEGORIES: OfferCategory[] = [
  "Info",
  "Nutra",
  "Relacionamento",
  "Finanças",
  "Saúde",
];
export const STRUCTURES: OfferStructure[] = ["VSL", "Página de Vendas", "Quiz"];
export const LANGUAGES: OfferLanguage[] = ["BR", "Espanhol", "Inglês"];

// Lista inicial de palavras/expressões comumente bloqueadas pela Meta
export const BLOCKED_WORDS: string[] = [
  "cura",
  "curar",
  "garantido",
  "garantia total",
  "milagroso",
  "milagre",
  "100%",
  "resultado garantido",
  "emagreça 10kg",
  "emagreça 5kg",
  "emagreça kg",
  "perca kg",
  "perca 10kg",
  "gordura",
  "obeso",
  "obesa",
  "diabetes",
  "impotência",
  "impotente",
  "ansiedade",
  "depressão",
  "você",
  "seu peso",
  "sua barriga",
  "celulite",
  "flacidez",
  "antes e depois",
  "renda garantida",
  "fique rico",
  "ganhe dinheiro fácil",
  "dinheiro rápido",
  "milionário",
  "sem esforço",
  "aprovado pela anvisa",
  "cientificamente comprovado",
  "único no mercado",
  "melhor do mundo",
];
