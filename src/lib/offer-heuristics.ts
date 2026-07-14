// Heurística leve para inferir a "estrutura" da oferta a partir do texto do anúncio.
// A Meta Ad Library não retorna esse campo, então classificamos por palavras-chave.
export function inferStructure(text: string): "VSL" | "Página de Vendas" | "Quiz" | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\b(quiz|responda|faça o teste|descubra em|em 60 ?segundos|em 2 ?min)\b/.test(t)) {
    return "Quiz";
  }
  if (/\b(assista|assist[ai]|até o final|vsl|v[ií]deo (grátis|revelador|completo)|aperte no v[ií]deo)\b/.test(t)) {
    return "VSL";
  }
  return "Página de Vendas";
}

export function classifyStatus(activeAds: number): "testando" | "crescendo" | "escaladissima" {
  if (activeAds >= 10) return "escaladissima";
  if (activeAds >= 4) return "crescendo";
  return "testando";
}

// Detecta se o anúncio é um funil de WhatsApp — por texto ou pelo link de destino.
export function isWhatsappFunnel(text: string, linkUrl?: string | null): boolean {
  const haystack = `${text || ""} ${linkUrl || ""}`.toLowerCase();
  return /(wa\.me|whats\.link|api\.whatsapp\.com|chamar no whats|fale no whats|clique e fale no whats|chame no whats|no whatsapp)/.test(
    haystack,
  );
}


export function detectCreativeType(url: string | null | undefined): "image" | "video" {
  if (!url) return "image";
  return /\.(mp4|mov|m3u8|webm)(\?|$)/i.test(url) ? "video" : "image";
}

export type ProductType =
  | "Low Ticket"
  | "Ebook/PDF"
  | "Curso Online"
  | "Mentoria"
  | "Produto Físico";

export const PRODUCT_TYPES: ProductType[] = [
  "Low Ticket",
  "Ebook/PDF",
  "Curso Online",
  "Mentoria",
  "Produto Físico",
];

// Classifica o tipo de produto a partir do texto do anúncio.
// A Meta Ad Library não retorna esse dado, então usamos heurística por palavras-chave.
export function inferProductType(text: string): ProductType {
  const t = (text || "").toLowerCase();
  if (/\b(mentoria|acompanhamento individual|consultoria 1[- ]?a[- ]?1|imers[ãa]o)\b/.test(t)) {
    return "Mentoria";
  }
  if (/\b(curso|aula|aulas|m[óo]dulo|m[óo]dulos|treinamento|forma[çc][ãa]o|masterclass|workshop)\b/.test(t)) {
    return "Curso Online";
  }
  if (/\b(e[- ]?book|ebook|pdf|apostila|guia (em )?pdf|livro digital)\b/.test(t)) {
    return "Ebook/PDF";
  }
  if (/\b(frete|entrega|envio|kit|unidade|frasco|c[áa]psulas?|garrafas?|produto f[íi]sico|receba em casa)\b/.test(t)) {
    return "Produto Físico";
  }
  return "Low Ticket";
}

