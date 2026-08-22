import { describe, expect, it } from "vitest";
import {
  classifyOfferQuality,
  type OfferQualityInput,
} from "./offer-commercial-quality";

function base(partial: Partial<OfferQualityInput>): OfferQualityInput {
  return {
    pageName: null,
    productTitle: null,
    landingKey: null,
    category: null,
    language: "PT",
    adsCount: 10,
    activeDays: 7,
    ads: [],
    ...partial,
  };
}

describe("classifyOfferQuality", () => {
  it("1. oferta comercial clara => commercial", () => {
    const r = classifyOfferQuality(
      base({
        pageName: "Crochê Lucrativo",
        productTitle: "Curso de Crochê Lucrativo com 200 gráficos",
        landingKey: "crochelucrativo.com.br/curso",
        ads: [
          {
            headline: "Aprenda crochê do zero e venda suas peças",
            description: "Método passo a passo com suporte. Garanta sua vaga.",
            linkUrl: "https://crochelucrativo.com.br/curso?utm_source=fb",
          },
        ],
      }),
    );
    expect(r.quality).toBe("commercial");
    expect(r.reasons).toEqual([]);
  });

  it("2. entretenimento claro (domínio + promo de app) => entertainment", () => {
    const r = classifyOfferQuality(
      base({
        pageName: "ReelShort Brasil",
        productTitle: "Assista a todos os dramas curtos gratuitamente",
        landingKey: "reelshort.com/pt",
        ads: [
          {
            headline: "Assista a todos os episódios grátis no app",
            description: "Baixe o app e assista dramas curtos gratuitamente.",
            linkUrl: "https://www.reelshort.com/pt/episode/123",
          },
        ],
      }),
    );
    expect(r.quality).toBe("entertainment");
    expect(r.reasons.some((x) => x.startsWith("dominio_entretenimento:"))).toBe(true);
    expect(r.reasons).toContain("promo_app_assistir");
  });

  it("3. ambíguo (1 sinal forte) => suspicious", () => {
    const r = classifyOfferQuality(
      base({
        pageName: "Portal VIP",
        productTitle: "Série completa disponível para membros",
        landingKey: "portalvip.com.br/membros",
        ads: [
          {
            headline: "Série completa disponível",
            description: "Acesse agora a área de membros.",
            linkUrl: "https://portalvip.com.br/membros",
          },
        ],
      }),
    );
    expect(r.quality).toBe("suspicious");
    expect(r.reasons.some((x) => x.startsWith("frase:"))).toBe(true);
  });

  it("4. produto comercial com palavra compartilhada ('filme') => não vira entertainment", () => {
    const r = classifyOfferQuality(
      base({
        pageName: "Academia de Roteiro",
        productTitle: "Curso de Roteiro: escreva seu filme do zero",
        landingKey: "academiaderoteiro.com.br/curso",
        ads: [
          {
            headline: "Aprenda a escrever o roteiro do seu filme",
            description: "Curso online com certificado e mentorias ao vivo.",
            linkUrl: "https://academiaderoteiro.com.br/curso",
          },
        ],
      }),
    );
    expect(r.quality).toBe("commercial");
  });

  it("5. página com vários produtos: cada oferta classificada isoladamente", () => {
    const ofertaEntretenimento = classifyOfferQuality(
      base({
        pageName: "Multi Ofertas",
        productTitle: "Novelas completas dubladas (Dublado)",
        landingKey: "multiofertas.com/novelas",
        ads: [
          {
            headline: "Assista novelas completas (Dublado)",
            description: "Todos os capítulos.",
            linkUrl: "https://multiofertas.com/novelas",
          },
        ],
      }),
    );
    const ofertaComercial = classifyOfferQuality(
      base({
        pageName: "Multi Ofertas",
        productTitle: "Guia de Finanças Pessoais",
        landingKey: "multiofertas.com/financas",
        ads: [
          {
            headline: "Organize suas finanças em 30 dias",
            description: "Planilha + aulas gravadas.",
            linkUrl: "https://multiofertas.com/financas",
          },
        ],
      }),
    );
    expect(ofertaEntretenimento.quality).toBe("entertainment");
    expect(ofertaComercial.quality).toBe("commercial");
  });

  it("6. oferta com vários anúncios: sinais agregados (2+ fortes) => entertainment", () => {
    const ads = Array.from({ length: 8 }, (_, i) => ({
      headline: `Oferta especial ${i + 1} do curso de culinária`,
      description: "Vagas limitadas, comece agora.",
      linkUrl: "https://culinariaexpert.com.br/curso",
    }));
    ads[2] = {
      headline: "Traída pelo marido, ela deu o troco e virou CEO",
      description: "Leia a história completa.",
      linkUrl: "https://culinariaexpert.com.br/curso",
    };
    ads[5] = {
      headline: "Todos os episódios liberados hoje",
      description: "Veja agora.",
      linkUrl: "https://culinariaexpert.com.br/curso",
    };
    const r = classifyOfferQuality(
      base({
        pageName: "Culinária Expert",
        productTitle: "Curso de Culinária Expert",
        landingKey: "culinariaexpert.com.br/curso",
        adsCount: 10,
        ads,
      }),
    );
    expect(r.quality).toBe("entertainment");
    expect(r.reasons).toContain("gancho_dramatico");
    expect(r.reasons.some((x) => x.startsWith("frase:"))).toBe(true);
  });

  it("bônus: sem evidência => não analisada (null)", () => {
    const r = classifyOfferQuality(base({ ads: [] }));
    expect(r.quality).toBeNull();
    expect(r.reasons).toEqual(["sem_evidencias"]);
  });
});
