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
  | "footer"
  | "benefitStrip" | "embeddedQuiz" | "bonusCards" | "printCarousel" | "materialIndex"
  | "pricingPlans" | "trustBadges" | "checklistAccordion" | "iconCards" | "textPhoto" | "finalCta";

export type Align = "left" | "center" | "right" | "justify";

export interface ElementStyle {
  font?: string; size?: number; weight?: number; italic?: boolean; lineHeight?: number; letterSpacing?: number;
  color?: string; align?: Align; marginTop?: number; marginBottom?: number; marginX?: number;
  paddingTop?: number; paddingBottom?: number; paddingX?: number; bg?: string; background?: PageBackground;
  borderColor?: string; borderWidth?: number; radius?: number; width?: number; hidden?: boolean; removed?: boolean;
}
export interface CustomPageElement { id: string; type: "text" | "image" | "button" | "icon" | "video"; value: string; button?: PageButton }
export interface ButtonDestination { type: "url" | "whatsapp" | "section" | "popular"; sectionId?: string; phone?: string; message?: string; popularAction?: "scroll" | "checkout" }

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
  weight?: number;
  maxWidth?: number;
  gap?: number;
  columns?: number;
  background?: PageBackground;
}

export interface PageButton {
  id: string;
  text: string;
  url: string;
  bg?: string;
  color?: string;
  variant?: "solid" | "outline" | "text";
  radius?: number;
  size?: number;
  destination?: ButtonDestination;
  guarantee?: { days?: string; topText?: string; bottomText?: string; variant?: string; color?: string; size?: number; mode?: "default" | "image"; image?: string; hidden?: boolean };
}

export interface PageBackground {
  type: "solid" | "gradient" | "image";
  gradientType: "linear" | "radial";
  stops: { color: string; position: number }[];
  angle: number;
  centerX: number;
  centerY: number;
  image: string;
}

