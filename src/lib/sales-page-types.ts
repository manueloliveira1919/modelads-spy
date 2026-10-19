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
    fields: [T("text", "Texto"), { ...T("mode", "Modo do aviso", "select"), options: [{ value: "text", label: "Só texto" }, { value: "date", label: "Texto e data" }, { value: "countdown", label: "Texto e hora (contagem)" }] }, T("dateAutomatic", "Data automática", "checkbox"), T("dateText", "Data personalizada"), { ...T("timerType", "Tipo de contagem", "select"), options: [{ value: "date", label: "Data e hora final" }, { value: "duration", label: "Duração" }, { value: "midnight", label: "Até meia-noite (todo dia)" }] }, T("timerBoxes", "Contagem em caixinhas (h:m:s)", "checkbox"), T("endAt", "Data e hora final", "datetime"), T("durationSeconds", "Duração em segundos", "number"), { ...T("expiry", "Quando terminar", "select"), options: [{ value: "text", label: "Mostrar aviso final" }, { value: "hide", label: "Ocultar faixa" }] }, T("expiredText", "Aviso final")],
    defaults: () => ({ text: "Condição especial por tempo limitado", mode: "text", dateAutomatic: "true", timerType: "date", durationSeconds: "3600", expiry: "text", expiredText: "Oferta encerrada" }),
    style: { paddingY: 10, textSize: 14 },
  },
  {
    type: "hero",
    label: "Hero / Topo",
    emoji: "🚀",
    description: "Título principal, subtítulo, imagem e botão",
    fields: [T("eyebrow", "Chamada pequena"), T("title", "Título", "textarea"), T("subtitle", "Subtítulo", "textarea"), T("image", "Imagem", "image"), T("videoUrl", "Vídeo (substitui a imagem)", "video"), T("highlight", "Palavra em destaque"), T("highlightItalic", "Destaque em itálico", "checkbox"), T("proof", "Cápsula de prova social"), T("mediaFirst", "Mídia antes do título", "checkbox"), T("mediaVertical", "Mídia vertical (9:16)", "checkbox"), T("mediaCaption", "Legenda da mídia"), T("priceLine", "Linha abaixo do botão"), T("checks", "Itens com check (um por linha)", "textarea"), T("rating", "Texto das estrelas"), T("miniBadges", "Mini-selos (um por linha)", "textarea"), ...BTN],
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
    fields: [T("title", "Título"), T("showIcon", "Mostrar ícone nos itens", "checkbox")],
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
    fields: [T("title", "Título"), T("subtitle", "Subtítulo", "textarea")],
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
    items: { label: "Depoimento", fields: [T("name", "Nome"), T("role", "Cargo / descrição"), T("text", "Depoimento", "textarea"), T("image", "Foto", "image")], blank: { name: "Cliente", text: "Meu depoimento.", image: "" } },
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
    fields: [T("title", "Título"), T("badge", "Etiqueta de destaque"), T("timerEnabled", "Mostrar contagem regressiva", "checkbox"), T("timerTitle", "Texto da contagem"), { ...T("durationSeconds", "Duração em segundos", "number"), min: 1, max: 86400 }, T("oldPrice", "Preço antigo (riscado)"), T("price", "Preço"), T("installments", "Parcelamento"), ...BTN, T("note", "Observação abaixo do botão")],
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
    fields: [T("title", "Título"), T("text", "Texto", "textarea"), T("boxBorderColor", "Borda tracejada (cor)", "color"), T("boxBg", "Fundo da caixa", "color")],
    defaults: () => ({ days: "7", title: "Garantia incondicional de 7 dias", text: "Se por qualquer motivo você não gostar, devolvemos 100% do seu dinheiro. Sem perguntas." }),
  },
  {
    type: "faq",
    label: "Perguntas frequentes",
    emoji: "❓",
    description: "Perguntas e respostas expansíveis",
    fields: [T("eyebrow", "Etiqueta"), T("title", "Título"), T("openFirst", "Primeira pergunta aberta", "checkbox")],
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
    fields: [T("eyebrow", "Etiqueta"), T("title", "Título"), T("endAt", "Termina em", "datetime"), T("showSeconds", "Mostrar segundos", "checkbox"), T("text", "Texto abaixo da contagem", "textarea"), ...BTN],
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
    type: "bonusCards", label: "Cards de bônus", emoji: "🎁", description: "Imagens, preço riscado e etiqueta editável", fields: [T("title", "Título"), T("subtitle", "Subtítulo", "textarea")],
    items: { label: "Bônus", fields: [T("image", "Imagem", "image"), T("title", "Nome"), T("text", "Descrição", "textarea"), T("value", "Preço de"), T("badge", "Etiqueta")], blank: { image: "", title: "Novo bônus", text: "Material complementar.", value: "De R$ 47", badge: "GRÁTIS" } },
    defaults: () => ({ title: "Mais recursos para você", items: [{ image: "", title: "Guia de início rápido", text: "Um resumo prático para começar.", value: "De R$ 47", badge: "GRÁTIS" }, { image: "", title: "Planner de atividades", text: "Organize sua próxima semana.", value: "De R$ 37", badge: "GRÁTIS" }] }), style: { columns: 2 },
  },
  {
    type: "printCarousel", label: "Carrossel de prints", emoji: "📸", description: "Imagens com setas e navegação", fields: [T("title", "Título"), T("subtitle", "Subtítulo", "textarea"), { ...T("carouselMode", "Modo do carrossel", "select"), options: [{ value: "manual", label: "Manual" }, { value: "auto", label: "Automático" }] }, T("intervalSeconds", "Intervalo em segundos", "number"), { ...T("perView", "Imagens visíveis no computador", "select"), options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }] }, { ...T("imageRatio", "Proporção das imagens", "select"), options: [{ value: "4/3", label: "Paisagem 4:3" }, { value: "1/1", label: "Quadrado" }, { value: "3/4", label: "Retrato" }, { value: "16/9", label: "Paisagem 16:9" }] }, T("imageRadius", "Arredondamento das imagens", "number"), T("showArrows", "Mostrar setas", "checkbox"), T("showDots", "Mostrar pontos", "checkbox")],
    items: { label: "Print", fields: [T("image", "Imagem", "image"), T("caption", "Legenda / descrição")], blank: { image: "", caption: "Seu depoimento aqui" } },
    defaults: () => ({ title: "Experiências de quem já começou", carouselMode: "manual", intervalSeconds: "5", perView: "1", imageRatio: "4/3", imageRadius: "8", showArrows: "true", showDots: "true", items: [{ image: "", caption: "Insira um depoimento autorizado" }, { image: "", caption: "Insira outro depoimento autorizado" }, { image: "", caption: "Mais uma experiência real" }] }),
  },
  {
    type: "materialIndex", label: "Índice do material", emoji: "📑", description: "Conteúdo numerado e página à direita", fields: [T("title", "Título"), T("dark", "Fundo escuro", "checkbox")],
    items: { label: "Capítulo", fields: [T("title", "Título"), T("page", "Página")], blank: { title: "Novo capítulo", page: "01" } },
    defaults: () => ({ title: "Dentro do material", dark: false, items: [{ title: "Primeiros passos", page: "03" }, { title: "Atividades práticas", page: "12" }, { title: "Organização e rotina", page: "24" }] }),
  },
  {
    type: "pricingPlans", label: "Planos de preço", emoji: "💳", description: "Compare de dois a quatro planos", fields: [T("eyebrow", "Etiqueta"), T("title", "Título"), T("subtitle", "Subtítulo", "textarea"), T("note", "Linha abaixo dos planos")],
    items: { label: "Plano", fields: [T("title", "Nome"), T("badge", "Etiqueta"), T("oldPrice", "Preço de"), T("price", "Preço por"), T("period", "Período / parcelamento"), T("cardBg", "Fundo do plano", "color"), T("textColor", "Cor do texto do plano", "color"), T("image", "Imagem do plano", "image"), T("description", "Descrição", "textarea"), T("savings", "Linha de economia"), T("seal", "Selo redondo no canto"), T("includedLabel", "Título da lista inclui"), T("features", "Itens (um por linha)", "textarea"), T("excludedLabel", "Título da lista não inclui"), T("excluded", "Itens não incluídos (um por linha)", "textarea"), T("checkColor", "Cor dos checks", "color"), T("buttonText", "Texto do botão"), T("buttonUrl", "Link do botão", "url"), T("paymentNote", "Linha abaixo do botão"), T("buttonBg", "Cor do botão", "color"), T("buttonColor", "Cor do texto do botão", "color"), { ...T("buttonVariant", "Estilo do botão", "select"), options: [{ value: "solid", label: "Preenchido" }, { value: "outline", label: "Contorno" }] }], blank: { title: "Novo plano", badge: "", highlighted: "false", oldPrice: "De R$ 97", price: "R$ 47", features: "Acesso imediato\nMaterial completo", buttonText: "ESCOLHER", buttonUrl: "", buttonVariant: "outline" } },
    defaults: () => ({ title: "Escolha seu acesso", items: [{ title: "Essencial", badge: "", highlighted: "false", oldPrice: "De R$ 97", price: "R$ 47", features: "Material principal\nAcesso imediato", buttonText: "QUERO O ESSENCIAL", buttonUrl: "", buttonVariant: "outline" }, { title: "Completo", badge: "MAIS ESCOLHIDO", highlighted: "true", oldPrice: "De R$ 197", price: "R$ 97", features: "Material principal\nTodos os bônus\nAtualizações incluídas", buttonText: "QUERO O COMPLETO", buttonUrl: "", buttonVariant: "solid" }] }), style: { columns: 2 },
  },
  {
    type: "trustBadges", label: "Selos de confiança", emoji: "🔒", description: "Ícones e textos curtos", fields: [],
    items: { label: "Selo", fields: [T("icon", "Ícone / emoji"), T("text", "Texto")], blank: { icon: "✓", text: "Seu selo" } },
    defaults: () => ({ items: [{ icon: "🔒", text: "Pagamento seguro" }, { icon: "📥", text: "Produto digital" }, { icon: "⚡", text: "Acesso imediato" }, { icon: "🛡️", text: "Compra protegida" }] }), style: { paddingY: 28 },
  },
  {
    type: "checklistAccordion", label: "Categorias em acordeão", emoji: "🗂️", description: "Categorias com checklist expansível", fields: [T("title", "Título"), T("openFirst", "Primeira categoria aberta", "checkbox"), T("multipleOpen", "Permitir várias abertas", "checkbox")],
    items: { label: "Categoria", fields: [T("icon", "Ícone / emoji"), T("title", "Categoria"), T("subtitle", "Subtítulo"), T("checklist", "Checklist (um por linha)", "textarea")], blank: { title: "Nova categoria", checklist: "Primeiro item\nSegundo item" } },
    defaults: () => ({ title: "Um recurso para cada situação", items: [{ title: "Para começar", checklist: "Guia prático\nAtividades introdutórias" }, { title: "Para avançar", checklist: "Exercícios complementares\nPlano de acompanhamento" }] }),
  },
  {
    type: "iconCards", label: "Cards com ícone", emoji: "💡", description: "Três ou quatro cards de aprendizado", fields: [T("eyebrow", "Etiqueta"), T("title", "Título"), T("closing", "Frase final")],
    items: { label: "Card", fields: [T("icon", "Ícone / emoji"), T("title", "Título"), T("text", "Descrição", "textarea")], blank: { icon: "✨", title: "Novo card", text: "Descreva o conteúdo." } },
    defaults: () => ({ title: "O que você vai aprender", items: [{ icon: "💡", title: "Criatividade", text: "Explore novas possibilidades." }, { icon: "🎯", title: "Foco", text: "Avance um passo por vez." }, { icon: "📚", title: "Aprendizado", text: "Pratique com clareza." }, { icon: "🌱", title: "Evolução", text: "Construa sua rotina." }] }), style: { columns: 4 },
  },
  {
    type: "textPhoto", label: "Texto + foto", emoji: "🖼️", description: "Imagem e texto lado a lado", fields: [T("eyebrow", "Etiqueta"), T("title", "Título"), T("text", "Texto", "textarea"), T("image", "Foto", "image"), T("reverse", "Foto à direita", "checkbox"), T("panel", "Exibir como card", "checkbox"), ...BTN], hasButton: true,
    items: { label: "Resultado", fields: [T("icon", "Ícone"), T("text", "Texto")], blank: { text: "Novo resultado" } },
    defaults: () => ({ title: "Uma forma mais simples de começar", text: "Conte como o material pode fazer parte da rotina do seu público.", image: "", reverse: false, buttonText: "CONHECER AGORA", buttonUrl: "#oferta", items: [{ text: "Mais clareza no dia a dia" }, { text: "Recursos práticos sempre à mão" }] }),
  },
  {
    type: "finalCta", label: "CTA final em faixa", emoji: "🚀", description: "Urgência, faixa colorida ou degradê e botão", fields: [T("title", "Frase de urgência"), T("text", "Texto", "textarea"), ...BTN, T("note", "Linha abaixo do botão")], hasButton: true,
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
    key: "activities-kids", name: "Infoprodutos Atividades Kids", emoji: "🧩", description: "Atividades para professores: hero com vídeo, identificação, planos, garantia e FAQ.",
    settings: {
      font: "Nunito", headingFont: "Poppins", radius: 16, maxWidth: 1080,
      colors: { primary: "#5B2AA6", bg: "#FBF7EE", text: "#2B1B3A", muted: "#6B5E7A", surface: "#FFFFFF", buttonText: "#2B1B3A" },
    },
    build: () => {
      const card = { bg: "#FFFFFF", borderColor: "#ECE4F5", borderWidth: 1, radius: 16 };
      const cards = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`items.${i}`, card]));
      const toPopular = (text: string) => ({ id: uid(), text, url: "", destination: { type: "popular" as const, popularAction: "scroll" as const }, radius: 999, size: 18, bg: "#F5B82E", color: "#2B1B3A" });
      const eyebrow = { color: "#5B2AA6" };
      const announcement = newSection("announcement", { text: "Oferta especial disponível por tempo limitado", mode: "countdown", timerType: "midnight", timerBoxes: "true", expiry: "text", expiredText: "Oferta encerrada" }, { bg: "#2B1457", color: "#FFFFFF", paddingY: 12 });
      const hero = newSection("hero", {
        eyebrow: "PARA QUEM DÁ AULA PARA CRIANÇAS", title: "+150 Dinâmicas de [SEU PRODUTO] prontas para aplicar já na próxima aula", highlight: "prontas para aplicar", highlightItalic: "false",
        subtitle: "Planeje suas aulas em menos de 10 minutos e nunca mais fique sem ideias para manter as crianças engajadas.",
        proof: "Material utilizado por +[X] professores para reduzir o tempo de planejamento",
        image: "", showMediaPlaceholder: true, mediaVertical: "true", mediaCaption: "Assista em 1 minuto o que você vai receber",
        buttons: [toPopular("QUERO RECEBER O [SEU PRODUTO]")], priceLine: "Comece a partir de R$ [X] no Plano Básico",
        checks: "Acesso imediato\nArquivos em PDF para imprimir\nGarantia de 7 dias", checkColor: "#1FA463", rating: "Mais de [X] professores já utilizam",
      }, { paddingY: 64, maxWidth: 860, titleSize: 44, align: "center" });
      hero.elementStyles = { eyebrow: { bg: "#EFE6FB", color: "#5B2AA6", radius: 999, paddingTop: 6, paddingBottom: 6, paddingX: 16, width: 46, align: "center" }, subtitle: { color: "#6B5E7A" }, proof: { bg: "#FFFFFF", borderColor: "#ECE4F5", borderWidth: 1, radius: 999 }, priceLine: { color: "#6B5E7A" } };
      const pains = newSection("iconCards", { eyebrow: "SE VOCÊ SE IDENTIFICA, É PRA VOCÊ", title: "Você vive alguma dessas situações?", closing: "Você não precisa mais criar tudo do zero.", items: [
        { icon: "⏳", title: "Passa horas procurando atividades", text: "Perde tempo buscando ideias em vários lugares." },
        { icon: "🔁", title: "Repete sempre as mesmas brincadeiras", text: "As aulas acabam ficando parecidas." },
        { icon: "🎭", title: "Precisa improvisar durante as aulas", text: "Falta um plano pronto para o momento certo." },
        { icon: "😴", title: "As crianças perdem o interesse rapidamente", text: "Fica difícil manter a turma engajada." },
        { icon: "📋", title: "Gasta mais tempo planejando do que ensinando", text: "O planejamento toma o seu tempo livre." },
        { icon: "✨", title: "Gostaria de preparar aulas melhores em poucos minutos", text: "Quer praticidade sem perder a qualidade." },
      ] }, { columns: 3, paddingY: 80 });
      pains.elementStyles = { ...cards(6), eyebrow };
      const creator = newSection("textPhoto", { eyebrow: "QUEM CRIOU", title: "[NOME DA CRIADORA]", text: "Escreva aqui uma mini bio: formação, tempo de experiência com crianças e por que criou este material.", image: "", reverse: false, items: [], buttons: [] }, { paddingY: 72, align: "left", bg: "#FFFFFF" });
      creator.elementStyles = { eyebrow, image: { radius: 16 } };
      const banner = newSection("textPhoto", { title: "Conheça o [SEU PRODUTO]", text: "Descreva em poucas linhas o que é o material e como ele ajuda no dia a dia das aulas.", image: "", panel: "true", reverse: false, items: [{ icon: "📚", text: "+150 dinâmicas prontas" }, { icon: "🖨️", text: "Pronto para imprimir" }, { icon: "⚡", text: "Acesso imediato" }], buttons: [toPopular("QUERO O [SEU PRODUTO]")] }, { paddingY: 72, align: "left" });
      banner.elementStyles = { panel: { bg: "#FFFFFF", borderColor: "#ECE4F5", borderWidth: 1, radius: 24, paddingTop: 32, paddingBottom: 32, paddingX: 32 } };
      const change = newSection("iconCards", { eyebrow: "A MUDANÇA NA SUA ROTINA", title: "O que muda quando você começa a usar o [SEU PRODUTO]", items: [
        "Planeje suas aulas muito mais rápido", "Nunca mais fique sem ideias", "Atividades organizadas por faixa etária", "Material pronto para imprimir",
        "Crianças mais engajadas", "Menos estresse para preparar aulas", "Utilize materiais simples", "Acesso vitalício",
      ].map(title => ({ icon: "✓", title, text: "" })), buttons: [toPopular("QUERO COMEÇAR AGORA")] }, { columns: 4, paddingY: 80, accent: "#1FA463", bg: "#FFFFFF" });
      change.elementStyles = { ...cards(8), eyebrow: { color: "#5B2AA6" } };
      const prints = newSection("printCarousel", { eyebrow: "PROVA SOCIAL", title: "Quem compra, continua usando.", carouselMode: "manual", perView: "3", imageRatio: "3/4", imageRadius: "16", showArrows: "true", showDots: "true", items: [1, 2, 3].map(n => ({ image: "", caption: `Print de conversa ${n}` })) }, { paddingY: 72 });
      prints.elementStyles = { eyebrow };
      const reviews = newSection("testimonials", { title: "", items: [
        { name: "Professora A.", role: "Educação Infantil", text: "Escreva aqui uma avaliação real e autorizada de quem usa o material.", image: "" },
        { name: "Professor B.", role: "Ensino Fundamental", text: "Escreva aqui uma avaliação real e autorizada de quem usa o material.", image: "" },
        { name: "Recreadora C.", role: "Recreação infantil", text: "Escreva aqui uma avaliação real e autorizada de quem usa o material.", image: "" },
      ] }, { paddingY: 40 });
      reviews.elementStyles = cards(3);
      const receive = newSection("iconCards", { eyebrow: "O QUE VOCÊ RECEBE", title: "Um kit completo para utilizar durante todo o ano.", items: [
        { icon: "📘", title: "Livro principal", text: "As dinâmicas organizadas e prontas para aplicar." },
        { icon: "🎨", title: "Atividades abertas", text: "Propostas para adaptar à sua turma." },
        { icon: "🗓️", title: "Planner anual", text: "Organize as aulas do ano inteiro." },
        { icon: "👶", title: "Guia por faixa etária", text: "Saiba qual atividade usar com cada idade." },
        { icon: "✅", title: "Kit de avaliação", text: "Acompanhe a evolução das crianças." },
        { icon: "✂️", title: "Lista de materiais", text: "Tudo o que separar antes da aula." },
      ] }, { columns: 3, paddingY: 80, bg: "#FFFFFF" });
      receive.elementStyles = { ...cards(6), eyebrow };
      const plans = newSection("pricingPlans", { eyebrow: "ESCOLHA SEU ACESSO", title: "Tenha acesso à versão completa do [SEU PRODUTO].", note: "Escolhendo o Premium você economiza R$ [X] em relação a comprar cada material separado.", popularPlan: 1, items: [
        { title: "Plano Básico", badge: "", highlighted: "false", oldPrice: "", price: "R$ 5,90", period: "Pagamento único", includedLabel: "INCLUI", features: "Livro principal com as dinâmicas\nArquivos em PDF\nAcesso imediato", excludedLabel: "NÃO INCLUI", excluded: "Atividades abertas\nPlanner anual\nGuia por faixa etária\nKit de avaliação", buttonText: "Quero apenas o Básico", buttonUrl: "", buttonBg: "#5B2AA6", buttonColor: "#5B2AA6", buttonVariant: "outline", cardBg: "#FFFFFF", textColor: "#2B1B3A", checkColor: "#1FA463" },
        { title: "Plano Premium", badge: "MAIS ESCOLHIDO", highlighted: "true", seal: "GARANTIA 7 DIAS", image: "", description: "O kit completo para usar o ano inteiro.", oldPrice: "De R$ [X]", price: "Por apenas R$ 17,00", period: "Pagamento único. Sem mensalidade.", savings: "Você economiza R$ [X]", includedLabel: "", features: "Tudo do Plano Básico\nAtividades abertas\nPlanner anual\nGuia por faixa etária\nKit de avaliação\nLista de materiais", buttonText: "SIM! QUERO O PREMIUM", buttonUrl: "", buttonBg: "#1FA463", buttonColor: "#FFFFFF", buttonVariant: "solid", paymentNote: "Cartão de crédito | PIX | Compra 100% segura | Acesso imediato por e-mail", cardBg: "#FFFFFF", textColor: "#2B1B3A", checkColor: "#1FA463" },
      ] }, { bg: "#2B1457", color: "#FFFFFF", accent: "#F5B82E", buttonColor: "#2B1B3A", columns: 2, paddingY: 88 });
      plans.elementStyles = { eyebrow: { color: "#F5B82E" }, "items.0.price": { color: "#5B2AA6" }, "items.1.price": { color: "#5B2AA6" }, "items.1.seal": { bg: "#1FA463", color: "#FFFFFF" }, "items.1.button": { paddingTop: 18, paddingBottom: 18 } };
      const guarantee = newSection("guarantee", { days: "7", title: "Garantia de 7 dias", text: "Baixe, imprima e utilize o material durante 7 dias. Se perceber que não é para você, basta solicitar o reembolso dentro do prazo. Sem burocracia.", badge: { days: "7", variant: "green", size: 170, topText: "GARANTIA", bottomText: "DE 7 DIAS" } }, { paddingY: 80, align: "left" });
      const faq = newSection("faq", { eyebrow: "DÚVIDAS RÁPIDAS", title: "Antes de decidir", openFirst: "true", items: [
        { q: "Recebo imediatamente?", a: "Sim. O acesso chega no seu e-mail logo após a confirmação do pagamento." },
        { q: "Como acesso o material?", a: "Pelo link enviado por e-mail, no celular ou no computador." },
        { q: "Posso imprimir quantas vezes quiser?", a: "Sim. Os arquivos são seus para imprimir sempre que precisar." },
        { q: "Preciso pagar mensalidade?", a: "Não. O pagamento é único." },
        { q: "Como funciona a garantia?", a: "Você tem 7 dias para pedir o reembolso, sem burocracia." },
        { q: "Essas atividades servem para diferentes idades?", a: "Sim. O material traz indicações por faixa etária." },
      ] }, { paddingY: 80, bg: "#FFFFFF" });
      faq.elementStyles = { ...cards(6), eyebrow };
      const final = newSection("finalCta", { title: "Pare de perder horas planejando suas aulas.", text: "Tenha dinâmicas prontas para cada aula e mais tempo para o que importa.", buttons: [toPopular("QUERO RECEBER O [SEU PRODUTO] AGORA")], note: "Acesso imediato • Pagamento único de R$ [X] • Garantia de 7 dias" }, { bg: "#2B1457", color: "#FFFFFF", paddingY: 80 });
      const footer = newSection("footer", { text: "[SEU PRODUTO] - material digital em PDF para profissionais que trabalham com crianças." }, { bg: "#2B1457", color: "#D9CCF0", paddingY: 28 });
      return [announcement, hero, pains, creator, banner, change, prints, reviews, receive, plans, guarantee, faq, final, footer];
    },
  },
  {
    key: "modern-purple", name: "Moderno Roxo", emoji: "💜", description: "Visual moderno, quiz, índice, planos e bônus.",
    settings: { colors: { ...DEFAULT_PAGE_SETTINGS.colors, primary: "#7b39be", bg: "#faf5ee", text: "#302044", muted: "#6d6078", surface: "#ffffff" }, radius: 28, headingFont: "Montserrat", font: "Lato", background: { type: "gradient", gradientType: "linear", stops: [{ color: "#ede2ff", position: 0 }, { color: "#fff9ed", position: 100 }], angle: 135, centerX: 50, centerY: 50, image: "" } },
    build: () => {
      const sequence: SectionType[] = ["announcement", "hero", "benefitStrip", "embeddedQuiz", "iconCards", "iconCards", "checklistAccordion", "materialIndex", "bonusCards", "printCarousel", "countdown", "pricingPlans", "guarantee", "faq", "finalCta", "footer"];
      const sections = sequence.map(type => newSection(type));
      sections[0] = newSection("announcement", { text: "Uma condição especial para o seu próximo passo", mode: "date" }, { bg: "#302044", color: "#ffffff", paddingY: 12 });
      sections[1] = newSection("hero", { eyebrow: "SEU MATERIAL DIGITAL", title: "Uma rotina mais leve começa com clareza", highlight: "leve", subtitle: "Organize suas ideias e transforme pequenos passos em uma rotina que faz sentido para você.", miniBadges: "🛡️ Garantia de 7 dias", buttons: [{ id: uid(), text: "QUERO COMEÇAR AGORA", url: "#oferta", radius: 40, guarantee: { days: "7", variant: "purple", size: 76 } }] }, { paddingY: 56, align: "left" });
      sections[2].content.items = [{ text: "Acesso imediato" }, { text: "Material digital" }, { text: "Garantia de 7 dias" }];
      sections[5].content.title = "Por que usar no seu dia a dia";
      sections[7].content.dark = true;
      sections[12] = newSection("guarantee", { days: "7", badge: { days: "7", variant: "purple", size: 190 }, title: "Sua escolha com tranquilidade", text: "Você tem 7 dias para avaliar o material. Ajuste este texto às condições reais da sua oferta." });
      sections[14] = newSection("finalCta", undefined, { color: "#ffffff", background: { type: "gradient", gradientType: "linear", stops: [{ color: "#6530a8", position: 0 }, { color: "#a245b0", position: 100 }], angle: 110, centerX: 50, centerY: 50, image: "" } });
      return sections;
    },
  },

  {
    key: "natural-recipes", name: "Receitas Naturais", emoji: "🌿", description: "Receitas, benefícios, bônus, oferta, exemplos e garantia.",
    settings: {
      font: "Nunito Sans", headingFont: "Fraunces", radius: 18, maxWidth: 1080,
      colors: { primary: "#3F6B2E", bg: "#F5F8EE", text: "#26301F", muted: "#55624A", surface: "#FFFFFF", buttonText: "#FFFFFF" },
    },
    build: () => {
      const offer = newSection("offer", { title: "", badge: "OFERTA POR TEMPO LIMITADO", timerEnabled: "true", timerTitle: "Essa oferta termina em", durationSeconds: "900", oldPrice: "De R$ 97,00", price: "R$ 27,00", installments: "Pagamento único. Acesso imediato.", buttonText: "Quero aproveitar agora", note: "Compra segura. Garantia de 7 dias.", items: [] }, { bg: "#EAF1DA", paddingY: 88 });
      const button = (text: string) => ({ id: uid(), text, url: `#sp-section-${offer.id}`, destination: { type: "section" as const, sectionId: offer.id }, radius: 999, size: 18 });
      offer.content.buttons = [button("Quero aproveitar agora")];
      offer.elementStyles = { offerCard: { bg: "#FFFFFF", borderWidth: 2, borderColor: "#3F6B2E", radius: 24 }, badge: { bg: "#F2C14E", color: "#26301F", radius: 999 }, price: { size: 60 } };
      const hero = newSection("hero", { eyebrow: "RECEITAS NATURAIS", title: "Receitas naturais simples para o seu dia a dia", subtitle: "Chás, sucos, temperos e preparos caseiros com ingredientes que você encontra no mercado, em passo a passo fácil de seguir.", image: "", showMediaPlaceholder: true, buttons: [button("Quero meu material")] }, { bg: "#EAF1DA", paddingY: 72, maxWidth: 900, titleSize: 52 });
      hero.elementStyles = { eyebrow: { bg: "#F2C14E", color: "#26301F", radius: 999, paddingTop: 8, paddingBottom: 8, paddingX: 20, width: 44, align: "center" }, subtitle: { color: "#55624A" }, image: { width: 78, align: "center", radius: 18, bg: "#E3EDCF" } };
      const receive = newSection("steps", { title: "O que você vai receber", subtitle: "Um material digital completo, pronto para abrir no celular ou imprimir.", items: [
        { icon: "01", title: "+100 receitas", text: "Chás, sucos, infusões e preparos organizados por categoria." },
        { icon: "02", title: "Passo a passo ilustrado", text: "Ingredientes, medidas e modo de preparo sem complicação." },
        { icon: "03", title: "Lista de compras", text: "Tudo o que comprar para começar, com opções de substituição." },
        { icon: "04", title: "Acesso imediato", text: "Receba no e-mail logo após a compra." },
      ] }, { bg: "#F5F8EE", columns: 4, paddingY: 88 });
      const benefits = newSection("benefits", { title: "Por que escolher nosso material?", items: [
        { icon: "", title: "Ingredientes simples", text: "Use ingredientes fáceis de encontrar no mercado." },
        { icon: "", title: "Rápido de preparar", text: "Preparos práticos que cabem na rotina." },
        { icon: "", title: "Feito para iniciantes", text: "Instruções claras para começar com confiança." },
      ] }, { bg: "#26301F", color: "#F5F8EE", paddingY: 88 });
      const bonus = newSection("bonusCards", { title: "Você ainda leva 3 bônus", items: [
        { image: "", title: "Bônus 1: Guia de ervas e temperos", text: "Conheça combinações e formas simples de usar ervas e temperos.", badge: "GRÁTIS", value: "" },
        { image: "", title: "Bônus 2: Cardápio semanal natural", text: "Ideias para organizar seus preparos ao longo da semana.", badge: "GRÁTIS", value: "" },
        { image: "", title: "Bônus 3: Receitas de sucos e águas saborizadas", text: "Combinações de frutas e ingredientes para variar os sabores.", badge: "GRÁTIS", value: "" },
      ] }, { bg: "#F5F8EE", columns: 3, paddingY: 88 });
      const carousel = newSection("printCarousel", { title: "Veja exemplos do material", subtitle: "Deslize para ver algumas páginas por dentro.", carouselMode: "manual", perView: "3", imageRatio: "3/4", imageRadius: "18", items: Array.from({ length: 5 }, (_, i) => ({ image: "", caption: `Página ${i + 1} do material` })) }, { bg: "#F5F8EE", paddingY: 88 });
      const testimonials = newSection("testimonials", { title: "Quem comprou, aprovou", items: [
        { name: "Mariana S.", text: "Gostei da organização das receitas. O passo a passo é fácil de acompanhar.", image: "" },
        { name: "Carlos R.", text: "A lista de compras ajudou bastante. Encontrei tudo para começar.", image: "" },
        { name: "Joana P.", text: "O material é bonito e prático. Adorei as ideias para variar os preparos.", image: "" },
      ] }, { bg: "#E3EDCF", paddingY: 88 });
      const guarantee = newSection("guarantee", { days: "7", title: "Garantia de 7 dias", text: "Garantia de 7 dias: acesse o material e teste as receitas. Se por qualquer motivo você não gostar, é só pedir o reembolso em até 7 dias e devolvemos 100% do valor.", badge: { days: "7", variant: "custom", color: "#3F6B2E", size: 170, topText: "GARANTIA", bottomText: "DE SATISFAÇÃO" } }, { bg: "#F5F8EE", paddingY: 88, align: "left" });
      for (const section of [receive, bonus, testimonials]) {
        section.elementStyles = Object.fromEntries((section.content.items || []).map((_: Item, i: number) => [`items.${i}`, { bg: "#FFFFFF", borderColor: "#DDE6CC", borderWidth: 1, radius: 18 }]));
      }
      bonus.elementStyles = { ...bonus.elementStyles, ...Object.fromEntries([0, 1, 2].map(i => [`items.${i}.badge`, { bg: "#F2C14E", color: "#26301F" }])) };
      return [hero, receive, benefits, bonus, offer, carousel, testimonials, guarantee, newSection("footer", { text: "Todos os direitos reservados." }, { bg: "#26301F", color: "#EAF1DA", paddingY: 28 })];
    },
  },

  {
    key: "christmas-crafts", name: "Natal - Moldes e Lembrancinhas", emoji: "🎄", description: "Aviso com contagem, passos, produtos, planos, garantia, FAQ e contagem até o Natal.",
    settings: {
      font: "Nunito Sans", headingFont: "Outfit", radius: 16, maxWidth: 1080,
      colors: { primary: "#1F6B3A", bg: "#FFF6EA", text: "#2B1B14", muted: "#6B5A4A", surface: "#FFFFFF", buttonText: "#FFFFFF" },
    },
    build: () => {
      const plans = newSection("pricingPlans", { eyebrow: "ESCOLHA SEU KIT", title: "Uma encomenda paga o kit inteiro", subtitle: "Pagamento único. Sem mensalidade. Você recebe o acesso no e-mail assim que o pagamento é confirmado.", note: "Compra segura | Pix, cartão ou boleto | 7 dias de garantia", popularPlan: 1, items: [
        { title: "Pack Essencial", badge: "", highlighted: "false", oldPrice: "", price: "R$ 19,90", period: "Pagamento único", features: "+100 moldes prontos de lembrancinhas\nArquivos em PDF e PNG tamanho A4\nLicença comercial para vender as peças", buttonText: "Quero o Pack Essencial", buttonUrl: "", buttonBg: "#1F6B3A", buttonColor: "#FFFFFF", buttonVariant: "solid", cardBg: "#FFFFFF", textColor: "#2B1B14" },
        { title: "Pack VIP Negócio", badge: "RECOMENDADO PARA VENDER", highlighted: "true", oldPrice: "", price: "R$ 27,90", period: "Pagamento único", features: "Tudo do Pack Essencial\nTabela de precificação\nIdeias de divulgação para WhatsApp e Instagram\nTags, cartões e adesivos\nMoldes de enfeites de árvore", buttonText: "Quero o Pack VIP", buttonUrl: "", buttonBg: "#F2B33D", buttonColor: "#3A2A00", buttonVariant: "solid", cardBg: "#FFFFFF", textColor: "#2B1B14" },
      ] }, { bg: "#A30F1E", color: "#FFF6EA", accent: "#F2B33D", buttonColor: "#3A2A00", columns: 2, paddingY: 88 });
      plans.elementStyles = { eyebrow: { color: "#F2B33D" }, "items.0.price": { color: "#1F6B3A" }, "items.1.price": { color: "#A30F1E" } };
      const toPlans = (text: string, gold = false) => ({ id: uid(), text, url: `#sp-section-${plans.id}`, destination: { type: "section" as const, sectionId: plans.id }, radius: 999, size: 18, ...(gold ? { bg: "#F2B33D", color: "#3A2A00" } : { bg: "#1F6B3A", color: "#FFFFFF" }) });
      const nextChristmas = () => { const now = new Date(); let y = now.getFullYear(); if (now > new Date(y, 11, 25)) y++; return `${y}-12-25T00:00`; };
      const card = { bg: "#FFFFFF", borderColor: "#F0DFC8", borderWidth: 1, radius: 16 };
      const cards = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`items.${i}`, card]));
      const announcement = newSection("announcement", { text: "Preço promocional válido só até meia-noite", mode: "countdown", timerType: "midnight", timerBoxes: "true", expiry: "text", expiredText: "Oferta encerrada" }, { bg: "#B3141F", color: "#FFFFFF", paddingY: 12 });
      const hero = newSection("hero", { eyebrow: "", mediaFirst: "true", showMediaPlaceholder: true, image: "", title: "Mais de 100 moldes prontos para você imprimir, montar e vender neste Natal", subtitle: "Você imprime, monta e fatura alto vendendo para empresas, escolas, amigos e clientes da sua cidade.", miniBadges: "Acesso imediato\nPagamento único a partir de R$ 19,90\nGarantia de 7 dias", buttons: [toPlans("QUERO COMEÇAR AGORA")] }, { paddingY: 64, maxWidth: 900, titleSize: 46, align: "center" });
      hero.elementStyles = { image: { width: 80, align: "center", radius: 16 }, subtitle: { color: "#6B5A4A" }, miniBadges: { color: "#6B5A4A", size: 13 } };
      const strip = newSection("benefitStrip", { items: [{ text: "+100 moldes em PDF" }, { text: "Corte na tesoura" }, { text: "Imprima em casa" }, { text: "Licença para vender" }] }, { bg: "#B3141F", color: "#FFFFFF", accent: "#F2B33D", paddingY: 18 });
      const steps = newSection("steps", { title: "Como funciona", subtitle: "Quatro passos simples, do download até a venda.", items: [
        { icon: "1", title: "PASSO 1 · Imprima", text: "Baixe o kit, escolha o molde e imprima em papel A4 na impressora de casa ou na gráfica do bairro." },
        { icon: "2", title: "PASSO 2 · Monte", text: "Corte na tesoura, dobre nas marcações e cole, sem medir e sem desenhar." },
        { icon: "3", title: "PASSO 3 · Divulgue", text: "Fotografe as peças prontas e poste no WhatsApp, Instagram e grupos da cidade." },
        { icon: "4", title: "PASSO 4 · Fature", text: "Receba as encomendas, produza em lote e entregue antes do Natal." },
      ] }, { columns: 4, paddingY: 80, accent: "#B3141F" });
      steps.elementStyles = cards(4);
      const products = newSection("bonusCards", { title: "O que você vai receber", subtitle: "Peças simples de montar, com cara de presente caro. Escolha as que combinam com cada cliente.", items: [
        { image: "", title: "+100 moldes em PDF", text: "Caixinhas, lembrancinhas e embalagens prontas para imprimir.", value: "", badge: "" },
        { image: "", title: "Tags, cartões e adesivos", text: "Artes para personalizar cada presente.", value: "", badge: "BÔNUS" },
        { image: "", title: "Enfeites de árvore", text: "Moldes de enfeites para montar e vender.", value: "", badge: "BÔNUS" },
        { image: "", title: "Tabela de precificação", text: "Calcule o preço de cada peça com segurança.", value: "", badge: "BÔNUS" },
      ] }, { bg: "#FFFDF8", columns: 4, paddingY: 80 });
      products.elementStyles = { ...cards(4), "items.0.badge": { hidden: true }, ...Object.fromEntries([1, 2, 3].map(i => [`items.${i}.badge`, { bg: "#F2B33D", color: "#3A2A00" }])) };
      const chips = newSection("benefitStrip", { items: [{ text: "PDF e PNG em A4" }, { text: "Tesoura ou máquina de corte" }, { text: "Imprima quantas vezes quiser" }, { text: "Licença para vender as peças" }] }, { bg: "#FFFDF8", color: "#2B1B14", accent: "#1F6B3A", paddingY: 24 });
      chips.elementStyles = Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`items.${i}`, { bg: "#FFFFFF", borderColor: "#F0DFC8", borderWidth: 1, radius: 999, paddingTop: 8, paddingBottom: 8, paddingX: 16 }]));
      const guarantee = newSection("guarantee", { days: "7", title: "Imprima, monte e teste. Se não gostar, devolvemos tudo.", text: "Você tem 7 dias para conhecer os moldes. Se achar que não é para você, é só mandar um e-mail e devolvemos 100% do valor, sem perguntas e sem burocracia.", boxBorderColor: "#F2B33D", boxBg: "#FFFFFF", badge: { days: "7", variant: "custom", color: "#B3141F", size: 160, topText: "GARANTIA", bottomText: "DE 7 DIAS" } }, { paddingY: 80, align: "left", titleSize: 28 });
      const faq = newSection("faq", { eyebrow: "DÚVIDAS COMUNS", title: "Antes de você decidir", items: [
        { q: "Preciso ter experiência com artesanato?", a: "Não. Os moldes já vêm com marcações de corte e dobra, é só seguir." },
        { q: "Como recebo os arquivos?", a: "Assim que o pagamento é confirmado, o acesso chega no seu e-mail." },
        { q: "Preciso de máquina de corte?", a: "Não. Tudo pode ser cortado na tesoura. A máquina é opcional." },
        { q: "Que papel e impressora eu uso?", a: "Uma impressora comum e papel A4. Papéis mais grossos deixam as peças mais firmes." },
        { q: "Quanto custa para produzir cada peça?", a: "Depende do papel e da impressão. Use a tabela de precificação para calcular." },
        { q: "Posso vender as lembrancinhas que eu fizer?", a: "Sim. A licença permite vender as peças montadas." },
        { q: "Dá tempo de vender ainda neste Natal?", a: "Sim. O acesso é imediato e as peças são rápidas de montar." },
      ] }, { paddingY: 80, accent: "#B3141F" });
      faq.elementStyles = cards(7);
      const final = newSection("countdown", { eyebrow: "O NATAL TEM DATA MARCADA", title: "Cada dia parado é uma encomenda que vai para outra pessoa", endAt: nextChristmas(), showSeconds: "false", text: "até o Natal. Comece hoje por R$ 19,90.", buttons: [toPlans("QUERO MEU KIT AGORA", true)] }, { bg: "#17492B", color: "#FFFFFF", accent: "#F2B33D", paddingY: 80, align: "center" });
      final.elementStyles = { eyebrow: { bg: "#F2B33D", color: "#3A2A00", radius: 999, paddingTop: 6, paddingBottom: 6, paddingX: 16, width: 40, align: "center" } };
      plans.elementStyles.eyebrow = { bg: "#F2B33D", color: "#3A2A00", radius: 999, paddingTop: 6, paddingBottom: 6, paddingX: 16, width: 30, align: "center" };
      faq.elementStyles.eyebrow = { color: "#B3141F" };
      const footer = newSection("footer", { text: "[SEU PRODUTO] - Moldes de lembrancinhas de Natal. Todos os direitos reservados. Resultados variam de pessoa para pessoa." }, { bg: "#2B1B14", color: "#E9DCCB", paddingY: 28 });
      return [announcement, hero, strip, steps, products, chips, plans, guarantee, faq, final, footer];
    },
  },

];
