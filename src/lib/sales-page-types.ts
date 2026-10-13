// Criador de Páginas de Venda — modelo de dados, biblioteca de blocos e templates.
// Tudo é salvo como JSON em `sales_pages.sections` / `sales_pages.settings`.

export type SectionType =
  | "announcement"
  | "hero"
  | "video"
  | "benefits"
  | "pains"
  | "steps"
  | "testimonials"
  | "beforeAfter"
  | "offer"
  | "bonus"
  | "guarantee"
  | "faq"
  | "countdown"
  | "text"
  | "image"
  | "cta"
  | "footer";

export type Align = "left" | "center" | "right";

export interface SectionStyle {
  bg?: string;
  color?: string;
  accent?: string;
  buttonBg?: string;
  buttonColor?: string;
  font?: string;
  titleSize?: number;
  textSize?: number;
  paddingY?: number;
  align?: Align;
}

export type Item = Record<string, string>;
export interface PageSection {
  id: string;
  type: SectionType;
  hidden?: boolean;
  content: Record<string, any> & { items?: Item[] };
  style: SectionStyle;
}

export interface PageSettings {
  font: string;
  headingFont: string;
  colors: { primary: string; bg: string; text: string; muted: string; surface: string; buttonText: string };
  maxWidth: number;
  radius: number;
  seo: { title: string; description: string; image: string };
  favicon: string;
  headScripts: string;
  bodyScripts: string;
}

