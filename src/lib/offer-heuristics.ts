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

// Remove access_token e outros parâmetros sensíveis do snapshot URL da Meta Ad Library.
// A API pública devolve ad_snapshot_url com um access_token curto atrelado à app; nunca
// deve ser persistido nem exposto ao client.
export function stripSnapshotSecrets(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    for (const key of ["access_token", "app_secret_proof", "appsecret_proof", "__token__"]) {
      u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    // Fallback regex se URL parsing falhar
    return url.replace(/([?&])(access_token|app_secret_proof|appsecret_proof|__token__)=[^&]*/gi, "$1").replace(/[?&]$/, "");
  }
}

export type OfferStatusValue = "testando" | "escalado" | "escaladissimo";

// Critérios com os dois requisitos ao mesmo tempo (AND):
//   Escaladíssimo: 30+ dias E 30+ anúncios ativos
//   Escalado:      20+ dias E 20+ anúncios
//   Testando:      5+ dias  E 10+ anúncios
// Abaixo do mínimo a oferta continua salva, mas entra como inativa.
export function classifyStatus(activeDays: number, activeAds = 1): OfferStatusValue {
  const days = Number.isFinite(activeDays) ? Math.max(0, Math.floor(activeDays)) : 0;
  const ads = Number.isFinite(activeAds) ? Math.max(0, Math.floor(activeAds)) : 0;
  if (days >= 30 && ads >= 30) return "escaladissimo";
  if (days >= 20 && ads >= 20) return "escalado";
  return "testando";
}

// Corte de visibilidade: abaixo disso a oferta não aparece no dashboard.
export function meetsMinimumScale(activeDays: number, activeAds = 1): boolean {
  const days = Number.isFinite(activeDays) ? Math.max(0, Math.floor(activeDays)) : 0;
  const ads = Number.isFinite(activeAds) ? Math.max(0, Math.floor(activeAds)) : 0;
  return days >= 5 && ads >= 10;
}

// Detecta se o anúncio é um funil de WhatsApp — por texto ou pelo link de destino.
export function isWhatsappFunnel(text: string, linkUrl?: string | null): boolean {
  const haystack = `${text || ""} ${linkUrl || ""}`.toLowerCase();
  return /(wa\.me|whats\.link|api\.whatsapp\.com|chamar no whats|fale no whats|clique e fale no whats|chame no whats|no whatsapp)/.test(
    haystack,
  );
}

// Extrai o primeiro preço em BRL do texto (ex: "R$97", "R$ 19,90", "por apenas R$ 1.997,00").
// Retorna a string normalizada (ex: "R$ 19,90") ou null quando não encontra.
export function extractPrice(text: string): string | null {
  if (!text) return null;
  const m = text.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|R\$\s?\d+(?:,\d{1,2})?/i);
  if (!m) return null;
  return m[0].replace(/R\$\s?/i, "R$ ").trim();
}


// Blacklist agora vive 100% na tabela `blacklist_words` — nada fixo aqui.
// Ver `src/lib/mining-config.server.ts` (`loadActiveBlacklist` / `buildBlacklistMatcher`).


export function detectCreativeType(url: string | null | undefined): "image" | "video" {
  if (!url) return "image";
  return /\.(mp4|mov|m3u8|webm)(\?|$)/i.test(url) ? "video" : "image";
}

export type ProductType =
  | "Low Ticket"
  | "Ebook/PDF"
  | "Curso Online"
  | "Produto Físico";

export const PRODUCT_TYPES: ProductType[] = [
  "Low Ticket",
  "Ebook/PDF",
  "Curso Online",
  "Produto Físico",
];

// Classifica o tipo de produto a partir do texto do anúncio.
// A Meta Ad Library não retorna esse dado, então usamos heurística por palavras-chave.
// "Mentoria" foi removido daqui — segue disponível como Categoria.
export function inferProductType(text: string): ProductType {
  const t = (text || "").toLowerCase();
  // Físico primeiro: "suplemento com acompanhamento" é produto, não curso.
  if (
    /\b(frete|entrega|envio|kit|unidade|frasco|garrafas?|produto f[íi]sico|receba em casa|encapsulados?|c[áa]psulas?|suplementos?|ch[áa]|chas|f[óo]rmula natural|gotas|extrato|comprimidos?)\b/.test(
      t,
    )
  ) {
    return "Produto Físico";
  }
  if (
    /\b(e[- ]?book|ebook|pdf|apostila|guia (em )?pdf|livro digital|receitas?|card[áa]pio|protocolo|plano alimentar)\b/.test(
      t,
    )
  ) {
    return "Ebook/PDF";
  }
  if (/\b(curso|aula|aulas|m[óo]dulo|m[óo]dulos|treinamento|forma[çc][ãa]o|masterclass|workshop|mentoria|acompanhamento individual|imers[ãa]o)\b/.test(t)) {
    return "Curso Online";
  }
  return "Low Ticket";
}

