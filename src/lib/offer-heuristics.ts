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

// Extrai o primeiro preço em BRL do texto (ex: "R$97", "R$ 19,90", "por apenas R$ 1.997,00").
// Retorna a string normalizada (ex: "R$ 19,90") ou null quando não encontra.
export function extractPrice(text: string): string | null {
  if (!text) return null;
  const m = text.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|R\$\s?\d+(?:,\d{1,2})?/i);
  if (!m) return null;
  return m[0].replace(/R\$\s?/i, "R$ ").trim();
}


// Palavras-chave típicas de anúncios políticos/eleitorais — devem ser excluídos.
const POLITICAL_REGEX =
  /\b(vereador|deputad[oa]s?|prefeit[oa]s?|prefeitura|mandato|reelei[çc][ãa]o|candidat[oa]s?|senador[ea]?|governador[ea]?|c[âa]mara municipal|elei[çc][õo]es?|urnas?)\b/i;

// Apps de drama/novela/short drama que estão poluindo os resultados de infoproduto.
const ENTERTAINMENT_REGEX =
  /\b(dramabox|drama box|short ?drama|webnovel|reelscene|goodshort|dublad[oa]s?|cap[íi]tulos?|novela|reencarna[çc][ãa]o|assista a s[ée]rie|clique para ler mais cap[íi]tulos|drama)\b/i;

export type NoiseKind = "politico" | "entretenimento";

export function detectNoise(text: string): NoiseKind | null {
  if (!text) return null;
  if (POLITICAL_REGEX.test(text)) return "politico";
  if (ENTERTAINMENT_REGEX.test(text)) return "entretenimento";
  return null;
}

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
  if (/\b(curso|aula|aulas|m[óo]dulo|m[óo]dulos|treinamento|forma[çc][ãa]o|masterclass|workshop|mentoria|acompanhamento individual|imers[ãa]o)\b/.test(t)) {
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