export interface SalesPage {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  settings: PageSettings;
  sections: PageSection[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  font: "Inter",
  headingFont: "Poppins",
  colors: {
    primary: "#16A34A",
    bg: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",
    surface: "#F3F4F6",
    buttonText: "#FFFFFF",
  },
  maxWidth: 1080,
  radius: 12,
  seo: { title: "", description: "", image: "" },
  favicon: "",
  headScripts: "",
  bodyScripts: "",
};

export function mergePageSettings(raw: unknown): PageSettings {
  const s = (raw ?? {}) as Partial<PageSettings>;
  const d = DEFAULT_PAGE_SETTINGS;
  return {
    ...d,
    ...s,
    colors: { ...d.colors, ...(s.colors ?? {}) },
    seo: { ...d.seo, ...(s.seo ?? {}) },
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ---------------- Definição dos campos editáveis por tipo ---------------- */

export type FieldKind = "text" | "textarea" | "image" | "url" | "datetime" | "video";
export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
}
export interface BlockDef {
  type: SectionType;
  label: string;
  emoji: string;
  description: string;
  fields: FieldDef[];
  items?: { label: string; fields: FieldDef[]; blank: Item };
  hasButton?: boolean;
  defaults: () => Record<string, any>;
  style?: SectionStyle;
}

const T = (key: string, label: string, kind: FieldKind = "text"): FieldDef => ({ key, label, kind });
const BTN = [T("buttonText", "Texto do botão"), T("buttonUrl", "Link do botão (checkout)", "url")];

export const BLOCKS: BlockDef[] = [
  {
    type: "announcement",
    label: "Barra de aviso",
    emoji: "📣",
    description: "Faixa fina no topo da página",
    fields: [T("text", "Texto")],
    defaults: () => ({ text: "🔥 Oferta por tempo limitado — vagas encerrando hoje!" }),
    style: { paddingY: 10, textSize: 14 },
  },
  {
    type: "hero",
    label: "Hero / Topo",
    emoji: "🚀",
    description: "Título principal, subtítulo, imagem e botão",
    fields: [T("eyebrow", "Chamada pequena"), T("title", "Título", "textarea"), T("subtitle", "Subtítulo", "textarea"), T("image", "Imagem", "image"), ...BTN],
    hasButton: true,
    defaults: () => ({
      eyebrow: "MÉTODO COMPROVADO",
      title: "Transforme seus resultados em apenas 30 dias",
      subtitle: "O passo a passo completo para você sair do zero e alcançar o seu objetivo, mesmo que nunca tenha tentado antes.",
      image: "",
      buttonText: "QUERO COMEÇAR AGORA",
      buttonUrl: "#oferta",
    }),
    style: { paddingY: 80 },
  },
  {
    type: "video",
    label: "Vídeo (VSL)",
    emoji: "🎬",
    description: "Vídeo de vendas do YouTube, Vimeo ou MP4",
    fields: [T("title", "Título", "textarea"), T("videoUrl", "Link do vídeo", "video"), ...BTN],
    hasButton: true,
    defaults: () => ({ title: "Assista ao vídeo abaixo antes que saia do ar", videoUrl: "", buttonText: "QUERO GARANTIR MINHA VAGA", buttonUrl: "#oferta" }),
    style: { paddingY: 56 },
  },
  {
    type: "benefits",
    label: "Benefícios",
    emoji: "✅",
    description: "Lista de benefícios em cards",
    fields: [T("title", "Título")],
    items: { label: "Benefício", fields: [T("icon", "Emoji/ícone"), T("title", "Título"), T("text", "Texto", "textarea")], blank: { icon: "⭐", title: "Novo benefício", text: "Descreva o benefício." } },
    defaults: () => ({
      title: "O que você vai conquistar",
      items: [
        { icon: "⚡", title: "Resultados rápidos", text: "Veja os primeiros resultados já na primeira semana." },
        { icon: "🎯", title: "Passo a passo simples", text: "Um método claro, sem enrolação e fácil de aplicar." },
        { icon: "📱", title: "Acesso de qualquer lugar", text: "Assista pelo celular, tablet ou computador." },
      ],
    }),
  },
  {
    type: "pains",
    label: "Para quem é / Dores",
    emoji: "🎯",
    description: "Identificação com o público",
    fields: [T("title", "Título")],
    items: { label: "Item", fields: [T("text", "Texto")], blank: { text: "Você sente que..." } },
    defaults: () => ({
      title: "Esse método é para você que...",
      items: [
        { text: "Já tentou de tudo e não conseguiu resultados" },
        { text: "Não tem muito tempo livre no dia a dia" },
        { text: "Quer um caminho claro e comprovado" },
      ],
    }),
    style: { bg: "surface" },
  },
  {
    type: "steps",
    label: "Como funciona",
    emoji: "🧭",
    description: "Etapas numeradas",
    fields: [T("title", "Título")],
    items: { label: "Etapa", fields: [T("title", "Título"), T("text", "Texto", "textarea")], blank: { title: "Nova etapa", text: "Descreva a etapa." } },
    defaults: () => ({
      title: "Como funciona",
      items: [
        { title: "Faça sua inscrição", text: "Garanta seu acesso em poucos cliques." },
        { title: "Receba o acesso", text: "Os dados chegam na hora no seu e-mail." },
        { title: "Aplique e veja resultados", text: "Siga o passo a passo e acompanhe sua evolução." },
      ],
    }),
  },
  {
    type: "testimonials",
    label: "Depoimentos",
    emoji: "💬",
    description: "Prova social de clientes",
    fields: [T("title", "Título")],
    items: { label: "Depoimento", fields: [T("name", "Nome"), T("text", "Depoimento", "textarea"), T("image", "Foto", "image")], blank: { name: "Cliente", text: "Meu depoimento.", image: "" } },
    defaults: () => ({
      title: "Quem já usou, aprova",
      items: [
        { name: "Mariana S.", text: "Mudou completamente a minha rotina. Recomendo demais!", image: "" },
        { name: "Carlos R.", text: "Achei que não ia funcionar pra mim, mas em 2 semanas já vi diferença.", image: "" },
        { name: "Fernanda L.", text: "Conteúdo direto ao ponto. Valeu cada centavo.", image: "" },
      ],
    }),
    style: { bg: "surface" },
  },
  {
    type: "beforeAfter",
    label: "Antes e depois",
    emoji: "🔁",
    description: "Comparação lado a lado",
    fields: [T("title", "Título"), T("beforeLabel", "Rótulo antes"), T("beforeImage", "Imagem antes", "image"), T("afterLabel", "Rótulo depois"), T("afterImage", "Imagem depois", "image")],
    defaults: () => ({ title: "Veja a transformação", beforeLabel: "Antes", beforeImage: "", afterLabel: "Depois", afterImage: "" }),
  },
  {
    type: "offer",
    label: "Oferta com preço",
    emoji: "💰",
    description: "Preço, itens inclusos e botão de compra",
    fields: [T("title", "Título"), T("oldPrice", "Preço antigo (riscado)"), T("price", "Preço"), T("installments", "Parcelamento"), ...BTN, T("note", "Observação abaixo do botão")],
    items: { label: "Item incluso", fields: [T("text", "Texto")], blank: { text: "Novo item incluso" } },
    hasButton: true,
    defaults: () => ({
      title: "Garanta seu acesso hoje",
      oldPrice: "De R$ 297,00",
      price: "R$ 97,00",
      installments: "ou 12x de R$ 9,74",
      buttonText: "QUERO COMPRAR AGORA",
      buttonUrl: "",
      note: "🔒 Compra 100% segura · Acesso imediato",
      items: [{ text: "Acesso completo ao método" }, { text: "Atualizações gratuitas" }, { text: "Suporte por 12 meses" }],
    }),
    style: { bg: "surface", paddingY: 72 },
  },
  {
    type: "bonus",
    label: "Bônus",
    emoji: "🎁",
    description: "Bônus exclusivos com valor",
    fields: [T("title", "Título")],
    items: { label: "Bônus", fields: [T("title", "Título"), T("text", "Descrição", "textarea"), T("value", "Valor")], blank: { title: "Novo bônus", text: "Descrição", value: "R$ 47" } },
    defaults: () => ({
      title: "Bônus exclusivos para quem comprar hoje",
      items: [
        { title: "Bônus 1: Guia rápido", text: "Um resumo prático para consultar sempre.", value: "R$ 47" },
        { title: "Bônus 2: Comunidade VIP", text: "Troque experiências com outros alunos.", value: "R$ 97" },
      ],
    }),
  },
  {
    type: "guarantee",
    label: "Garantia",
    emoji: "🛡️",
    description: "Selo de garantia",
    fields: [T("days", "Dias de garantia"), T("title", "Título"), T("text", "Texto", "textarea")],
    defaults: () => ({ days: "7", title: "Garantia incondicional de 7 dias", text: "Se por qualquer motivo você não gostar, devolvemos 100% do seu dinheiro. Sem perguntas." }),
  },
  {
    type: "faq",
    label: "Perguntas frequentes",
    emoji: "❓",
    description: "Perguntas e respostas expansíveis",
    fields: [T("title", "Título")],
    items: { label: "Pergunta", fields: [T("q", "Pergunta"), T("a", "Resposta", "textarea")], blank: { q: "Nova pergunta?", a: "Resposta." } },
    defaults: () => ({
      title: "Perguntas frequentes",
      items: [
        { q: "Como recebo o acesso?", a: "Logo após a confirmação do pagamento, você recebe tudo no seu e-mail." },
        { q: "Por quanto tempo tenho acesso?", a: "O acesso é de 12 meses, com todas as atualizações." },
        { q: "E se eu não gostar?", a: "Você tem 7 dias de garantia para pedir o reembolso integral." },
      ],
    }),
  },
  {
    type: "countdown",
    label: "Contagem regressiva",
    emoji: "⏳",
    description: "Cronômetro até uma data",
    fields: [T("title", "Título"), T("endAt", "Termina em", "datetime"), ...BTN],
    hasButton: true,
    defaults: () => ({ title: "A oferta termina em", endAt: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 16), buttonText: "APROVEITAR AGORA", buttonUrl: "#oferta" }),
    style: { bg: "primary", color: "#FFFFFF", buttonBg: "#FFFFFF", buttonColor: "#111827" },
  },
  {
    type: "text",
    label: "Texto livre",
    emoji: "📝",
    description: "Título e parágrafos",
    fields: [T("title", "Título"), T("body", "Texto", "textarea")],
    defaults: () => ({ title: "Um título para sua seção", body: "Escreva aqui o seu texto. Conte sua história, explique o produto ou quebre objeções." }),
  },
  {
    type: "image",
    label: "Imagem",
    emoji: "🖼️",
    description: "Imagem com legenda",
    fields: [T("image", "Imagem", "image"), T("caption", "Legenda")],
    defaults: () => ({ image: "", caption: "" }),
  },
  {
    type: "cta",
    label: "Botão CTA",
    emoji: "👉",
    description: "Botão de chamada para ação",
    fields: [T("title", "Texto acima"), ...BTN, T("note", "Observação")],
    hasButton: true,
    defaults: () => ({ title: "", buttonText: "SIM, QUERO APROVEITAR", buttonUrl: "#oferta", note: "" }),
    style: { paddingY: 40 },
  },
  {
    type: "footer",
    label: "Rodapé",
    emoji: "📄",
    description: "Direitos e avisos legais",
    fields: [T("text", "Texto", "textarea")],
    defaults: () => ({ text: `© ${new Date().getFullYear()} Sua Empresa. Todos os direitos reservados.\nEste site não é afiliado ao Facebook ou Google.` }),
    style: { bg: "#111827", color: "#9CA3AF", paddingY: 32, textSize: 13 },
  },
];

export const BLOCK_MAP = Object.fromEntries(BLOCKS.map((b) => [b.type, b])) as Record<SectionType, BlockDef>;

export function newSection(type: SectionType, content?: Record<string, any>, style?: SectionStyle): PageSection {
  const def = BLOCK_MAP[type];
  return { id: uid(), type, content: { ...def.defaults(), ...(content ?? {}) }, style: { align: "center", ...(def.style ?? {}), ...(style ?? {}) } };
}

/* ---------------- Templates ---------------- */

export interface PageTemplate {
  key: string;
  name: string;
  description: string;
  emoji: string;
  settings?: Partial<PageSettings>;
  build: () => PageSection[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    key: "digital",
    name: "Produto digital simples",
    emoji: "💻",
    description: "Hero, benefícios, depoimentos, oferta, garantia e FAQ.",
    build: () => ["hero", "benefits", "testimonials", "offer", "guarantee", "faq", "footer"].map((t) => newSection(t as SectionType)),
  },
  {
    key: "vsl",
    name: "Infoproduto com VSL",
    emoji: "🎬",
    description: "Página de vídeo com aviso, bônus, contagem e oferta.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#DC2626", bg: "#0B0B0F", text: "#F9FAFB", muted: "#A1A1AA", surface: "#18181B" } },
    build: () => [
      newSection("announcement", { text: "⚠️ Este vídeo pode sair do ar a qualquer momento" }, { bg: "primary", color: "#FFFFFF" }),
      newSection("video"),
      newSection("pains"),
      newSection("bonus"),
      newSection("offer"),
      newSection("countdown"),
      newSection("guarantee"),
      newSection("faq"),
      newSection("footer"),
    ],
  },
  {
    key: "direct",
    name: "Oferta direta (1 botão)",
    emoji: "👉",
    description: "Página curta e objetiva, focada em um único botão.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#2563EB" }, maxWidth: 760 },
    build: () => [
      newSection("hero", { eyebrow: "", title: "Comece hoje por apenas R$ 27", subtitle: "Acesso imediato. Garantia de 7 dias.", buttonText: "QUERO AGORA" }),
      newSection("pains", { title: "Você vai aprender:" }, { bg: "bg" }),
      newSection("cta", { buttonUrl: "" }),
      newSection("footer"),
    ],
  },
  {
    key: "capture",
    name: "Página de captura",
    emoji: "📩",
    description: "Isca digital com chamada para receber o material.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#7C3AED" }, maxWidth: 820 },
    build: () => [
      newSection("hero", { eyebrow: "E-BOOK GRATUITO", title: "Baixe grátis o guia completo", subtitle: "Descubra os 7 passos que vão mudar seus resultados. Clique abaixo e receba agora.", buttonText: "QUERO RECEBER GRÁTIS", buttonUrl: "" }),
      newSection("benefits", { title: "O que você vai encontrar no guia" }),
      newSection("cta", { title: "É grátis. Leva menos de 1 minuto.", buttonText: "BAIXAR AGORA", buttonUrl: "" }),
      newSection("footer"),
    ],
  },
  {
    key: "physical",
    name: "Produto físico",
    emoji: "📦",
    description: "Imagem do produto, antes e depois, prova social e oferta.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#EA580C" } },
    build: () => [
      newSection("announcement", { text: "🚚 FRETE GRÁTIS para todo o Brasil — só hoje" }, { bg: "primary", color: "#FFFFFF" }),
      newSection("hero", { eyebrow: "MAIS VENDIDO", title: "O produto que vai facilitar seu dia a dia", subtitle: "Qualidade premium, entrega rápida e garantia de satisfação.", buttonText: "COMPRAR COM DESCONTO" }),
      newSection("benefits"),
      newSection("beforeAfter"),
      newSection("testimonials"),
      newSection("offer", { oldPrice: "De R$ 199,90", price: "R$ 129,90", installments: "ou 10x de R$ 12,99 sem juros", items: [{ text: "Frete grátis" }, { text: "Garantia de 90 dias" }, { text: "Envio em 24h" }] }),
      newSection("guarantee", { days: "30", title: "30 dias de garantia" }),
      newSection("faq"),
      newSection("footer"),
    ],
  },
];
