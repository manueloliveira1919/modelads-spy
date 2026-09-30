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

function parseBRLNumber(raw: string): number | null {
  const digits = raw.replace(/R\$\s?/i, "").trim();
  const normalized = digits.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function extractPrice(html: string): string | null {
  // 1) Prioridade máxima: preço junto de sinal explícito de venda ("por apenas
  // R$47", "por só R$29,90", "à vista R$97") — é o preço de venda real, não o
  // riscado/âncora.
  const soldSignal = html.match(
    /(?:por\s+(?:apenas\s+|s[óo]\s+)?|[àa]\s+vista\s+(?:de\s+)?)R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/i,
  );
  if (soldSignal) {
    const priceOnly = soldSignal[0].match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/i);
    if (priceOnly) return priceOnly[0].replace(/R\$\s?/i, "R$ ").trim();
  }

  // 2) Remove preço riscado/âncora (tags <s>, <del>, ou classes comuns de
  // "de/riscado/preço antigo") antes de procurar de forma genérica.
  const cleaned = html
    .replace(/<(s|del)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(
      /<[^>]+class="[^"]*(line-through|riscado|old-price|de-price|strikethrough)[^"]*"[^>]*>[\s\S]*?<\/[a-zA-Z0-9]+>/gi,
      "",
    );

  // 3) Entre os preços restantes, pega o menor plausível — convenção de página
  // de vendas é sempre "menor valor = o que a pessoa realmente paga".
  const matches = [...cleaned.matchAll(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/gi)].map((m) => m[0]);
  if (!matches.length) return null;
  const numeric = matches
    .map((raw) => ({ raw, value: parseBRLNumber(raw) }))
    .filter((x): x is { raw: string; value: number } => x.value !== null && x.value > 0);
  if (!numeric.length) return null;
  numeric.sort((a, b) => a.value - b.value);
  return numeric[0].raw.replace(/R\$\s?/i, "R$ ").trim();
}

export function analyzeLandingHtml(finalUrl: string, html: string): LandingAnalysis {
  const isWhatsapp = WHATSAPP_SIGNS.test(finalUrl);
  if (isWhatsapp) {
    return { price: null, structure: "WhatsApp", destination: "whatsapp", validated: true };
  }
  const price = extractPrice(html);
  const hasCheckoutDomain = CHECKOUT_DOMAINS.test(finalUrl) || CHECKOUT_DOMAINS.test(html);
  const hasBuySignal = BUY_SIGNS.test(html);
  let structure: LandingAnalysis["structure"] = "Página de Vendas";
  if (QUIZ_SIGNS.test(html)) structure = "Quiz";
  else if (VSL_SIGNS.test(html)) structure = "VSL";
  const validated = !!(price || hasCheckoutDomain || hasBuySignal);
  const destination = hasCheckoutDomain ? "checkout_conhecido" : "pagina_generica";
  return { price, structure, destination, validated };
}