export type Item = Record<string, string>;
export interface PageSection {
  id: string;
  type: SectionType;
  hidden?: boolean;
  content: Record<string, any> & { items?: Item[] };
  style: SectionStyle;
  elementOrder?: string[];
  elementStyles?: Record<string, ElementStyle>;
  groupOrders?: Record<string, string[]>;
  customElements?: CustomPageElement[];
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
  background?: PageBackground;
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

export type FieldKind = "text" | "textarea" | "image" | "url" | "datetime" | "video" | "checkbox" | "number" | "select" | "color";
export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
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
    fields: [T("text", "Texto"), T("showDate", "Mostrar data de hoje", "checkbox")],
    defaults: () => ({ text: "🔥 Oferta por tempo limitado — vagas encerrando hoje!" }),
    style: { paddingY: 10, textSize: 14 },
  },
  {
    type: "hero",
    label: "Hero / Topo",
    emoji: "🚀",
    description: "Título principal, subtítulo, imagem e botão",
    fields: [T("eyebrow", "Chamada pequena"), T("title", "Título", "textarea"), T("subtitle", "Subtítulo", "textarea"), T("image", "Imagem", "image"), T("highlight", "Palavra em itálico"), T("miniBadges", "Mini-selos (um por linha)", "textarea"), ...BTN],
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
    items: { label: "Etapa", fields: [T("icon", "Ícone (opcional)"), T("title", "Título"), T("text", "Texto", "textarea")], blank: { title: "Nova etapa", text: "Descreva a etapa." } },
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
    fields: [T("title", "Título"), T("text", "Texto", "textarea")],
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
  {
    type: "benefitStrip", label: "Faixa de benefícios", emoji: "✔️", description: "Benefícios em uma linha com check", fields: [],
    items: { label: "Benefício", fields: [T("text", "Texto")], blank: { text: "Novo benefício" } },
    defaults: () => ({ items: [{ text: "Acesso imediato" }, { text: "Pronto para imprimir" }, { text: "Garantia de 30 dias" }] }), style: { paddingY: 20, bg: "surface" },
  },
  {
    type: "embeddedQuiz", label: "Quiz embutido", emoji: "🧩", description: "Perguntas locais e resultado com link", fields: [T("title", "Título"), T("resultTitle", "Título do resultado"), T("resultText", "Texto do resultado", "textarea"), ...BTN], hasButton: true,
    items: { label: "Pergunta", fields: [T("title", "Pergunta"), T("options", "Opções (emoji + texto, uma por linha)", "textarea")], blank: { title: "O que você busca?", options: "🎯 Mais organização\n✨ Novas ideias" } },
    defaults: () => ({ title: "Encontre seu próximo passo", resultTitle: "Seu próximo passo começa aqui", resultText: "Conheça o material e escolha como começar.", buttonText: "CONHECER O MATERIAL", buttonUrl: "#oferta", items: [{ title: "O que você quer melhorar?", options: "🎯 Minha rotina\n💡 Minhas ideias\n📚 Meu aprendizado" }, { title: "Como você prefere aprender?", options: "📖 Lendo\n🎬 Assistindo\n✍️ Praticando" }] }),
  },
  {
    type: "bonusCards", label: "Cards de bônus", emoji: "🎁", description: "Imagens, preço riscado e etiqueta editável", fields: [T("title", "Título")],
    items: { label: "Bônus", fields: [T("image", "Imagem", "image"), T("title", "Nome"), T("text", "Descrição", "textarea"), T("value", "Preço de"), T("badge", "Etiqueta")], blank: { image: "", title: "Novo bônus", text: "Material complementar.", value: "De R$ 47", badge: "GRÁTIS" } },
    defaults: () => ({ title: "Mais recursos para você", items: [{ image: "", title: "Guia de início rápido", text: "Um resumo prático para começar.", value: "De R$ 47", badge: "GRÁTIS" }, { image: "", title: "Planner de atividades", text: "Organize sua próxima semana.", value: "De R$ 37", badge: "GRÁTIS" }] }), style: { columns: 2 },
  },
  {
    type: "printCarousel", label: "Carrossel de prints", emoji: "📸", description: "Imagens com setas e navegação", fields: [T("title", "Título")],
    items: { label: "Print", fields: [T("image", "Imagem", "image"), T("caption", "Legenda / descrição")], blank: { image: "", caption: "Seu depoimento aqui" } },
    defaults: () => ({ title: "Experiências de quem já começou", items: [{ image: "", caption: "Insira um depoimento autorizado" }, { image: "", caption: "Insira outro depoimento autorizado" }, { image: "", caption: "Mais uma experiência real" }] }),
  },
  {
    type: "materialIndex", label: "Índice do material", emoji: "📑", description: "Conteúdo numerado e página à direita", fields: [T("title", "Título"), T("dark", "Fundo escuro", "checkbox")],
    items: { label: "Capítulo", fields: [T("title", "Título"), T("page", "Página")], blank: { title: "Novo capítulo", page: "01" } },
    defaults: () => ({ title: "Dentro do material", dark: false, items: [{ title: "Primeiros passos", page: "03" }, { title: "Atividades práticas", page: "12" }, { title: "Organização e rotina", page: "24" }] }),
  },
  {
    type: "pricingPlans", label: "Planos de preço", emoji: "💳", description: "Compare dois ou três planos", fields: [T("title", "Título")],
    items: { label: "Plano", fields: [T("title", "Nome"), T("badge", "Etiqueta"), T("highlighted", "Plano destacado", "checkbox"), T("oldPrice", "Preço de"), T("price", "Preço por"), T("features", "Itens (um por linha)", "textarea"), T("buttonText", "Texto do botão"), T("buttonUrl", "Link do botão", "url"), T("buttonBg", "Cor do botão", "color"), T("buttonColor", "Cor do texto do botão", "color"), { ...T("buttonVariant", "Estilo do botão", "select"), options: [{ value: "solid", label: "Preenchido" }, { value: "outline", label: "Contorno" }] }], blank: { title: "Novo plano", badge: "", highlighted: "false", oldPrice: "De R$ 97", price: "R$ 47", features: "Acesso imediato\nMaterial completo", buttonText: "ESCOLHER", buttonUrl: "", buttonVariant: "outline" } },
    defaults: () => ({ title: "Escolha seu acesso", items: [{ title: "Essencial", badge: "", highlighted: "false", oldPrice: "De R$ 97", price: "R$ 47", features: "Material principal\nAcesso imediato", buttonText: "QUERO O ESSENCIAL", buttonUrl: "", buttonVariant: "outline" }, { title: "Completo", badge: "MAIS ESCOLHIDO", highlighted: "true", oldPrice: "De R$ 197", price: "R$ 97", features: "Material principal\nTodos os bônus\nAtualizações incluídas", buttonText: "QUERO O COMPLETO", buttonUrl: "", buttonVariant: "solid" }] }), style: { columns: 2 },
  },
  {
    type: "trustBadges", label: "Selos de confiança", emoji: "🔒", description: "Ícones e textos curtos", fields: [],
    items: { label: "Selo", fields: [T("icon", "Ícone / emoji"), T("text", "Texto")], blank: { icon: "✓", text: "Seu selo" } },
    defaults: () => ({ items: [{ icon: "🔒", text: "Pagamento seguro" }, { icon: "📥", text: "Produto digital" }, { icon: "⚡", text: "Acesso imediato" }, { icon: "🛡️", text: "Compra protegida" }] }), style: { paddingY: 28 },
  },
  {
    type: "checklistAccordion", label: "Categorias em acordeão", emoji: "🗂️", description: "Categorias com checklist expansível", fields: [T("title", "Título")],
    items: { label: "Categoria", fields: [T("title", "Categoria"), T("checklist", "Checklist (um por linha)", "textarea")], blank: { title: "Nova categoria", checklist: "Primeiro item\nSegundo item" } },
    defaults: () => ({ title: "Um recurso para cada situação", items: [{ title: "Para começar", checklist: "Guia prático\nAtividades introdutórias" }, { title: "Para avançar", checklist: "Exercícios complementares\nPlano de acompanhamento" }] }),
  },
  {
    type: "iconCards", label: "Cards com ícone", emoji: "💡", description: "Três ou quatro cards de aprendizado", fields: [T("title", "Título")],
    items: { label: "Card", fields: [T("icon", "Ícone / emoji"), T("title", "Título"), T("text", "Descrição", "textarea")], blank: { icon: "✨", title: "Novo card", text: "Descreva o conteúdo." } },
    defaults: () => ({ title: "O que você vai aprender", items: [{ icon: "💡", title: "Criatividade", text: "Explore novas possibilidades." }, { icon: "🎯", title: "Foco", text: "Avance um passo por vez." }, { icon: "📚", title: "Aprendizado", text: "Pratique com clareza." }, { icon: "🌱", title: "Evolução", text: "Construa sua rotina." }] }), style: { columns: 4 },
  },
  {
    type: "textPhoto", label: "Texto + foto", emoji: "🖼️", description: "Imagem e texto lado a lado", fields: [T("title", "Título"), T("text", "Texto", "textarea"), T("image", "Foto", "image"), T("reverse", "Foto à direita", "checkbox"), ...BTN], hasButton: true,
    items: { label: "Resultado", fields: [T("text", "Texto")], blank: { text: "Novo resultado" } },
    defaults: () => ({ title: "Uma forma mais simples de começar", text: "Conte como o material pode fazer parte da rotina do seu público.", image: "", reverse: false, buttonText: "CONHECER AGORA", buttonUrl: "#oferta", items: [{ text: "Mais clareza no dia a dia" }, { text: "Recursos práticos sempre à mão" }] }),
  },
  {
    type: "finalCta", label: "CTA final em faixa", emoji: "🚀", description: "Urgência, faixa colorida ou degradê e botão", fields: [T("title", "Frase de urgência"), T("text", "Texto", "textarea"), ...BTN], hasButton: true,
    defaults: () => ({ title: "Seu próximo passo pode começar hoje", text: "Garanta seu acesso e explore todas as possibilidades.", buttonText: "QUERO COMEÇAR", buttonUrl: "#oferta" }), style: { bg: "primary", color: "#ffffff", paddingY: 56 },
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
  {
    key: "education-kids", name: "Infoproduto Educação Kids", emoji: "🌈", description: "Kit educativo colorido, atividades, bônus e garantia.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#169447", bg: "#ffffff", text: "#203047", muted: "#526079", surface: "#eef8ff" }, radius: 20, headingFont: "Nunito", font: "Nunito" },
    build: () => {
      const sequence: SectionType[] = ["announcement", "hero", "pains", "text", "textPhoto", "iconCards", "video", "steps", "printCarousel", "benefits", "steps", "bonusCards", "offer", "guarantee", "trustBadges", "faq", "finalCta", "footer"];
      const sections = sequence.map((type, i) => newSection(type, undefined, { bg: ["#ffffff", "#eef8ff", "#fff6dc", "#f6eeff"][i % 4] }));
      sections[0] = newSection("announcement", { text: "Condição especial para começar hoje", showDate: true }, { bg: "#f9db69", color: "#203047", paddingY: 12 });
      sections[1] = newSection("hero", { eyebrow: "KIT DE ATIVIDADES EDUCATIVAS", title: "Aprender também pode ser uma grande brincadeira", subtitle: "Um kit digital com ideias criativas para explorar letras, números e novas descobertas no ritmo de cada criança.", miniBadges: "📥 Acesso imediato\n🖨️ Pronto para imprimir\n🛡️ 30 dias de garantia", buttonText: "QUERO CONHECER O KIT", buttonUrl: "#oferta", buttons: [{ id: uid(), text: "QUERO CONHECER O KIT", url: "#oferta", guarantee: { days: "30", size: 80, variant: "green" } }] }, { paddingY: 56, align: "left" });
      sections[2].content = { ...sections[2].content, title: "Faltam ideias para variar as atividades?", items: [{ text: "Você quer atividades simples de preparar" }, { text: "Busca momentos de aprendizado mais criativos" }, { text: "Precisa de materiais organizados em um só lugar" }] };
      sections[3].content = { title: "Conheça o seu kit de descobertas", body: "Atividades digitais para imprimir, explorar e adaptar à rotina. Este é um exemplo de apresentação: descreva aqui o conteúdo real do seu produto." };
      sections[4].content.title = "Pequenos momentos, grandes descobertas";
      sections[7].content.title = "Benefícios para a sua rotina";
      sections[9].content.title = "O que você recebe no kit";
      sections[10].content = { title: "Comece em três passos", items: [{ title: "Receba por e-mail", text: "Acesse os arquivos após a confirmação." }, { title: "Imprima", text: "Escolha as atividades que fazem sentido." }, { title: "Use e explore", text: "Crie momentos de descoberta." }] };
      sections[13] = newSection("guarantee", { days: "30", title: "Garantia incondicional de 30 dias", text: "Avalie o material com tranquilidade. Descreva aqui as condições reais de reembolso do seu produto.", badge: { days: "30", variant: "gold", size: 190 } }, { bg: "#fff6dc" });
      sections[15].content.items = [{ q: "Como recebo o kit?", a: "O acesso digital chega após a confirmação do pagamento." }, { q: "Posso imprimir?", a: "Descreva aqui os formatos e condições de uso do seu material." }, { q: "Qual é a garantia?", a: "Você tem 30 dias para avaliar o material conforme as condições da oferta." }];
      sections[16] = newSection("finalCta", { title: "Leve mais criatividade para a rotina", text: "Escolha seu kit e comece novas descobertas.", buttonText: "QUERO MEU KIT", buttonUrl: "#oferta" }, { bg: "#169447", color: "#ffffff" });
      sections[17] = newSection("footer");
      return sections;
    },
  },
  {
    key: "modern-purple", name: "Moderno Roxo", emoji: "💜", description: "Visual moderno, quiz, índice, planos e bônus.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#7b39be", bg: "#faf5ee", text: "#302044", muted: "#6d6078", surface: "#ffffff" }, radius: 28, headingFont: "Montserrat", font: "Lato", background: { type: "gradient", gradientType: "linear", stops: [{ color: "#ede2ff", position: 0 }, { color: "#fff9ed", position: 100 }], angle: 135, centerX: 50, centerY: 50, image: "" } },
    build: () => {
      const sequence: SectionType[] = ["announcement", "hero", "benefitStrip", "embeddedQuiz", "iconCards", "iconCards", "checklistAccordion", "materialIndex", "bonusCards", "printCarousel", "countdown", "pricingPlans", "guarantee", "faq", "finalCta", "footer"];
      const sections = sequence.map(type => newSection(type));
      sections[0] = newSection("announcement", { text: "Uma condição especial para o seu próximo passo", showDate: true }, { bg: "#302044", color: "#ffffff", paddingY: 12 });
      sections[1] = newSection("hero", { eyebrow: "SEU MATERIAL DIGITAL", title: "Uma rotina mais leve começa com clareza", highlight: "leve", subtitle: "Organize suas ideias e transforme pequenos passos em uma rotina que faz sentido para você.", miniBadges: "🛡️ Garantia de 7 dias", buttons: [{ id: uid(), text: "QUERO COMEÇAR AGORA", url: "#oferta", radius: 40, guarantee: { days: "7", variant: "purple", size: 76 } }] }, { paddingY: 56, align: "left" });
      sections[2].content.items = [{ text: "Acesso imediato" }, { text: "Material digital" }, { text: "Garantia de 7 dias" }];
      sections[5].content.title = "Por que usar no seu dia a dia";
      sections[7].content.dark = true;
      sections[12] = newSection("guarantee", { days: "7", badge: { days: "7", variant: "purple", size: 190 }, title: "Sua escolha com tranquilidade", text: "Você tem 7 dias para avaliar o material. Ajuste este texto às condições reais da sua oferta." });
      sections[14] = newSection("finalCta", undefined, { color: "#ffffff", background: { type: "gradient", gradientType: "linear", stops: [{ color: "#6530a8", position: 0 }, { color: "#a245b0", position: 100 }], angle: 110, centerX: 50, centerY: 50, image: "" } });
      return sections;
    },
  },

];
