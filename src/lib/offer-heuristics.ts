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

export function detectCreativeType(url: string | null | undefined): "image" | "video" {
  if (!url) return "image";
  return /\.(mp4|mov|m3u8|webm)(\?|$)/i.test(url) ? "video" : "image";
}
