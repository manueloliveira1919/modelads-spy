// Análise da página de destino real de cada oferta (não só o texto do anúncio).
// Imita ferramentas de referência (tipo Fusion Ads): visita o link de verdade
// para pegar preço e confirmar que é uma oferta válida.
//
// Função pura — sem fetch, sem banco. O fetch da página fica no worker
// (refresh-worker.ts), que reaproveita o padrão de fetchSnapshotOnce.

export interface LandingAnalysis {
  price: string | null;
  structure: "VSL" | "Quiz" | "Página de Vendas" | "WhatsApp" | null;
  destination: "whatsapp" | "checkout_conhecido" | "pagina_generica" | null;
  validated: boolean;
}

const CHECKOUT_DOMAINS = /(hotmart\.com|kiwify\.com|monetizze\.com|eduzz\.com|perfectpay|braip\.com|kirvano\.com|cartpanda\.com|greenn\.com|systeme\.io|ticto\.app|pepper\.com|doppus)/i;
const VSL_SIGNS = /(vturb|converteai|player-cloudfront|pandavideo|panda ?video|youtube\.com\/embed|player\.vimeo|wistia)/i;
const QUIZ_SIGNS = /(typeform|outgrow|involve\.me|quizell|leadquizzes|quiz-container|data-quiz)/i;
const WHATSAPP_SIGNS = /(wa\.me\/|api\.whatsapp\.com)/i;
const BUY_SIGNS = /(comprar agora|adicionar ao carrinho|finalizar compra|garantir minha vaga|quero garantir|inscreva-se agora|r\$\s?\d)/i;

function priceToNumber(raw: string): number {
  const digits = raw.replace(/R\$\s?/i, "").trim();
  const normalized = digits.includes(",")
    ? digits.replace(/\./g, "").replace(",", ".")
    : digits.replace(/\./g, "");
  return parseFloat(normalized) || Infinity;
}

function pickSmallest(prices: string[]): string {
  return prices.reduce((best, cur) => (priceToNumber(cur) < priceToNumber(best) ? cur : best));
}

function normalizePrice(raw: string): string {
  return raw.replace(/R\$\s?/i, "R$ ").trim();
}

function extractBestPrice(html: string): string | null {
  // Remove tags de preço riscado/anterior antes de procurar, pra não pegar
  // o valor "de" errado (ex: <del>R$197</del>, <s>R$197</s>, classes de "riscado").
  const cleaned = html.replace(
    /<(del|s)\b[^>]*>[\s\S]*?<\/\1>|<[^>]+class="[^"]*(?:line-through|riscado|old-price|de-price)[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/gi,
    " ",
  );

  const priceRe = /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|R\$\s?\d+(?:,\d{1,2})?/gi;

  // 1ª prioridade: preço logo depois de "por"/"apenas"/"só"/"somente"/"à vista" —
  // é o padrão clássico brasileiro de preço de venda real ("De R$197 por R$47").
  const sellSignalRe = /(?:por|apenas|só|somente|à vista)\s*[:\-]?\s*(R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|R\$\s?\d+(?:,\d{1,2})?)/gi;
  const sellMatches = [...cleaned.matchAll(sellSignalRe)].map((m) => m[1]);
  if (sellMatches.length) {
    return normalizePrice(pickSmallest(sellMatches));
  }

  // 2ª prioridade: sem sinal de venda claro, pega o MENOR valor da página —
  // preço riscado/total anual tende a ser o maior número, não o menor.
  const allMatches = [...cleaned.matchAll(priceRe)].map((m) => m[0]);
  if (allMatches.length) {
    return normalizePrice(pickSmallest(allMatches));
  }
  return null;
}

export function analyzeLandingHtml(finalUrl: string, html: string): LandingAnalysis {
  const isWhatsapp = WHATSAPP_SIGNS.test(finalUrl);
  if (isWhatsapp) {
    return { price: null, structure: "WhatsApp", destination: "whatsapp", validated: true };
  }
  const price = extractBestPrice(html);
  const hasCheckoutDomain = CHECKOUT_DOMAINS.test(finalUrl) || CHECKOUT_DOMAINS.test(html);
  const hasBuySignal = BUY_SIGNS.test(html);
  let structure: LandingAnalysis["structure"] = "Página de Vendas";
  if (QUIZ_SIGNS.test(html)) structure = "Quiz";
  else if (VSL_SIGNS.test(html)) structure = "VSL";
  const validated = !!(price || hasCheckoutDomain || hasBuySignal);
  const destination = hasCheckoutDomain ? "checkout_conhecido" : "pagina_generica";
  return { price, structure, destination, validated };
}
